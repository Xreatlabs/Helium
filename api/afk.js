/**
 * |-| [- |_ | /\ ( ~|~ `/ |_
 *
 * Helium 1.0.0 ― Cascade Ridge
 *
 * This is for the AFK websocket. It gives the user coins every x seconds.
 * @module afk
*/

const settings = require("../settings.json");
const indexjs = require("../app.js");
const ejs = require("ejs");
const chalk = require("chalk");

let currentlyonpage = {};

// Calculate multiplier based on active users
function getMultiplier() {
  const userCount = Object.keys(currentlyonpage).length;
  if (userCount <= 5) return 1.0;
  if (userCount <= 10) return 1.25;
  if (userCount <= 20) return 1.5;
  if (userCount <= 50) return 2.0;
  return 2.5;
}

module.exports.load = async function(app, db) {
  app.ws("/" + settings.api.afk.path, async (ws, req) => {
    let newsettings = JSON.parse(require("fs").readFileSync("./settings.json"));
    if (!req.session.pterodactyl) return ws.close();
    if (currentlyonpage[req.session.userinfo.id]) return ws.close();

    currentlyonpage[req.session.userinfo.id] = true;
    
    // Track when next coin will be awarded
    const connectionTime = Date.now();
    let nextCoinTime = connectionTime + (newsettings.api.afk.every * 1000);
    
    // Send initial stats with exact remaining time
    const sendStats = () => {
      if (ws.readyState === 1) {
        const now = Date.now();
        const remainingSeconds = Math.ceil((nextCoinTime - now) / 1000);
        
        ws.send(JSON.stringify({
          type: 'stats',
          activeUsers: Object.keys(currentlyonpage).length,
          multiplier: getMultiplier(),
          baseCoins: newsettings.api.afk.coins,
          interval: newsettings.api.afk.every,
          remainingSeconds: Math.max(0, remainingSeconds)
        }));
      }
    };
    
    sendStats();

    // Send stats updates every 5 seconds to keep clients in sync with exact countdown
    let statsLoop = setInterval(sendStats, 5000);

    // Coin earning loop
    let coinloop = setInterval(
      async function() {
        if (ws.readyState !== 1) return;
        
        const multiplier = getMultiplier();
        const coinsToAdd = Math.floor(newsettings.api.afk.coins * multiplier * 100) / 100;
        
        let usercoins = await db.get("coins-" + req.session.userinfo.id);
        usercoins = usercoins ? usercoins : 0;
        usercoins = usercoins + coinsToAdd;
        await db.set("coins-" + req.session.userinfo.id, usercoins);
        
        // Trigger webhook event for coins added
        const { onCoinsAdded } = require('../lib/integrations');
        onCoinsAdded(
          req.session.userinfo.id,
          req.session.userinfo.username,
          coinsToAdd
        ).catch(err => console.error('Webhook error:', err));
        
        // Update next coin time
        nextCoinTime = Date.now() + (newsettings.api.afk.every * 1000);
        
        // Send coin update with current stats
        ws.send(JSON.stringify({
          type: 'coins',
          earned: coinsToAdd,
          total: usercoins,
          multiplier: multiplier,
          activeUsers: Object.keys(currentlyonpage).length
        }));
      }, newsettings.api.afk.every * 1000
    );

    // Heartbeat to keep connection alive
    let heartbeat = setInterval(() => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 30000);

    ws.on('message', (msg) => {
      try {
        const data = JSON.parse(msg);
        if (data.type === 'pong') {
          // Client is alive
        }
      } catch (e) {
        // Ignore parse errors
      }
    });

    ws.onclose = async() => {
      clearInterval(coinloop);
      clearInterval(statsLoop);
      clearInterval(heartbeat);
      delete currentlyonpage[req.session.userinfo.id];
    };
  });
};

