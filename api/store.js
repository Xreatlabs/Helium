const indexjs = require("../app.js");
const adminjs = require("./admin.js");
const settings = require("../settings.json");
const fs = require("fs");
const ejs = require("ejs");
const log = require("../misc/log");

module.exports.load = async function (app, db) {
  app.get("/buy", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");

    let newsettings = await enabledCheck(req, res);
    if (!newsettings) return;

    const { type, amount } = req.query;
    if (!type || !amount) return res.send("Missing type or amount");

    const validTypes = ["ram", "disk", "cpu", "servers"];
    if (!validTypes.includes(type)) return res.send("Invalid type");

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 1 || parsedAmount > 10)
      return res.send("Amount must be a number between 1 and 10");

    const theme = indexjs.get(req);
    const failedCallbackPath =
      theme.settings.redirect[`failedpurchase${type}`] || "/";

    const userCoins = (await db.get(`coins-${req.session.userinfo.id}`)) || 0;
    const resourceCap =
      (await db.get(`${type}-${req.session.userinfo.id}`)) || 0;

    const { per, cost } = newsettings.api.client.coins.store[type];
    const purchaseCost = cost * parsedAmount;

    if (userCoins < purchaseCost)
      return res.redirect(`${failedCallbackPath}?err=CANNOTAFFORD`);

    // Check maximum resource limits from package configuration
    const userPackage = (await db.get(`package-${req.session.userinfo.id}`)) || newsettings.api.client.packages.default;
    const packageConfig = newsettings.api.client.packages.list[userPackage];
    
    if (packageConfig && packageConfig.max && packageConfig.max[type]) {
      const maxResource = packageConfig.max[type];
      const extraResources = (await db.get(`extra-${req.session.userinfo.id}`)) || {
        ram: 0,
        disk: 0,
        cpu: 0,
        servers: 0,
      };
      
      // Calculate total resources (package base + extra purchased)
      const currentTotal = (packageConfig[type] || 0) + (extraResources[type] || 0);
      const extraResourceAmount = per * parsedAmount;
      const newTotal = currentTotal + extraResourceAmount;
      
      // If max is set (not 0) and would be exceeded, block the purchase
      if (maxResource > 0 && newTotal > maxResource) {
        return res.redirect(`${failedCallbackPath}?err=MAXRESOURCES&max=${maxResource}&current=${currentTotal}`);
      }
    }

    const newUserCoins = userCoins - purchaseCost;
    const newResourceCap = resourceCap + parsedAmount;
    const extraResource = per * parsedAmount;

    if (newUserCoins === 0) {
      await db.delete(`coins-${req.session.userinfo.id}`);
      await db.set(`${type}-${req.session.userinfo.id}`, newResourceCap);
    } else {
      await db.set(`coins-${req.session.userinfo.id}`, newUserCoins);
      await db.set(`${type}-${req.session.userinfo.id}`, newResourceCap);
    }

    let extra = (await db.get(`extra-${req.session.userinfo.id}`)) || {
      ram: 0,
      disk: 0,
      cpu: 0,
      servers: 0,
    };

    extra[type] += extraResource;

    if (Object.values(extra).every((v) => v === 0)) {
      await db.delete(`extra-${req.session.userinfo.id}`);
    } else {
      await db.set(`extra-${req.session.userinfo.id}`, extra);
    }

    adminjs.suspend(req.session.userinfo.id);

    log(
      `resources purchased`,
      `${req.session.userinfo.username}#${req.session.userinfo.discriminator} bought ${extraResource} ${type} from the store for \`${purchaseCost}\` coins.`
    );

    // Trigger webhook events
    const { onCoinsSpent, onResourcePurchased } = require('../lib/integrations');
    onCoinsSpent(
      req.session.userinfo.id,
      req.session.userinfo.username,
      purchaseCost,
      `${type} resources`
    ).catch(err => console.error('Webhook error:', err));
    
    onResourcePurchased(
      req.session.userinfo.id,
      req.session.userinfo.username,
      type,
      extraResource
    ).catch(err => console.error('Webhook error:', err));

    res.redirect(
      (theme.settings.redirect[`purchase${type}`]
        ? theme.settings.redirect[`purchase${type}`]
        : "/") + "?err=none"
    );
  });

  async function enabledCheck(req, res) {
    const newsettings = JSON.parse(
      fs.readFileSync("./settings.json").toString()
    );
    if (newsettings.api.client.coins.store.enabled) return newsettings;

    const theme = indexjs.get(req);
    ejs.renderFile(
      `./views/${theme.settings.notfound}`,
      await eval(indexjs.renderdataeval),
      null,
      function (err, str) {
        delete req.session.newaccount;
        if (err) {
          console.log(
            `App ― An error has occurred on path ${req._parsedUrl.pathname}:`
          );
          console.log(err);
          return res.send(
            "An error has occurred while attempting to load this page. Please contact an administrator to fix this."
          );
        }
        res.status(200);
        res.send(str);
      }
    );
    return null;
  }
};
