/**
 * |-| [- |_ | /\ ( ~|~ `/ |_
 *
 * Helium 1.0.0 ― Cascade Ridge 
 *
 * This file represents the main entry point of the Helium application.
 * It loads the necessary packages, settings, and databases.
 * It also handles the routing and rendering of web pages.
 * @module index
 */

"use strict";

// Load logging.
require("./misc/console.js")();

// Load packages.
const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch");
const chalk = require("chalk");
const axios = require("axios");
const arciotext = require("./misc/afk.js");
const cluster = require("cluster");
const os = require("os");
const ejs = require("ejs")
global.Buffer = global.Buffer || require("buffer").Buffer;

if (typeof btoa === "undefined") {
  global.btoa = function (str) {
    return new Buffer(str, "binary").toString("base64");
  };
}
if (typeof atob === "undefined") {
  global.atob = function (b64Encoded) {
    return new Buffer(b64Encoded, "base64").toString("binary");
  };
}

// Load settings.
const settings = require("./settings.json");

const defaultthemesettings = {
  index: "index.ejs",
  notfound: "index.ejs",
  redirect: {},
  pages: {},
  mustbeloggedin: [],
  mustbeadmin: [],
  variables: {},
};

module.exports.renderdataeval = `(async () => {
   const JavaScriptObfuscator = require('javascript-obfuscator');
   let newsettings = JSON.parse(require("fs").readFileSync("./settings.json"));
   
   // Check admin status from session (root_admin) or database
   let isAdmin = false;
   if (req.session && req.session.userinfo && req.session.userinfo.id) {
     const isRootAdminSession = !!(req.session.pterodactyl && req.session.pterodactyl.root_admin === true);
     if (isRootAdminSession) {
       isAdmin = true;
     } else {
       const adminStatus = await db.get("admin-" + req.session.userinfo.id);
       // Accept 1, true, "1", "true" representations
       isAdmin = (adminStatus === 1) || (adminStatus === true) || (adminStatus === "1") || (adminStatus === "true");
     }
   }
   
   // Check dark mode preference from database
   let isDarkMode = false;
   if (req.session && req.session.userinfo && req.session.userinfo.id) {
     const darkModeStatus = await db.get("darkmode-" + req.session.userinfo.id);
     // Support different truthy representations stored by the DB (true/1/"true")
     isDarkMode = (darkModeStatus === true) || (darkModeStatus === 1) || (darkModeStatus === "true");
   }
   
   // Check snowflakes preference from database (default: enabled)
   let hasSnowflakes = true;
   if (req.session && req.session.userinfo && req.session.userinfo.id) {
     const snowflakesStatus = await db.get("snowflakes-" + req.session.userinfo.id);
     // If explicitly set to false, disable it; otherwise keep default enabled
     if (snowflakesStatus === false || snowflakesStatus === 0 || snowflakesStatus === "false") {
       hasSnowflakes = false;
     }
   }
   
    let renderdata = {
      req: req,
      settings: newsettings,
      userinfo: req.session.userinfo,
      packagename: req.session.userinfo ? await db.get("package-" + req.session.userinfo.id) ? await db.get("package-" + req.session.userinfo.id) : newsettings.api.client.packages.default : null,
      extraresources: !req.session.userinfo ? null : (await db.get("extra-" + req.session.userinfo.id) ? await db.get("extra-" + req.session.userinfo.id) : {
        ram: 0,
        disk: 0,
        cpu: 0,
        servers: 0
      }),
    packages: req.session.userinfo ? newsettings.api.client.packages.list[await db.get("package-" + req.session.userinfo.id) ? await db.get("package-" + req.session.userinfo.id) : newsettings.api.client.packages.default] : null,
      coins: newsettings.api.client.coins.enabled == true ? (req.session.userinfo ? (await db.get("coins-" + req.session.userinfo.id) ? await db.get("coins-" + req.session.userinfo.id) : 0) : null) : null,
      x: 'aHR0cHM6Ly93d3cueW91dHViZS5jb20vd2F0Y2g/dj1wVGZKZm5pUUZTOA==',
      pterodactyl: req.session.pterodactyl,
      extra: theme.settings.variables,
      isAdmin: isAdmin,
      isDarkMode: isDarkMode,
      hasSnowflakes: hasSnowflakes,
    db: db
    };
    
    // Fetch server expiry data for renewal system
    renderdata.serverExpiry = {};
    if (newsettings.api.client.allow.renewsuspendsystem?.enabled && req.session.pterodactyl?.relationships?.servers?.data) {
      for (const server of req.session.pterodactyl.relationships.servers.data) {
        const serverId = server.attributes.id;
        const expiryTime = await db.get("server-expiry-" + serverId);
        if (expiryTime) {
          const now = Date.now();
          const daysUntilExpiry = Math.floor((expiryTime - now) / (24 * 60 * 60 * 1000));
          const hoursUntilExpiry = Math.floor((expiryTime - now) / (60 * 60 * 1000));
          const gracePeriod = newsettings.api.client.allow.renewsuspendsystem.graceperiod || 3;
          
          let status = null;
          let text = "";
          let cssClass = "";
          
          if (daysUntilExpiry < 0) {
            const daysOverdue = Math.abs(daysUntilExpiry);
            if (daysOverdue > gracePeriod) {
              status = "suspended";
              text = "Suspended - Expired " + daysOverdue + " days ago";
              cssClass = "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300";
            } else {
              status = "expired";
              text = "Expired " + daysOverdue + " days ago (grace period)";
              cssClass = "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300";
            }
          } else if (daysUntilExpiry === 0) {
            status = "expiring-today";
            text = "Expires in " + hoursUntilExpiry + " hours";
            cssClass = "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300";
          } else if (daysUntilExpiry <= 3) {
            status = "expiring-soon";
            text = "Expires in " + daysUntilExpiry + " days";
            cssClass = "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300";
          } else {
            status = "active";
            text = "Expires in " + daysUntilExpiry + " days";
            cssClass = "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300";
          }
          
          renderdata.serverExpiry[serverId] = {
            timestamp: expiryTime,
            status: status,
            text: text,
            class: cssClass
          };
        }
      }
    }
    
     renderdata.arcioafktext = JavaScriptObfuscator.obfuscate(\`
     let everywhat = \${newsettings.api.afk.every};
     let gaincoins = \${newsettings.api.afk.coins};
     let wspath = "ws";

     \${arciotext}
    \`);
    return renderdata;
  })();`;

// Load database
const Keyv = require("keyv").default;
const { KeyvSqlite } = require("@keyv/sqlite");

// Use SQLite adapter directly to prevent caching issues across cluster workers
const sqliteStore = new KeyvSqlite({
  uri: settings.database,
  busyTimeout: 10000
});

const db = new Keyv({
  store: sqliteStore,
  namespace: 'helium'
});

db.on("error", (err) => {
  console.log(
    chalk.red(
      "Database ― An error has occurred when attempting to access the SQLite database."
    )
  );
});

module.exports.db = db;

if (cluster.isMaster) {
  const numCPUs = 8;
  console.log(chalk.gray('Starting workers on Helium 1 (Cascade Ridge)'))
  console.log(chalk.gray(`Master ${process.pid} is running`));
  console.log(chalk.gray(`Forking ${numCPUs} workers...`));

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(chalk.red(`Worker ${worker.process.pid} died. Forking a new worker...`));
    cluster.fork();
  });

} else {
  // Load websites.
  const express = require("express");
  const app = express();
  app.set('view engine', 'ejs');
  require("express-ws")(app);

  // Load express addons.
  const ejs = require("ejs");
  const session = require("express-session");
  const createSessionStore = require("./lib/sessionStore");
  const indexjs = require("./app.js");

  // Load the website.
  module.exports.app = app;

  app.use((req, res, next) => {
    res.setHeader("X-Powered-By", "1st Gen Helium (Cascade Ridge)");
    next();
  });

  // Modern session configuration with better-sqlite3
  app.use(
    session({
      store: createSessionStore('./database.sqlite'),
      secret: settings.website.secret,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      name: 'helium.sid',
      cookie: { 
        secure: false,
        maxAge: 86400000, // 24 hours
        httpOnly: true,
        sameSite: 'lax',
        path: '/'
      },
    })
  );

  app.use(
    express.json({
      inflate: true,
      limit: "500kb",
      reviver: null,
      strict: true,
      type: "application/json",
      verify: undefined,
    })
  );

  app.use(
    express.urlencoded({
      extended: true,
      limit: "500kb"
    })
  );

  const listener = app.listen(settings.website.port, function () {
    console.log(
      chalk.white("State updated: ") + chalk.green('online')
    );
  });

  // Start renewal cron job
  if (settings.api.client.allow.renewsuspendsystem?.enabled) {
    const renewalCron = require("./scripts/renewal-cron");
    renewalCron(db, settings);
  }

  var cache = false;
  app.use(function (req, res, next) {
    // Ensure _parsedUrl is available for downstream logic
    if (!req._parsedUrl) {
      try {
        const parsed = new URL(req.url, 'http://localhost');
        req._parsedUrl = {
          pathname: parsed.pathname,
          search: parsed.search,
          query: Object.fromEntries(parsed.searchParams)
        };
      } catch (e) {
        req._parsedUrl = { pathname: req.path || '/', search: '', query: req.query || {} };
      }
    }
    let manager = JSON.parse(fs.readFileSync("./settings.json").toString()).api
      .client.ratelimits;
    if (manager[req._parsedUrl.pathname]) {
      if (cache == true) {
        setTimeout(async () => {
          let allqueries = Object.entries(req.query);
          let querystring = "";
          for (let query of allqueries) {
            querystring = querystring + "&" + query[0] + "=" + query[1];
          }
          querystring = "?" + querystring.slice(1);
          res.redirect(
            (req._parsedUrl.pathname.slice(0, 1) == "/"
              ? req._parsedUrl.pathname
              : "/" + req._parsedUrl.pathname) + querystring
          );
        }, 1000);
        return;
      } else {
        cache = true;
        setTimeout(async () => {
          cache = false;
        }, 1000 * manager[req._parsedUrl.pathname]);
      }
    }
    next();
  });

  // Load the API files.
  let apifiles = fs.readdirSync("./api").filter((file) => file.endsWith(".js")); //UzJsdVoxUnBibTg9IHdhcyByaWdodA==

  apifiles.forEach((file) => {
    let apifile = require(`./api/${file}`);
    apifile.load(app, db);
  });

  app.all("*", async (req, res) => {
    // Ensure _parsedUrl exists in all environments (Node, Bun wrapper, proxies)
    if (!req._parsedUrl) {
      try {
        const parsed = new URL(req.url, 'http://localhost');
        req._parsedUrl = {
          pathname: parsed.pathname,
          search: parsed.search,
          query: Object.fromEntries(parsed.searchParams)
        };
      } catch (e) {
        req._parsedUrl = { pathname: req.path || '/', search: '', query: req.query || {} };
      }
    }
    // Ensure pterodactyl data structure is compatible with templates
    if (req.session && req.session.pterodactyl) {
      if (!req.session.pterodactyl.relationships) {
        req.session.pterodactyl.relationships = {
          servers: {
            data: req.session.pterodactyl.servers || []
          }
        };
      }
      if (!req.session.pterodactyl.servers) {
        req.session.pterodactyl.servers = [];
      }
    }
    
    let theme = indexjs.get(req);
    let newsettings = JSON.parse(require("fs").readFileSync("./settings.json"));
    if (newsettings.api.afk.enabled == true)
      req.session.arcsessiontoken = Math.random().toString(36).substring(2, 15);
    if (theme.settings.mustbeloggedin.includes(req._parsedUrl.pathname))
      if (!req.session.userinfo || !req.session.pterodactyl)
        return res.redirect(
          "/login" +
            (req._parsedUrl.pathname.slice(0, 1) == "/"
              ? "?redirect=" + req._parsedUrl.pathname.slice(1)
              : "")
        );
    if (theme.settings.mustbeadmin.includes(req._parsedUrl.pathname)) {
      // Check if user is logged in
      if (!req.session.userinfo || !req.session.pterodactyl) {
        // Redirect to login preserving target
        const redirectPath = req._parsedUrl.pathname.slice(1);
        return res.redirect(`/login${redirectPath ? `?redirect=${redirectPath}` : ''}`);
      }

      // Check admin from session root_admin first, then DB as fallback
      let isAdmin = false;
      if (req.session.pterodactyl && req.session.pterodactyl.root_admin === true) {
        isAdmin = true;
      } else {
        const adminStatus = await db.get(`admin-${req.session.userinfo.id}`);
        isAdmin = (adminStatus === 1) || (adminStatus === true) || (adminStatus === "1") || (adminStatus === "true");
      }
      if (!isAdmin) {
        ejs.renderFile(
          `./views/${theme.settings.notfound}`,
          await eval(indexjs.renderdataeval),
          null,
          function (err, str) {
            delete req.session.newaccount;
            delete req.session.password;
            if (err) {
              console.log(err);
              const newsettings = JSON.parse(require("fs").readFileSync("./settings.json"));
              return res.render("500.ejs", { err, settings: newsettings, isDarkMode: false });
            }
            res.status(200);
            return res.send(str);
          }
        );
        return;
      }

      // User is admin, render the page
      ejs.renderFile(
        `./views/${
          theme.settings.pages[req._parsedUrl.pathname.slice(1)]
            ? theme.settings.pages[req._parsedUrl.pathname.slice(1)]
            : theme.settings.notfound
        }`,
        await eval(indexjs.renderdataeval),
        null,
        function (err, str) {
          delete req.session.newaccount;
          delete req.session.password;
          if (err) {
            console.log(err);
            const newsettings = JSON.parse(require("fs").readFileSync("./settings.json"));
            return res.render("500.ejs", { err, settings: newsettings, isDarkMode: false });
          }
          res.status(200);
          res.send(str);
        }
      );
      return;
    }
    const data = await eval(indexjs.renderdataeval);
    ejs.renderFile(
      `./views/${
        theme.settings.pages[req._parsedUrl.pathname.slice(1)]
          ? theme.settings.pages[req._parsedUrl.pathname.slice(1)]
          : theme.settings.notfound
      }`,
      data,
      null,
      function (err, str) {
        delete req.session.newaccount;
        delete req.session.password;
        if (err) {
          console.log(err);
          const newsettings = JSON.parse(require("fs").readFileSync("./settings.json"));
          return res.render("500.ejs", { err, settings: newsettings, isDarkMode: false });
        }
        res.status(200);
        res.send(str);
      }
    );
  });

  module.exports.get = function (req) {
    return {
      settings: fs.existsSync(`./views/pages.json`)
        ? JSON.parse(fs.readFileSync(`./views/pages.json`).toString())
        : defaultthemesettings
    };
  };

  module.exports.islimited = async function () {
    return cache == true ? false : true;
  };

  module.exports.ratelimits = async function (length) {
    if (cache == true) return setTimeout(indexjs.ratelimits, 1);
    cache = true;
    setTimeout(async function () {
      cache = false;
    }, length * 1000);
  };

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

async function renderTemplate(theme, renderdataeval, req, res, db) {
  return new Promise(async (resolve, reject) => {
    ejs.renderFile(
      `./views/${theme.settings.index}`,
      await eval(renderdataeval),
      null,
      async function (err, str) {
        if (err) {
          reject(err);
          return;
        }

        delete req.session.newaccount;
        resolve(str);
      }
    );
  });
}
