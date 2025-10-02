/**
 * Linkvertise integration
 * Rewards coins when a user completes a Linkvertise link and lands on our callback.
 * @module linkvertise
 */

const fs = require('fs');
const ejs = require('ejs');
const { onCoinsAdded } = require('../lib/integrations');

module.exports.load = function(app, db) {
  /**
   * GET /linkvertise
   * Landing page that lists configured Linkvertise links.
   */
  app.get('/linkvertise', async (req, res) => {
    if (!req.session || !req.session.userinfo) return res.redirect('/login?redirect=linkvertise');
    const settings = JSON.parse(fs.readFileSync('./settings.json'));
    const indexjs = require('../app.js');
    let theme = indexjs.get(req);
    const data = await eval(indexjs.renderdataeval);
    data.linkvertise = settings.api.client.linkvertise || { enabled: false, links: [] };
    ejs.renderFile(
      `./views/${
        theme.settings.pages['linkvertise']
          ? theme.settings.pages['linkvertise']
          : theme.settings.notfound
      }`,
      data,
      null,
      function (err, str) {
        if (err) {
          console.log(err);
          return res.render('500.ejs', { err });
        }
        res.status(200);
        res.send(str);
      }
    );
  });

  /**
   * GET /linkvertise/callback
   * Callback after Linkvertise completion. Grants coins to the logged-in user.
   * Optional query: id (must match configured links when requireKnownLink is true)
   */
  app.get('/linkvertise/callback', async (req, res) => {
    const settings = JSON.parse(fs.readFileSync('./settings.json'));
    const cfg = (settings.api && settings.api.client && settings.api.client.linkvertise) || {};

    // Require login
    if (!req.session || !req.session.userinfo) return res.redirect('/login?redirect=linkvertise');

    // Feature flag
    if (cfg.enabled !== true) return res.redirect('/linkvertise?err=DISABLED');

    // Basic anti-abuse: only accept known links when enabled
    const linkId = (req.query.id || '').toString();
    if (cfg.requireKnownLink === true) {
      const known = Array.isArray(cfg.links) && cfg.links.some(l => l.id === linkId);
      if (!known) return res.redirect('/linkvertise?err=INVALID_LINK');
    }

    const userId = req.session.userinfo.id;
    const username = `${req.session.userinfo.username}#${req.session.userinfo.discriminator}`;
    const reward = Number(cfg.rewardCoins || 10);

    // Use a simple cooldown to mitigate repeated triggers: 10 minutes per link/user
    const cooldownKey = `lv-cooldown-${userId}-${linkId || 'any'}`;
    const last = await db.get(cooldownKey);
    const now = Date.now();
    if (last && now - last < 10 * 60 * 1000) {
      return res.redirect('/linkvertise?err=COOLDOWN');
    }

    const current = (await db.get(`coins-${userId}`)) || 0;
    const updated = current + reward;
    await db.set(`coins-${userId}`, updated);

    // Set cooldown
    await db.set(cooldownKey, now);

    // Fire webhook event
    try { await onCoinsAdded(userId, username, reward); } catch (_) {}

    return res.redirect('/linkvertise?err=none');
  });
}
