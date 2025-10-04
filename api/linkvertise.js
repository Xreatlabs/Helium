/**
 * Linkvertise integration - Refactored with one-time tokens
 * Rewards coins when a user completes a Linkvertise link and lands on our callback.
 * @module linkvertise
 */

const fs = require('fs');
const ejs = require('ejs');
const arciotext = require('../misc/afk');
const { onCoinsAdded } = require('../lib/integrations');
const LinkvertiseClient = require('../lib/linkvertise-client');
const LinkvertiseService = require('../lib/linkvertise-service');

// Initialize services
let linkvertiseClient = null;
let linkvertiseService = null;

try {
  const settings = JSON.parse(fs.readFileSync('./settings.json'));
  const userId = settings.api?.client?.linkvertise?.userId || null;
  const baseUrl = settings.api?.client?.linkvertise?.baseUrl || "https://link-to.net";
  
  if (userId) {
    linkvertiseClient = new LinkvertiseClient({ 
      user_id: userId,
      base_url: baseUrl
    });
  }
} catch (error) {
  console.error('Error initializing Linkvertise Client:', error.message);
}

module.exports.load = function(app, db) {
  // Initialize Linkvertise service
  linkvertiseService = new LinkvertiseService(db);

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
   * GET /api/user/earn/l4r/linkvertise/start
   * Start a new Linkvertise session - generates one-time token and redirects to Linkvertise
   */
  app.get('/api/user/earn/l4r/linkvertise/start', async (req, res) => {
    if (!req.session || !req.session.userinfo) return res.redirect('/login?redirect=linkvertise');
    
    const settings = JSON.parse(fs.readFileSync('./settings.json'));
    const cfg = (settings.api && settings.api.client && settings.api.client.linkvertise) || {};

    if (!cfg.enabled) {
      return res.redirect('/linkvertise?error=linkvertise_not_enabled');
    }

    if (!linkvertiseClient) {
      return res.redirect('/linkvertise?error=linkvertise_not_configured');
    }

    const userId = req.session.userinfo.id;
    const cooldownSeconds = parseInt(cfg.cooldownTime || 3600);

    const cooldownKey = `linkvertise-cooldown-${userId}`;
    const lastClick = await db.get(cooldownKey);
    const now = Date.now();

    if (lastClick && now - lastClick < cooldownSeconds * 1000) {
      const remainingSeconds = Math.ceil((cooldownSeconds * 1000 - (now - lastClick)) / 1000);
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Please Wait</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              background-color: #111827;
              height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: system-ui, -apple-system, sans-serif;
            }
            .container {
              text-align: center;
            }
            h1 {
              color: #ffffff;
              font-size: 1.875rem;
              font-weight: bold;
              margin-bottom: 1.5rem;
            }
            p {
              color: #9CA3AF;
              margin-bottom: 2rem;
            }
            .button {
              background-color: #6B7280;
              color: #ffffff;
              padding: 0.75rem 1.5rem;
              border-radius: 0.5rem;
              text-decoration: none;
              font-weight: bold;
              transition: background-color 0.2s;
              display: inline-block;
            }
            .button:hover {
              background-color: #4B5563;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Please Wait</h1>
            <p>You need to wait ${remainingSeconds} seconds before creating another link</p>
            <a href="/linkvertise" class="button">Go back</a>
          </div>
        </body>
        </html>
      `);
    }

    const token = await linkvertiseService.createCallbackToken(userId);
    if (!token) {
      return res.redirect('/linkvertise?err=failed_to_create_token');
    }

    console.log(`[Linkvertise] Token created for user ${userId}: ${token}`);
    await db.set(cooldownKey, now);

    const domain = cfg.domain || settings.oauth2?.link || 'http://localhost:3000';
    const callbackUrl = linkvertiseClient.generateCallbackUrl(domain, userId, token);
    const linkvertiseUrl = linkvertiseClient.linkvertise(cfg.userId, callbackUrl);

    console.log('[Linkvertise] Generated callback URL:', callbackUrl);
    console.log('[Linkvertise] Generated link-to.net URL:', linkvertiseUrl);

    res.redirect(linkvertiseUrl);
  });



  /**
   * GET /linkvertise/callback
   * One-time token callback endpoint - validates token, rewards coins, redirects to dashboard
   */
  app.get('/linkvertise/callback', async (req, res) => {
    const settings = JSON.parse(fs.readFileSync('./settings.json'));
    const cfg = (settings.api && settings.api.client && settings.api.client.linkvertise) || {};

    if (cfg.enabled !== true) {
      return res.redirect('/dashboard?err=LINKVERTISE_DISABLED');
    }

    const token = req.query.token;
    const userIdFromQuery = req.query.user_id;

    console.log(`[Linkvertise] Callback received - Token: ${token}, User ID: ${userIdFromQuery}`);

    if (!token || !userIdFromQuery) {
      return res.redirect('/dashboard?err=LINKVERTISE_INVALID_PARAMS');
    }

    if (!req.session || !req.session.userinfo) {
      return res.redirect(`/login?redirect=/linkvertise/callback?token=${token}&user_id=${userIdFromQuery}`);
    }

    const sessionUserId = req.session.userinfo.id;
    
    if (sessionUserId !== userIdFromQuery) {
      console.log(`[Linkvertise] User ID mismatch - Session: ${sessionUserId}, Query: ${userIdFromQuery}`);
      return res.redirect('/dashboard?err=LINKVERTISE_USER_MISMATCH');
    }

    console.log(`[Linkvertise] Validating token for user ${sessionUserId}`);
    const validation = await linkvertiseService.validateAndConsumeToken(token, userIdFromQuery);

    if (!validation.valid) {
      console.log(`[Linkvertise] Token validation failed for user ${sessionUserId}: ${validation.reason}`);
      return res.redirect(`/dashboard?err=LINKVERTISE_TOKEN_INVALID`);
    }

    const reward = Number(cfg.rewardCoins || 10);
    const currentCoins = (await db.get(`coins-${sessionUserId}`)) || 0;
    const updatedCoins = currentCoins + reward;
    await db.set(`coins-${sessionUserId}`, updatedCoins);

    const username = `${req.session.userinfo.username}#${req.session.userinfo.discriminator}`;
    
    try {
      await onCoinsAdded(sessionUserId, username, reward);
      console.log(`[Linkvertise] Successfully rewarded ${reward} coins to user ${username} (ID: ${sessionUserId})`);
    } catch (error) {
      console.error('[Linkvertise] Error in onCoinsAdded webhook:', error);
    }

    return res.redirect(`/dashboard?err=LINKVERTISE_SUCCESS&coins=${reward}`);
  });
};
