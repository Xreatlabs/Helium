/**
 * |-| [- |_ | /\ ( ~|~ `/ |_
 *
 * Helium 1.0.0 ― Cascade Ridge
 *
 * OAuth2 authentication module - refactored to prevent login loops
 * @module oauth2
*/

"use strict";

const settings = require("../settings.json");

if (settings.api.client.oauth2.link.slice(-1) == "/")
  settings.api.client.oauth2.link = settings.api.client.oauth2.link.slice(
    0,
    -1
  );

if (settings.api.client.oauth2.callbackpath.slice(0, 1) !== "/")
  settings.api.client.oauth2.callbackpath =
    "/" + settings.api.client.oauth2.callbackpath;

if (settings.pterodactyl.domain.slice(-1) == "/")
  settings.pterodactyl.domain = settings.pterodactyl.domain.slice(0, -1);

const fetch = require("node-fetch");

const indexjs = require("../app.js");
const log = require("../misc/log");

const fs = require("fs");
const { renderFile } = require("ejs");
const vpnCheck = require("../misc/vpnCheck");

module.exports.load = async function (app, db) {
  // Login route - redirects to Discord OAuth
  app.get("/login", async (req, res) => {
    // Prevent login loops - if already authenticated AND session is valid, redirect to dashboard
    if (req.session.userinfo && req.session.pterodactyl) {
      // Validate session integrity before redirecting
      const storedUserId = await db.get("users-" + req.session.userinfo.id);
      
      // Only redirect if session data is consistent
      if (storedUserId && req.session.pterodactyl.id === storedUserId) {
        console.log("OAuth: User already authenticated, redirecting to dashboard");
        return res.redirect("/dashboard");
      } else {
        // Session is inconsistent, clear it completely and start fresh
        console.log("OAuth: Session data inconsistent, clearing and restarting login");
        return req.session.destroy((err) => {
          if (err) {
            console.error("OAuth: Error destroying session:", err);
          }
          // Redirect to login again with a clean slate
          return res.redirect("/login");
        });
      }
    }

    // Track login attempts to prevent infinite loops (only for actual OAuth attempts)
    if (!req.session.loginAttempts) {
      req.session.loginAttempts = 0;
    }
    
    // Only increment if we're actually going to redirect to OAuth
    // Don't count redirects from session clearing
    if (req.query.redirect || req.session.loginAttempts > 0) {
      req.session.loginAttempts++;
    }

    // If too many login attempts, clear session and show error
    if (req.session.loginAttempts > 5) {
      console.log("OAuth: Too many login attempts, clearing session");
      return req.session.destroy(() => {
        return res.send(
          "Too many login attempts. Please clear your cookies and try again. If the issue persists, contact support."
        );
      });
    }

    if (req.query.redirect) {
      req.session.redirect = "/" + req.query.redirect;
    }
    
    let newsettings = JSON.parse(fs.readFileSync("./settings.json"));
    
    const redirectUri = encodeURIComponent(
      settings.api.client.oauth2.link + settings.api.client.oauth2.callbackpath
    );
    
    let scopes = "identify%20email";
    if (newsettings.api.client.bot.joinguild.enabled == true) {
      scopes += "%20guilds.join";
    }
    if (newsettings.api.client.j4r.enabled == true) {
      scopes += "%20guilds";
    }
    
    let promptParam = "";
    // Only use prompt=none if explicitly configured or if this is a re-auth attempt
    if (settings.api.client.oauth2.prompt == false) {
      promptParam = "&prompt=none";
    } else if (req.query.prompt == "none" && req.session.loginAttempts <= 2) {
      // Don't use prompt=none after multiple failures
      promptParam = "&prompt=none";
    }
    
    res.redirect(
      `https://discord.com/api/oauth2/authorize?client_id=${settings.api.client.oauth2.id}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}${promptParam}`
    );
  });

  // Logout route
  app.get("/logout", (req, res) => {
    let theme = indexjs.get(req);
    req.session.destroy(() => {
      return res.redirect(
        theme.settings.redirect.logout ? theme.settings.redirect.logout : "/"
      );
    });
  });

  // OAuth callback - handles the entire authentication flow
  app.get(settings.api.client.oauth2.callbackpath, async (req, res) => {
    try {
      // Check for OAuth errors from Discord
      if (req.query.error) {
        console.log("OAuth callback: Discord returned error:", req.query.error);
        
        // Clear session to prevent loops
        req.session.destroy(() => {
          if (req.query.error === "access_denied") {
            return res.send(
              "You denied the authorization request. <a href='/login'>Click here to try again</a>."
            );
          } else {
            return res.send(
              `OAuth error: ${req.query.error}. <a href='/login'>Click here to try again</a>.`
            );
          }
        });
        return;
      }

      // Validate authorization code
      if (!req.query.code) {
        console.log("OAuth callback: Missing authorization code");
        
        // Clear login attempts and session to prevent loops
        req.session.destroy(() => {
          return res.send(
            "No authorization code received. <a href='/login'>Click here to try again</a>."
          );
        });
        return;
      }

      const newsettings = require("../settings.json");
      
      // Get custom redirect if it exists
      let customredirect = req.session.redirect;
      delete req.session.redirect;

      // Get client IP
      let ip = newsettings.api.client.oauth2.ip["trust x-forwarded-for"] == true
        ? req.headers["x-forwarded-for"] || req.connection.remoteAddress
        : req.connection.remoteAddress;
      ip = (ip ? ip : "::1")
        .replace(/::1/g, "::ffff:127.0.0.1")
        .replace(/^.*:/, "");

      // VPN check
      if (
        newsettings.antivpn.status &&
        ip !== "127.0.0.1" &&
        !newsettings.antivpn.whitelistedIPs.includes(ip)
      ) {
        const vpn = await vpnCheck(newsettings.antivpn.APIKey, db, ip, res);
        if (vpn) return;
      }

      // Exchange authorization code for access token
      console.log("OAuth: Exchanging code for token...");
      let tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
        method: "post",
        body:
          "client_id=" +
          settings.api.client.oauth2.id +
          "&client_secret=" +
          settings.api.client.oauth2.secret +
          "&grant_type=authorization_code&code=" +
          encodeURIComponent(req.query.code) +
          "&redirect_uri=" +
          encodeURIComponent(
            settings.api.client.oauth2.link +
              settings.api.client.oauth2.callbackpath
          ),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.log("OAuth: Token exchange failed", errorText);
        
        // Increment failure counter
        if (!req.session.oauthFailures) {
          req.session.oauthFailures = 0;
        }
        req.session.oauthFailures++;
        
        // If too many failures, clear session and show error
        if (req.session.oauthFailures > 2) {
          req.session.destroy(() => {
            return res.send(
              "OAuth token exchange failed multiple times. Please clear your cookies and <a href='/login'>try again</a>. Error details: " + errorText
            );
          });
          return;
        }
        
        return res.send(
          "OAuth token exchange failed. <a href='/login'>Click here to try again</a>."
        );
      }
      
      // Reset failure counter on success
      req.session.oauthFailures = 0;

      let codeinfo = JSON.parse(await tokenResponse.text());
      let scopes = codeinfo.scope;
      let missingscopes = [];

      // Check required scopes
      if (scopes.replace(/identify/g, "") == scopes)
        missingscopes.push("identify");
      if (scopes.replace(/email/g, "") == scopes) 
        missingscopes.push("email");
      if (newsettings.api.client.bot.joinguild.enabled == true)
        if (scopes.replace(/guilds.join/g, "") == scopes)
          missingscopes.push("guilds.join");
      if (newsettings.api.client.j4r.enabled)
        if (scopes.replace(/guilds/g, "") == scopes)
          missingscopes.push("guilds");
      
      if (missingscopes.length !== 0) {
        console.log("OAuth: Missing scopes:", missingscopes);
        return res.send("Missing scopes: " + missingscopes.join(", "));
      }

      // Fetch user info from Discord
      console.log("OAuth: Fetching user info...");
      let userjson = await fetch("https://discord.com/api/users/@me", {
        method: "get",
        headers: {
          Authorization: `Bearer ${codeinfo.access_token}`,
        },
      });
      let userinfo = JSON.parse(await userjson.text());

      // Check whitelist
      if (settings.whitelist.status) {
        if (!settings.whitelist.users.includes(userinfo.id)) {
          return res.send("Service is under maintenance.");
        }
      }

      // Check email verification
      if (userinfo.verified !== true) {
        return res.send(
          "Not verified a Discord account. Please verify the email on your Discord account."
        );
      }

      // Check IP block
      if (newsettings.api.client.oauth2.ip.block.includes(ip)) {
        return res.send(
          "You could not sign in, because your IP has been blocked from signing in."
        );
      }

      // Duplicate IP check
      if (
        newsettings.api.client.oauth2.ip["duplicate check"] == true &&
        ip !== "127.0.0.1"
      ) {
        const ipuser = await db.get(`ipuser-${ip}`);
        if (ipuser && ipuser !== userinfo.id) {
          renderFile(
            `./themes/${newsettings.defaulttheme}/alerts/alt.ejs`,
            {
              settings: newsettings,
              db,
              extra: { home: { name: "VPN Detected" } },
            },
            null,
            (err, str) => {
              if (err)
                return res.send(
                  'Another account on your IP has been detected, there can only be one account per IP. Think this is a mistake? <a href="https://discord.gg/halexnodes" target="_blank">Join our discord.</a>'
                );
              res.status(200);
              res.send(str);
            }
          );
          return;
        } else if (!ipuser) {
          await db.set(`ipuser-${ip}`, userinfo.id);
        }
      }

      // Fetch user guilds for J4R
      let guildsinfo = [];
      if (newsettings.api.client.j4r.enabled) {
        console.log("OAuth: Fetching guilds for J4R...");
        let guildsjson = await fetch("https://discord.com/api/users/@me/guilds", {
          method: "get",
          headers: {
            Authorization: `Bearer ${codeinfo.access_token}`,
          },
        });
        guildsinfo = await guildsjson.json();
        
        if (guildsinfo.message == "401: Unauthorized") {
          return res.send(
            "Please allow us to know what servers you are in to let the J4R system work properly. <a href='/login'>Login again</a>"
          );
        }

        let userj4r = (await db.get(`j4rs-${userinfo.id}`)) ?? [];
        let coins = (await db.get(`coins-${userinfo.id}`)) ?? 0;

        // Checking if the user has completed any new j4rs
        for (const guild of newsettings.api.client.j4r.ads) {
          if (
            guildsinfo.find((g) => g.id === guild.id) &&
            !userj4r.find((g) => g.id === guild.id)
          ) {
            userj4r.push({
              id: guild.id,
              coins: guild.coins,
            });
            coins += guild.coins;
          }
        }

        // Checking if the user has left any j4r servers
        for (const j4r of userj4r) {
          if (!guildsinfo.find((g) => g.id === j4r.id)) {
            userj4r = userj4r.filter((g) => g.id !== j4r.id);
            coins -= j4r.coins;
          }
        }

        await db.set(`j4rs-${userinfo.id}`, userj4r);
        await db.set(`coins-${userinfo.id}`, coins);
      }

      // Auto-join guild if enabled
      if (newsettings.api.client.bot.joinguild.enabled == true) {
        console.log("OAuth: Auto-joining guild...");
        if (typeof newsettings.api.client.bot.joinguild.guildid == "string") {
          await fetch(
            `https://discord.com/api/guilds/${newsettings.api.client.bot.joinguild.guildid}/members/${userinfo.id}`,
            {
              method: "put",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bot ${newsettings.api.client.bot.token}`,
              },
              body: JSON.stringify({
                access_token: codeinfo.access_token,
              }),
            }
          );
        } else if (
          typeof newsettings.api.client.bot.joinguild.guildid == "object"
        ) {
          if (Array.isArray(newsettings.api.client.bot.joinguild.guildid)) {
            for (let guild of newsettings.api.client.bot.joinguild.guildid) {
              await fetch(
                `https://discord.com/api/guilds/${guild}/members/${userinfo.id}`,
                {
                  method: "put",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bot ${newsettings.api.client.bot.token}`,
                  },
                  body: JSON.stringify({
                    access_token: codeinfo.access_token,
                  }),
                }
              );
            }
          } else {
            return res.send(
              "api.client.bot.joinguild.guildid is not an array nor a string."
            );
          }
        } else {
          return res.send(
            "api.client.bot.joinguild.guildid is not an array nor a string."
          );
        }
      }

      // Give role on login
      if (newsettings.api.client.bot.giverole.enabled == true) {
        console.log("OAuth: Assigning role...");
        if (
          typeof newsettings.api.client.bot.giverole.guildid == "string" &&
          typeof newsettings.api.client.bot.giverole.roleid == "string"
        ) {
          await fetch(
            `https://discord.com/api/guilds/${newsettings.api.client.bot.giverole.guildid}/members/${userinfo.id}/roles/${newsettings.api.client.bot.giverole.roleid}`,
            {
              method: "put",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bot ${newsettings.api.client.bot.token}`,
              },
            }
          );
        } else {
          return res.send(
            "api.client.bot.giverole.guildid or roleid is not a string."
          );
        }
      }

      // Apply role packages
      if (newsettings.api.client.packages.rolePackages.roles) {
        console.log("OAuth: Checking role packages...");
        const member = await fetch(
          `https://discord.com/api/v9/guilds/${newsettings.api.client.packages.rolePackages.roleServer}/members/${userinfo.id}`,
          {
            headers: {
              Authorization: `Bot ${newsettings.api.client.bot.token}`,
            },
          }
        );
        const memberinfo = await member.json();
        if (memberinfo.user) {
          const currentpackage = await db.get(`package-${userinfo.id}`);
          if (
            Object.values(
              newsettings.api.client.packages.rolePackages.roles
            ).includes(currentpackage)
          ) {
            for (const rolePackage of Object.keys(
              newsettings.api.client.packages.rolePackages.roles
            )) {
              if (
                newsettings.api.client.packages.rolePackages.roles[
                  rolePackage
                ] === currentpackage
              ) {
                if (!memberinfo.roles.includes(rolePackage)) {
                  await db.set(
                    `package-${userinfo.id}`,
                    newsettings.api.client.packages.default
                  );
                }
              }
            }
          }
          for (const role of memberinfo.roles) {
            if (newsettings.api.client.packages.rolePackages.roles[role]) {
              await db.set(
                `package-${userinfo.id}`,
                newsettings.api.client.packages.rolePackages.roles[role]
              );
            }
          }
        }
      }

      // Create new account if doesn't exist
      if (!(await db.get("users-" + userinfo.id))) {
        console.log("OAuth: Creating new account...");
        if (newsettings.api.client.allow.newusers == true) {
          let genpassword = null;
          if (newsettings.api.client.passwordgenerator.signup == true)
            genpassword = makeid(
              newsettings.api.client.passwordgenerator["length"]
            );
          
          let accountjson = await fetch(
            settings.pterodactyl.domain + "/api/application/users",
            {
              method: "post",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${settings.pterodactyl.key}`,
              },
              body: JSON.stringify({
                username: userinfo.id,
                email: userinfo.email,
                first_name: userinfo.username,
                last_name: "#" + userinfo.discriminator,
                password: genpassword,
              }),
            }
          );
          
          if ((await accountjson.status) == 201) {
            let accountinfo = JSON.parse(await accountjson.text());
            let userids = (await db.get("users")) ? await db.get("users") : [];
            userids.push(accountinfo.attributes.id);
            await db.set("users", userids);
            await db.set("users-" + userinfo.id, accountinfo.attributes.id);
            req.session.newaccount = true;
            req.session.password = genpassword;
          } else {
            // Try to find existing account by email
            let accountlistjson = await fetch(
              settings.pterodactyl.domain +
                "/api/application/users?include=servers&filter[email]=" +
                encodeURIComponent(userinfo.email),
              {
                method: "get",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${settings.pterodactyl.key}`,
                },
              }
            );
            let accountlist = await accountlistjson.json();
            let user = accountlist.data.filter(
              (acc) => acc.attributes.email == userinfo.email
            );
            
            if (user.length == 1) {
              let userid = user[0].attributes.id;
              let userids = (await db.get("users"))
                ? await db.get("users")
                : [];
              if (userids.filter((id) => id == userid).length == 0) {
                userids.push(userid);
                await db.set("users", userids);
                await db.set("users-" + userinfo.id, userid);
                req.session.pterodactyl = user[0].attributes;
              } else {
                return res.send(
                  "We have detected an account with your Discord email on it but the user id has already been claimed on another Discord account."
                );
              }
            } else {
              return res.send(
                "An error has occured when attempting to create your account."
              );
            }
          }
          
          log(
            "signup",
            `${userinfo.username}#${userinfo.discriminator} logged in to the dashboard for the first time!`
          );
        } else {
          return res.send("New users cannot signup currently.");
        }
      }

      // Fetch pterodactyl account info
      console.log("OAuth: Fetching Pterodactyl account...");
      let cacheaccount = await fetch(
        settings.pterodactyl.domain +
          "/api/application/users/" +
          (await db.get("users-" + userinfo.id)) +
          "?include=servers",
        {
          method: "get",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.pterodactyl.key}`,
          },
        }
      );
      
      if ((await cacheaccount.statusText) == "Not Found") {
        return res.send(
          "An error has occured while attempting to get your user information."
        );
      }
      
      let cacheaccountinfo = JSON.parse(await cacheaccount.text());
      
      // Set session data
      req.session.pterodactyl = cacheaccountinfo.attributes;
      req.session.userinfo = userinfo;
      
      // Reset login attempts on successful login
      req.session.loginAttempts = 0;
      
      // Set a flag to indicate successful authentication
      req.session.authenticated = true;
      req.session.lastAuthTime = Date.now();
      
      console.log("OAuth: Login successful for user:", userinfo.username);
      
      // Save session and redirect
      req.session.save((err) => {
        if (err) {
          console.error("OAuth: Session save error:", err);
          return res.send("Session save failed. Please try logging in again.");
        }
        
        console.log("OAuth: Session saved successfully, redirecting user");
        
        let theme = indexjs.get(req);
        if (customredirect) {
          return res.redirect(customredirect);
        }
        return res.redirect(
          theme.settings.redirect.callback
            ? theme.settings.redirect.callback
            : "/dashboard"
        );
      });
      
    } catch (error) {
      console.error("OAuth callback error:", error);
      return res.send("An error occurred during login. Please try again.");
    }
  });
};

function makeid(length) {
  let result = "";
  let characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopyrightxyz0123456789";
  let charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
