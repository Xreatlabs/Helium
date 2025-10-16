/**
 * Linkvertise & RewardsAds integration - Refactored with one-time tokens
 * Rewards coins when a user completes a Linkvertise or RewardsAds link and lands on our callback.
 * @module linkvertise
 */

const fs = require('fs');
const ejs = require('ejs');
const arciotext = require('../misc/afk');
const { onCoinsAdded } = require('../lib/integrations');
const LinkvertiseClient = require('../lib/linkvertise-client');
const RewardsAdsClient = require('../lib/rewardsads-client');
const LinkvertiseService = require('../lib/linkvertise-service');

// Initialize services
let linkvertiseClient = null;
let rewardsAdsClient = null;
let linkvertiseService = null;

try {
  const settings = JSON.parse(fs.readFileSync('./settings.json'));
  
  // Initialize Linkvertise
  const userId = settings.api?.client?.linkvertise?.userId || null;
  const baseUrl = settings.api?.client?.linkvertise?.baseUrl || "https://link-to.net";
  
  if (userId) {
    linkvertiseClient = new LinkvertiseClient({ 
      user_id: userId,
      base_url: baseUrl
    });
  }

  // Initialize RewardsAds
  const platformId = settings.api?.client?.rewardsads?.platformId || null;
  const secretKey = settings.api?.client?.rewardsads?.secretKey || null;
  const rewardId = settings.api?.client?.rewardsads?.rewardId || null;
  
  if (platformId && secretKey && rewardId) {
    rewardsAdsClient = new RewardsAdsClient({ 
      platform_id: platformId,
      secret_key: secretKey,
      reward_id: rewardId
    });
  }
} catch (error) {
  console.error('Error initializing ad clients:', error.message);
}

module.exports.load = function(app, db) {
  // Initialize Linkvertise service
  linkvertiseService = new LinkvertiseService(db);

  /**
   * GET /linkvertise
   * Landing page that lists configured Linkvertise and RewardsAds links.
   */
  app.get('/linkvertise', async (req, res) => {
    if (!req.session || !req.session.userinfo) return res.redirect('/login?redirect=linkvertise');
    const settings = JSON.parse(fs.readFileSync('./settings.json'));
    const indexjs = require('../app.js');
    let theme = indexjs.get(req);
    const data = await eval(indexjs.renderdataeval);
    data.linkvertise = settings.api.client.linkvertise || { enabled: false, links: [] };
    data.rewardsads = settings.api.client.rewardsads || { enabled: false };
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

    // Check daily limit
    const dailyLimit = Number(cfg.dailyLimit) || 0;
    if (dailyLimit > 0) {
      const hasReachedLimit = await linkvertiseService.hasReachedDailyLimit(userId, dailyLimit);
      if (hasReachedLimit) {
        const usageCount = await linkvertiseService.getDailyUsageCount(userId);
        console.log(`[Linkvertise] User ${userId} has reached daily limit (${usageCount}/${dailyLimit})`);
        return res.redirect(`/linkvertise?error=daily_limit_reached&limit=${dailyLimit}`);
      }
    }

    const token = await linkvertiseService.createCallbackToken(userId);
    if (!token) {
      return res.redirect('/linkvertise?err=failed_to_create_token');
    }

    console.log(`[Linkvertise] Token created for user ${userId}: ${token}`);

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

    // Track daily usage
    await linkvertiseService.trackDailyUsage(sessionUserId);

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

  /**
   * GET /api/user/earn/l4r/rewardsads/start
   * Start a new RewardsAds session - generates one-time token and redirects to RewardsAds page
   */
  app.get('/api/user/earn/l4r/rewardsads/start', async (req, res) => {
    if (!req.session || !req.session.userinfo) return res.redirect('/login?redirect=linkvertise');
    
    const settings = JSON.parse(fs.readFileSync('./settings.json'));
    const cfg = (settings.api && settings.api.client && settings.api.client.rewardsads) || {};

    if (!cfg.enabled) {
      return res.redirect('/linkvertise?error=rewardsads_not_enabled');
    }

    if (!rewardsAdsClient) {
      return res.redirect('/linkvertise?error=rewardsads_not_configured');
    }

    const userId = req.session.userinfo.id;

    // Check daily limit
    const dailyLimit = Number(cfg.dailyLimit) || 0;
    if (dailyLimit > 0) {
      const dailyUsageKey = `rewardsads-daily-${userId}-${new Date().toISOString().split('T')[0]}`;
      const usageCount = (await db.get(dailyUsageKey)) || 0;
      if (usageCount >= dailyLimit) {
        console.log(`[RewardsAds] User ${userId} has reached daily limit (${usageCount}/${dailyLimit})`);
        return res.redirect(`/linkvertise?error=daily_limit_reached&limit=${dailyLimit}&provider=rewardsads`);
      }
    }

    const token = await linkvertiseService.createCallbackToken(userId);
    if (!token) {
      return res.redirect('/linkvertise?err=failed_to_create_token');
    }

    console.log(`[RewardsAds] Token created for user ${userId}: ${token}`);

    // Redirect to RewardsAds interactive page
    res.redirect(`/rewardsads/start?user_id=${userId}&token=${token}`);
  });

  /**
   * GET /rewardsads/start
   * Shows the RewardsAds interactive page with SDK
   */
  app.get('/rewardsads/start', async (req, res) => {
    if (!req.session || !req.session.userinfo) return res.redirect('/login?redirect=linkvertise');
    
    const settings = JSON.parse(fs.readFileSync('./settings.json'));
    const cfg = (settings.api && settings.api.client && settings.api.client.rewardsads) || {};

    if (!cfg.enabled) {
      return res.redirect('/linkvertise?error=rewardsads_not_enabled');
    }

    const userId = req.query.user_id;
    const token = req.query.token;

    if (!userId || !token) {
      return res.redirect('/linkvertise?err=INVALID_PARAMS');
    }

    if (req.session.userinfo.id !== userId) {
      return res.redirect('/linkvertise?err=USER_MISMATCH');
    }

    const domain = cfg.domain || settings.oauth2?.link || 'http://localhost:3000';
    const callbackUrl = `${domain}/rewardsads/callback?user_id=${userId}&token=${token}`;
    const sdkScript = rewardsAdsClient.generateSDKScript(cfg.platformId, cfg.secretKey, cfg.rewardId, callbackUrl, cfg.rewardCoins);

    // Send HTML page with RewardsAds SDK
    res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>RewardsAds - Earn Coins</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 600px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
    }
    h1 {
      color: #333;
      margin-bottom: 20px;
    }
    p {
      color: #666;
      line-height: 1.6;
      margin-bottom: 30px;
    }
    .reward-amount {
      font-size: 48px;
      font-weight: bold;
      color: #667eea;
      margin: 20px 0;
    }
    #rewardsads-container {
      margin: 30px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎁 Earn Coins with RewardsAds</h1>
    <p>Complete the offer below to earn:</p>
    <div class="reward-amount">+${cfg.rewardCoins || 10} Coins</div>
    <p>After completing the offer, you'll be automatically redirected back to your dashboard with your reward!</p>
    <div id="rewardsads-container"></div>
  </div>
  ${sdkScript}
</body>
</html>
    `);
  });

  /**
   * GET /rewardsads/callback
   * One-time token callback endpoint for RewardsAds - validates token, rewards coins, redirects to dashboard
   */
  app.get('/rewardsads/callback', async (req, res) => {
    const settings = JSON.parse(fs.readFileSync('./settings.json'));
    const cfg = (settings.api && settings.api.client && settings.api.client.rewardsads) || {};

    if (cfg.enabled !== true) {
      return res.redirect('/dashboard?err=REWARDSADS_DISABLED');
    }

    const token = req.query.token;
    const userIdFromQuery = req.query.user_id;

    console.log(`[RewardsAds] Callback received - Token: ${token}, User ID: ${userIdFromQuery}`);

    if (!token || !userIdFromQuery) {
      return res.redirect('/dashboard?err=REWARDSADS_INVALID_PARAMS');
    }

    if (!req.session || !req.session.userinfo) {
      return res.redirect(`/login?redirect=/rewardsads/callback?token=${token}&user_id=${userIdFromQuery}`);
    }

    const sessionUserId = req.session.userinfo.id;
    
    if (sessionUserId !== userIdFromQuery) {
      console.log(`[RewardsAds] User ID mismatch - Session: ${sessionUserId}, Query: ${userIdFromQuery}`);
      return res.redirect('/dashboard?err=REWARDSADS_USER_MISMATCH');
    }

    console.log(`[RewardsAds] Validating token for user ${sessionUserId}`);
    const validation = await linkvertiseService.validateAndConsumeToken(token, userIdFromQuery);

    if (!validation.valid) {
      console.log(`[RewardsAds] Token validation failed for user ${sessionUserId}: ${validation.reason}`);
      return res.redirect(`/dashboard?err=REWARDSADS_TOKEN_INVALID`);
    }

    // Track daily usage
    const today = new Date().toISOString().split('T')[0];
    const dailyUsageKey = `rewardsads-daily-${sessionUserId}-${today}`;
    let usageCount = (await db.get(dailyUsageKey)) || 0;
    usageCount++;
    await db.set(dailyUsageKey, usageCount);

    const reward = Number(cfg.rewardCoins || 10);
    const currentCoins = (await db.get(`coins-${sessionUserId}`)) || 0;
    const updatedCoins = currentCoins + reward;
    await db.set(`coins-${sessionUserId}`, updatedCoins);

    const username = `${req.session.userinfo.username}#${req.session.userinfo.discriminator}`;
    
    try {
      await onCoinsAdded(sessionUserId, username, reward);
      console.log(`[RewardsAds] Successfully rewarded ${reward} coins to user ${username} (ID: ${sessionUserId})`);
    } catch (error) {
      console.error('[RewardsAds] Error in onCoinsAdded webhook:', error);
    }

    return res.redirect(`/dashboard?err=REWARDSADS_SUCCESS&coins=${reward}`);
  });
};
