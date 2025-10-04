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
    
    // Send initial stats
    ws.send(JSON.stringify({
      type: 'stats',
      activeUsers: Object.keys(currentlyonpage).length,
      multiplier: getMultiplier(),
      baseCoins: newsettings.api.afk.coins,
      interval: newsettings.api.afk.every
    }));

    // Broadcast stats update to all clients
    const broadcastStats = () => {
      const stats = {
        type: 'stats',
        activeUsers: Object.keys(currentlyonpage).length,
        multiplier: getMultiplier(),
        baseCoins: newsettings.api.afk.coins,
        interval: newsettings.api.afk.every
      };
      // Note: In production, you'd want to track all ws connections to broadcast properly
      // For now, we'll send on coin award
      return stats;
    };

    let coinloop = setInterval(
      async function() {
        const multiplier = getMultiplier();
        const coinsToAdd = Math.floor(newsettings.api.afk.coins * multiplier * 100) / 100;
        
        let usercoins = await db.get("coins-" + req.session.userinfo.id);
        usercoins = usercoins ? usercoins : 0;
        usercoins = usercoins + coinsToAdd;
        await db.set("coins-" + req.session.userinfo.id, usercoins);
        
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

    ws.onclose = async() => {
      clearInterval(coinloop);
      delete currentlyonpage[req.session.userinfo.id];
    }
  });
};

