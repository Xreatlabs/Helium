/**
 * Modern OAuth2 Authentication System for Helium
 * Built from scratch with clean architecture
 */

"use strict";

const fetch = require("node-fetch");
const settings = require("../settings.json");
const log = require("../misc/log");
const vpnCheck = require("../misc/vpnCheck");

// Normalize settings
const normalizeUrl = (url) => url.replace(/\/$/, '');
const normalizePath = (path) => path.startsWith('/') ? path : `/${path}`;

const DISCORD_API = "https://discord.com/api";
const OAUTH_CONFIG = {
  domain: normalizeUrl(settings.api.client.oauth2.link),
  callbackPath: normalizePath(settings.api.client.oauth2.callbackpath),
  clientId: settings.api.client.oauth2.id,
  clientSecret: settings.api.client.oauth2.secret,
};

module.exports.load = function (app, db) {
  
  /**
   * Login Route - Initiates OAuth flow
   */
  app.get("/login", (req, res) => {
    // If already logged in, redirect to dashboard
    if (req.session && req.session.userId && req.session.pterodactylId) {
      console.log(`[OAuth] User already authenticated: ${req.session.userId}`);
      return res.redirect("/dashboard");
    }
    
    // Store redirect target if provided
    if (req.query.redirect) {
      req.session.oauthRedirect = `/${req.query.redirect}`;
    }
    
    // Build OAuth URL
    const redirectUri = encodeURIComponent(OAUTH_CONFIG.domain + OAUTH_CONFIG.callbackPath);
    
    let scopes = ['identify', 'email'];
    if (settings.api.client.j4r?.enabled) scopes.push('guilds');
    if (settings.api.client.bot?.joinguild?.enabled) scopes.push('guilds.join');
    
    const scopeString = scopes.join('%20');
    const authUrl = `${DISCORD_API}/oauth2/authorize?client_id=${OAUTH_CONFIG.clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scopeString}`;
    
    console.log(`[OAuth] Redirecting to Discord for authentication`);
    res.redirect(authUrl);
  });

  /**
   * Logout Route
   */
  app.get("/logout", (req, res) => {
    const redirectUrl = settings.pages?.redirect?.logout || "/";
    req.session.destroy((err) => {
      if (err) console.error("[OAuth] Logout error:", err);
      console.log(`[OAuth] User logged out`);
      res.redirect(redirectUrl);
    });
  });

  /**
   * OAuth Callback - Handles Discord redirect
   */
  app.get(OAUTH_CONFIG.callbackPath, async (req, res) => {
    try {
      // Handle OAuth errors
      if (req.query.error) {
        console.error(`[OAuth] Discord error: ${req.query.error}`);
        return res.send(`Authorization failed: ${req.query.error}. <a href="/login">Try again</a>`);
      }

      // Validate authorization code
      if (!req.query.code) {
        console.error(`[OAuth] No authorization code received`);
        return res.send('No authorization code received. <a href="/login">Try again</a>');
      }

      console.log(`[OAuth] Processing callback with code`);

      // Exchange code for access token
      const tokenResponse = await fetch(`${DISCORD_API}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: OAUTH_CONFIG.clientId,
          client_secret: OAUTH_CONFIG.clientSecret,
          grant_type: 'authorization_code',
          code: req.query.code,
          redirect_uri: OAUTH_CONFIG.domain + OAUTH_CONFIG.callbackPath,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error(`[OAuth] Token exchange failed:`, error);
        return res.send('Failed to exchange authorization code. <a href="/login">Try again</a>');
      }

      const tokenData = await tokenResponse.json();
      
      // Verify required scopes
      const requiredScopes = ['identify', 'email'];
      const hasAllScopes = requiredScopes.every(scope => tokenData.scope.includes(scope));
      
      if (!hasAllScopes) {
        console.error(`[OAuth] Missing required scopes`);
        return res.send('Missing required permissions. <a href="/login">Try again</a>');
      }

      // Fetch user information from Discord
      const userResponse = await fetch(`${DISCORD_API}/users/@me`, {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
      });

      const discordUser = await userResponse.json();
      console.log(`[OAuth] Discord user fetched: ${discordUser.username}#${discordUser.discriminator} (${discordUser.id})`);

      // Security checks
      if (!discordUser.verified) {
        return res.send('Please verify your Discord email address before logging in.');
      }

      if (settings.whitelist?.status && !settings.whitelist.users.includes(discordUser.id)) {
        return res.send('Service is currently in maintenance mode.');
      }

      // Get user IP
      const userIp = (settings.api.client.oauth2.ip['trust x-forwarded-for'] 
        ? req.headers['x-forwarded-for'] 
        : req.connection.remoteAddress) || '127.0.0.1';
      
      const normalizedIp = userIp.replace(/::1/g, '127.0.0.1').replace(/^.*:/, '');

      // VPN check
      if (settings.antivpn?.status && normalizedIp !== '127.0.0.1' 
          && !settings.antivpn.whitelistedIPs?.includes(normalizedIp)) {
        const isVpn = await vpnCheck(settings.antivpn.APIKey, db, normalizedIp, res);
        if (isVpn) return;
      }

      // IP blocking
      if (settings.api.client.oauth2.ip.block?.includes(normalizedIp)) {
        return res.send('Your IP address has been blocked.');
      }

      // Duplicate IP check
      if (settings.api.client.oauth2.ip['duplicate check'] && normalizedIp !== '127.0.0.1') {
        const existingUser = await db.get(`ipuser-${normalizedIp}`);
        if (existingUser && existingUser !== discordUser.id) {
          return res.send('Another account is already registered with your IP address.');
        }
        if (!existingUser) {
          await db.set(`ipuser-${normalizedIp}`, discordUser.id);
        }
      }

      // Handle Join-for-Rewards (J4R)
      if (settings.api.client.j4r?.enabled && tokenData.scope.includes('guilds')) {
        await handleJ4R(discordUser.id, tokenData.access_token, db);
      }

      // Auto-join Discord guild
      if (settings.api.client.bot?.joinguild?.enabled && tokenData.scope.includes('guilds.join')) {
        await autoJoinGuild(discordUser.id, tokenData.access_token);
      }

      // Give role on login
      if (settings.api.client.bot?.giverole?.enabled) {
        await giveRole(discordUser.id);
      }

      // Handle role packages
      if (settings.api.client.packages?.rolePackages?.roles) {
        await handleRolePackages(discordUser.id, db);
      }

      // Get or create Pterodactyl account
      const pterodactylUser = await getOrCreatePterodactylAccount(discordUser, db);
      
      if (!pterodactylUser) {
        return res.send('Failed to create or retrieve your account. Please contact support.');
      }

      // Set session data
      req.session.userId = discordUser.id;
      req.session.userinfo = {
        id: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator,
        avatar: discordUser.avatar,
        email: discordUser.email
      };
      req.session.pterodactylId = pterodactylUser.id;
      req.session.pterodactyl = pterodactylUser;
      req.session.authenticated = true;
      req.session.loginTime = Date.now();

      // Save session and redirect
      req.session.save((err) => {
        if (err) {
          console.error('[OAuth] Session save error:', err);
          return res.send('Session error. Please try logging in again.');
        }
        
        console.log(`[OAuth] Login successful: ${discordUser.username} (${discordUser.id})`);
        console.log(`[OAuth] Session ID: ${req.sessionID}`);
        
        const redirectUrl = req.session.oauthRedirect || settings.pages?.redirect?.callback || '/dashboard';
        delete req.session.oauthRedirect;
        
        res.redirect(redirectUrl);
      });

    } catch (error) {
      console.error('[OAuth] Callback error:', error);
      res.send('An unexpected error occurred. Please try again.');
    }
  });
};

/**
 * Get or create Pterodactyl account for user
 */
async function getOrCreatePterodactylAccount(discordUser, db) {
  const settings = require('../settings.json');
  
  // Check if user already has an account
  const existingId = await db.get(`users-${discordUser.id}`);
  
  if (existingId) {
    // Fetch existing account
    const response = await fetch(
      `${settings.pterodactyl.domain}/api/application/users/${existingId}?include=servers`,
      {
        headers: {
          'Authorization': `Bearer ${settings.pterodactyl.key}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[OAuth] Existing Pterodactyl account found: ID ${existingId}`);
      return data.attributes;
    }
  }

  // Create new account
  if (!settings.api.client.allow?.newusers) {
    console.error('[OAuth] New user registration is disabled');
    return null;
  }

  const password = settings.api.client.passwordgenerator?.signup 
    ? generatePassword(settings.api.client.passwordgenerator.length || 16)
    : null;

  const createResponse = await fetch(
    `${settings.pterodactyl.domain}/api/application/users`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.pterodactyl.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: discordUser.id,
        email: discordUser.email,
        first_name: discordUser.username,
        last_name: `#${discordUser.discriminator}`,
        password: password,
      }),
    }
  );

  if (createResponse.ok) {
    const data = await createResponse.json();
    const userId = data.attributes.id;
    
    // Store user mapping
    let userIds = (await db.get('users')) || [];
    userIds.push(userId);
    await db.set('users', userIds);
    await db.set(`users-${discordUser.id}`, userId);
    
    log('signup', `${discordUser.username}#${discordUser.discriminator} created account`);
    console.log(`[OAuth] Created new Pterodactyl account: ID ${userId}`);
    
    return data.attributes;
  }

  // Try to find account by email
  const searchResponse = await fetch(
    `${settings.pterodactyl.domain}/api/application/users?filter[email]=${encodeURIComponent(discordUser.email)}`,
    {
      headers: {
        'Authorization': `Bearer ${settings.pterodactyl.key}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (searchResponse.ok) {
    const searchData = await searchResponse.json();
    const matches = searchData.data.filter(u => u.attributes.email === discordUser.email);
    
    if (matches.length === 1) {
      const userId = matches[0].attributes.id;
      
      // Check if not already claimed
      let userIds = (await db.get('users')) || [];
      if (!userIds.includes(userId)) {
        userIds.push(userId);
        await db.set('users', userIds);
        await db.set(`users-${discordUser.id}`, userId);
        
        console.log(`[OAuth] Linked existing Pterodactyl account: ID ${userId}`);
        return matches[0].attributes;
      }
    }
  }

  console.error('[OAuth] Failed to create or find Pterodactyl account');
  return null;
}

/**
 * Handle Join-for-Rewards
 */
async function handleJ4R(userId, accessToken, db) {
  const settings = require('../settings.json');
  
  try {
    const guildsResponse = await fetch(`${DISCORD_API}/users/@me/guilds`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    
    const guilds = await guildsResponse.json();
    const userJ4Rs = (await db.get(`j4rs-${userId}`)) || [];
    let coins = (await db.get(`coins-${userId}`)) || 0;

    // Check for new J4R completions
    for (const guildConfig of settings.api.client.j4r.ads) {
      const inGuild = guilds.some(g => g.id === guildConfig.id);
      const alreadyRewarded = userJ4Rs.some(j => j.id === guildConfig.id);
      
      if (inGuild && !alreadyRewarded) {
        userJ4Rs.push({ id: guildConfig.id, coins: guildConfig.coins });
        coins += guildConfig.coins;
        console.log(`[J4R] User ${userId} joined ${guildConfig.id}, earned ${guildConfig.coins} coins`);
      }
    }

    // Check for left servers
    for (const j4r of userJ4Rs) {
      const stillInGuild = guilds.some(g => g.id === j4r.id);
      if (!stillInGuild) {
        const index = userJ4Rs.findIndex(j => j.id === j4r.id);
        userJ4Rs.splice(index, 1);
        coins -= j4r.coins;
        console.log(`[J4R] User ${userId} left guild ${j4r.id}, removed ${j4r.coins} coins`);
      }
    }

    await db.set(`j4rs-${userId}`, userJ4Rs);
    await db.set(`coins-${userId}`, coins);
    
  } catch (error) {
    console.error('[J4R] Error:', error);
  }
}

/**
 * Auto-join Discord guild
 */
async function autoJoinGuild(userId, accessToken) {
  const settings = require('../settings.json');
  const guildIds = Array.isArray(settings.api.client.bot.joinguild.guildid)
    ? settings.api.client.bot.joinguild.guildid
    : [settings.api.client.bot.joinguild.guildid];

  for (const guildId of guildIds) {
    try {
      await fetch(`${DISCORD_API}/guilds/${guildId}/members/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bot ${settings.api.client.bot.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token: accessToken }),
      });
      console.log(`[OAuth] Added user ${userId} to guild ${guildId}`);
    } catch (error) {
      console.error(`[OAuth] Failed to add user to guild ${guildId}:`, error);
    }
  }
}

/**
 * Give role to user
 */
async function giveRole(userId) {
  const settings = require('../settings.json');
  
  try {
    await fetch(
      `${DISCORD_API}/guilds/${settings.api.client.bot.giverole.guildid}/members/${userId}/roles/${settings.api.client.bot.giverole.roleid}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bot ${settings.api.client.bot.token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`[OAuth] Gave role to user ${userId}`);
  } catch (error) {
    console.error('[OAuth] Failed to give role:', error);
  }
}

/**
 * Handle role-based packages
 */
async function handleRolePackages(userId, db) {
  const settings = require('../settings.json');
  
  try {
    const memberResponse = await fetch(
      `${DISCORD_API}/guilds/${settings.api.client.packages.rolePackages.roleServer}/members/${userId}`,
      {
        headers: { 'Authorization': `Bot ${settings.api.client.bot.token}` },
      }
    );
    
    if (!memberResponse.ok) return;
    
    const member = await memberResponse.json();
    const currentPackage = await db.get(`package-${userId}`);
    
    // Check if user lost their role
    if (currentPackage && Object.values(settings.api.client.packages.rolePackages.roles).includes(currentPackage)) {
      const hasRole = Object.keys(settings.api.client.packages.rolePackages.roles).some(
        roleId => member.roles.includes(roleId)
      );
      
      if (!hasRole) {
        await db.set(`package-${userId}`, settings.api.client.packages.default);
        console.log(`[RolePackage] User ${userId} lost role, reset to default package`);
      }
    }
    
    // Apply role package
    for (const roleId of member.roles) {
      if (settings.api.client.packages.rolePackages.roles[roleId]) {
        await db.set(`package-${userId}`, settings.api.client.packages.rolePackages.roles[roleId]);
        console.log(`[RolePackage] Applied package for role ${roleId} to user ${userId}`);
        break;
      }
    }
  } catch (error) {
    console.error('[RolePackage] Error:', error);
  }
}

/**
 * Generate random password
 */
function generatePassword(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

