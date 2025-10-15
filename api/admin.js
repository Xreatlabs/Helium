/**
 * |-| [- |_ | /\ ( ~|~ `/ |_
 *
 * Helium 1.0.0 ― Cascade Ridge
 *
 * This is for the admin side of Helium.
 * @module admin
 */

const settings = require("../settings.json");

if (settings.pterodactyl)
  if (settings.pterodactyl.domain) {
    if (settings.pterodactyl.domain.slice(-1) == "/")
      settings.pterodactyl.domain = settings.pterodactyl.domain.slice(0, -1);
  }

const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const indexjs = require("../app.js");
const adminjs = require("./admin.js");
const ejs = require("ejs");
const log = require("../misc/log");
const healthCheck = require("../lib/healthCheck");
const ApiKeyManager = require("../managers/ApiKeyManager");
const apiKeyManager = new ApiKeyManager(path.join(__dirname, "../database.sqlite"));

// Helper function to check admin status
async function checkAdmin(req, res, db) {
  if (!req.session || !req.session.userinfo || !req.session.userinfo.id) {
    return false;
  }
  // Prefer session root_admin if available
  const isRootAdminSession =
    !!(req.session.pterodactyl && req.session.pterodactyl.root_admin === true);

  if (isRootAdminSession) return true;

  // Fallback to DB flag, accepting multiple truthy representations
  const adminStatus = await db.get(`admin-${req.session.userinfo.id}`);
  return (
    adminStatus === 1 ||
    adminStatus === true ||
    adminStatus === "1" ||
    adminStatus === "true"
  );
}

module.exports.load = async function (app, db) {
  const BanManager = require("../lib/BanManager");
  const banManager = new BanManager(db, settings);
  // Fetch eggs from Pterodactyl Panel
  app.get("/admin/pterodactyl/eggs", async (req, res) => {
    if (!req.session.userinfo || !req.session.userinfo.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const response = await fetch(
        `${settings.pterodactyl.domain}/api/application/nests/${req.query.nest}/eggs?include=nest`,
        {
          headers: {
            Authorization: `Bearer ${settings.pterodactyl.key}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );
      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch eggs" });
    }
  });

  // Fetch all nests from Pterodactyl Panel
  app.get("/admin/pterodactyl/nests", async (req, res) => {
    if (!req.session.userinfo || !req.session.userinfo.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const response = await fetch(
        `${settings.pterodactyl.domain}/api/application/nests`,
        {
          headers: {
            Authorization: `Bearer ${settings.pterodactyl.key}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );
      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch nests" });
    }
  });

  // Fetch locations from Pterodactyl Panel
  app.get("/admin/pterodactyl/locations", async (req, res) => {
    if (!req.session.userinfo || !req.session.userinfo.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const response = await fetch(
        `${settings.pterodactyl.domain}/api/application/locations`,
        {
          headers: {
            Authorization: `Bearer ${settings.pterodactyl.key}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );
      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch locations" });
    }
  });

  // Fetch nodes from Pterodactyl Panel
  app.get("/admin/pterodactyl/nodes", async (req, res) => {
    if (!req.session.userinfo || !req.session.userinfo.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const response = await fetch(
        `${settings.pterodactyl.domain}/api/application/nodes`,
        {
          headers: {
            Authorization: `Bearer ${settings.pterodactyl.key}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );
      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch nodes" });
    }
  });

  // Save egg configuration
  app.post("/admin/eggs/save", async (req, res) => {
    if (!req.session.userinfo || !req.session.userinfo.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const { eggName, eggData } = req.body;
      
      const settingsPath = "./settings.json";
      const currentSettings = JSON.parse(fs.readFileSync(settingsPath));
      
      if (!currentSettings.api.client.eggs) {
        currentSettings.api.client.eggs = {};
      }
      
      currentSettings.api.client.eggs[eggName] = eggData;
      
      fs.writeFileSync(settingsPath, JSON.stringify(currentSettings, null, 2));
      res.json({ success: true, message: "Egg saved successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to save egg" });
    }
  });

  // Delete egg configuration
  app.delete("/admin/eggs/delete", async (req, res) => {
    if (!req.session.userinfo || !req.session.userinfo.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const { eggName } = req.body;
      
      const settingsPath = "./settings.json";
      const currentSettings = JSON.parse(fs.readFileSync(settingsPath));
      
      if (currentSettings.api.client.eggs && currentSettings.api.client.eggs[eggName]) {
        delete currentSettings.api.client.eggs[eggName];
        fs.writeFileSync(settingsPath, JSON.stringify(currentSettings, null, 2));
        res.json({ success: true, message: "Egg deleted successfully" });
      } else {
        res.status(404).json({ error: "Egg not found" });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete egg" });
    }
  });

  // Save location configuration
  app.post("/admin/locations/save", async (req, res) => {
    if (!req.session.userinfo || !req.session.userinfo.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const { locationId, locationData } = req.body;
      
      const settingsPath = "./settings.json";
      const currentSettings = JSON.parse(fs.readFileSync(settingsPath));
      
      if (!currentSettings.api.client.locations) {
        currentSettings.api.client.locations = {};
      }
      
      currentSettings.api.client.locations[locationId] = locationData;
      
      fs.writeFileSync(settingsPath, JSON.stringify(currentSettings, null, 2));
      res.json({ success: true, message: "Location saved successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to save location" });
    }
  });

  // Delete location configuration
  app.delete("/admin/locations/delete", async (req, res) => {
    if (!req.session.userinfo || !req.session.userinfo.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const { locationId } = req.body;
      
      const settingsPath = "./settings.json";
      const currentSettings = JSON.parse(fs.readFileSync(settingsPath));
      
      if (currentSettings.api.client.locations && currentSettings.api.client.locations[locationId]) {
        delete currentSettings.api.client.locations[locationId];
        fs.writeFileSync(settingsPath, JSON.stringify(currentSettings, null, 2));
        res.json({ success: true, message: "Location deleted successfully" });
      } else {
        res.status(404).json({ error: "Location not found" });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete location" });
    }
  });

  // Save node display name
  app.post("/admin/nodes/save", async (req, res) => {
    if (!req.session.userinfo || !req.session.userinfo.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const { nodeId, displayName } = req.body;
      
      const settingsPath = "./settings.json";
      const currentSettings = JSON.parse(fs.readFileSync(settingsPath));
      
      if (!currentSettings.api.client.nodes) {
        currentSettings.api.client.nodes = {};
      }
      
      currentSettings.api.client.nodes[nodeId] = {
        displayName: displayName
      };
      
      fs.writeFileSync(settingsPath, JSON.stringify(currentSettings, null, 2));
      res.json({ success: true, message: "Node display name saved successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to save node display name" });
    }
  });

  // Search users
  app.get("/admin/users/search", async (req, res) => {
    if (!req.session.userinfo || !req.session.userinfo.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const query = req.query.q || '';
      if (query.length < 2) {
        return res.json({ users: [] });
      }

      // Read fresh settings to get latest package configurations
      const freshSettings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));

      // Build a map of Pterodactyl ID -> Discord ID from local database
      const sqlite3 = require('better-sqlite3');
      const dbPath = settings.database.replace('sqlite://', './');
      const dbFile = new sqlite3(dbPath);
      const rows = dbFile.prepare("SELECT key, value FROM keyv WHERE key LIKE 'helium:users-%'").all();
      dbFile.close();
      
      const pteroToDiscord = {};
      rows.forEach(row => {
        const discordId = row.key.replace('helium:users-', '');
        let pteroId;
        try {
          const parsed = JSON.parse(row.value);
          pteroId = parsed.value;
        } catch(e) {
          pteroId = row.value;
        }
        pteroToDiscord[pteroId] = discordId;
      });
      
      // Fetch ALL users from Pterodactyl and filter by search query
      const userResponse = await fetch(
        `${settings.pterodactyl.domain}/api/application/users?per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${settings.pterodactyl.key}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (!userResponse.ok) {
        return res.status(500).json({ error: "Failed to fetch users from Pterodactyl" });
      }
      
      const pterodactylData = await userResponse.json();
      const users = [];
      
      for (const userData of pterodactylData.data) {
        const user = userData.attributes;
        
        // Try to find Discord ID
        let discordId = pteroToDiscord[user.id];
        if (!discordId && /^\d{17,19}$/.test(user.username)) {
          discordId = user.username;
        }
        
        // Search by username, email or Discord ID
        if (user.username?.toLowerCase().includes(query.toLowerCase()) || 
            user.email?.toLowerCase().includes(query.toLowerCase()) ||
            (discordId && discordId.includes(query))) {
          
          // Get coins and resources
          let coins = 0;
          let ram = 0;
          let disk = 0;
          let cpu = 0;
          let servers = 0;
          
          if (discordId) {
            coins = await db.get(`coins-${discordId}`) || 0;
            
            // Get user's package or use default
            const packageName = await db.get(`package-${discordId}`) || freshSettings.api.client.packages.default;
            const packageData = freshSettings.api.client.packages.list[packageName] || {
              ram: 0,
              disk: 0,
              cpu: 0,
              servers: 0
            };
            
            // Get extra resources
            const extraResources = await db.get(`extra-${discordId}`) || {
              ram: 0,
              disk: 0,
              cpu: 0,
              servers: 0
            };
            
            // Calculate total resources (package + extra)
            ram = packageData.ram + extraResources.ram;
            disk = packageData.disk + extraResources.disk;
            cpu = packageData.cpu + extraResources.cpu;
            servers = packageData.servers + extraResources.servers;
          }
          
          // For users without Discord ID, still show default package resources
          if (!discordId) {
            const defaultPackageData = freshSettings.api.client.packages.list[freshSettings.api.client.packages.default] || {
              ram: 0,
              disk: 0,
              cpu: 0,
              servers: 0
            };
            ram = defaultPackageData.ram;
            disk = defaultPackageData.disk;
            cpu = defaultPackageData.cpu;
            servers = defaultPackageData.servers;
          }
          
          users.push({
            id: discordId || `ptero-${user.id}`,
            username: user.username,
            discriminator: user.username.includes('#') ? user.username.split('#')[1] : '0000',
            avatar: 'default',
            email: user.email,
            coins,
            resources: { ram, disk, cpu, servers },
            pterodactylId: user.id,
            package: discordId ? (await db.get(`package-${discordId}`) || freshSettings.api.client.packages.default) : freshSettings.api.client.packages.default
          });

          if (users.length >= 10) break;
        }
      }
      
      res.json({ users });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to search users" });
    }
  });

  // Get all users
  app.get("/admin/users/all", async (req, res) => {
    if (!req.session.userinfo || !req.session.userinfo.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      // Read fresh settings to get latest package configurations
      const freshSettings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));

      // Build a map of Pterodactyl ID -> Discord ID from local database
      const sqlite3 = require('better-sqlite3');
      const dbPath = settings.database.replace('sqlite://', './');
      const dbFile = new sqlite3(dbPath);
      const rows = dbFile.prepare("SELECT key, value FROM keyv WHERE key LIKE 'helium:users-%'").all();
      dbFile.close();
      
      const pteroToDiscord = {};
      const discordToPtero = {};
      rows.forEach(row => {
        const discordId = row.key.replace('helium:users-', '');
        let pteroId;
        try {
          const parsed = JSON.parse(row.value);
          pteroId = parsed.value;
        } catch(e) {
          pteroId = row.value;
        }
        pteroToDiscord[pteroId] = discordId;
        discordToPtero[discordId] = pteroId;
      });
      
      console.log(`Found ${rows.length} users in local database`);
      
      // Fetch ALL users from Pterodactyl
      const userResponse = await fetch(
        `${settings.pterodactyl.domain}/api/application/users?per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${settings.pterodactyl.key}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (!userResponse.ok) {
        console.error('Failed to fetch users from Pterodactyl');
        return res.status(500).json({ error: "Failed to fetch users from Pterodactyl" });
      }
      
      const pterodactylData = await userResponse.json();
      console.log(`Found ${pterodactylData.data.length} users in Pterodactyl`);
      
      const users = [];
      for (const userData of pterodactylData.data) {
        const user = userData.attributes;
        
        // Try to find Discord ID - either from our map or if username is a Discord ID
        let discordId = pteroToDiscord[user.id];
        if (!discordId && /^\d{17,19}$/.test(user.username)) {
          // Username looks like a Discord ID
          discordId = user.username;
        }
        
        // Get coins and resources from local DB if we have a Discord ID
        let coins = 0;
        let ram = 0;
        let disk = 0;
        let cpu = 0;
        let servers = 0;
        
        if (discordId) {
          coins = await db.get(`coins-${discordId}`) || 0;
          
          // Get user's package or use default
          const packageName = await db.get(`package-${discordId}`) || freshSettings.api.client.packages.default;
          const packageData = freshSettings.api.client.packages.list[packageName] || {
            ram: 0,
            disk: 0,
            cpu: 0,
            servers: 0
          };
          
          // Get extra resources
          const extraResources = await db.get(`extra-${discordId}`) || {
            ram: 0,
            disk: 0,
            cpu: 0,
            servers: 0
          };
          
          // Calculate total resources (package + extra)
          ram = packageData.ram + extraResources.ram;
          disk = packageData.disk + extraResources.disk;
          cpu = packageData.cpu + extraResources.cpu;
          servers = packageData.servers + extraResources.servers;
        }
        
        // For users without Discord ID, still show default package resources
        if (!discordId) {
          const defaultPackageData = freshSettings.api.client.packages.list[freshSettings.api.client.packages.default] || {
            ram: 0,
            disk: 0,
            cpu: 0,
            servers: 0
          };
          ram = defaultPackageData.ram;
          disk = defaultPackageData.disk;
          cpu = defaultPackageData.cpu;
          servers = defaultPackageData.servers;
        }
        
        users.push({
          id: discordId || `ptero-${user.id}`,
          username: user.username,
          discriminator: user.username.includes('#') ? user.username.split('#')[1] : '0000',
          avatar: 'default',
          email: user.email,
          coins,
          resources: { ram, disk, cpu, servers },
          pterodactylId: user.id,
          package: discordId ? (await db.get(`package-${discordId}`) || freshSettings.api.client.packages.default) : freshSettings.api.client.packages.default
        });
      }
      
      console.log(`Returning ${users.length} users`);
      res.json({ users });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/settings/update", async (req, res) => {
    // Check if the user is authorized to make changes
    if (!req.session.userinfo || !req.session.userinfo.id) {
      return res.status(403).send("Unauthorized");
    }

    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).send("Unauthorized");
    }

    const setting = req.query.setting;
    let value = req.query.value;

    if (!setting || value === undefined) {
      return res.status(400).send("Missing setting or value parameter");
    }

    try {
      const settingsPath = "./settings.json";
      
      // Use async file operations to avoid blocking
      const settingsData = await fs.promises.readFile(settingsPath, 'utf8');
      const settings = JSON.parse(settingsData);

      // Parse value to appropriate type
      if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      } else if (value === 'null') {
        value = null;
      } else if (!isNaN(value) && value !== '') {
        // Try to parse as number if it looks like a number
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          value = numValue;
        }
      } else if (value.startsWith('[') || value.startsWith('{')) {
        // Try to parse JSON for arrays and objects
        try {
          value = JSON.parse(value);
        } catch (e) {
          // Keep as string if JSON parsing fails
        }
      }

      // Split the setting path by dots and set the value
      const keys = setting.split(".");
      let currentObj = settings;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!currentObj[keys[i]]) {
          currentObj[keys[i]] = {};
        }
        currentObj = currentObj[keys[i]];
      }
      currentObj[keys[keys.length - 1]] = value;

      // Use async write to avoid blocking
      await fs.promises.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
      
      console.log(`[Settings] Updated ${setting} = ${JSON.stringify(value)}`);
      res.send("Settings updated successfully");
    } catch (err) {
      console.error(`[Settings] Error updating ${setting}:`, err);
      res.status(500).send(`Failed to update setting: ${err.message}`);
    }
  });

  app.get("/admin/health/status", async (req, res) => {
    // Check authorization
    if (!req.session.userinfo || !req.session.userinfo.id) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    const isAdmin = await checkAdmin(req, res, db);
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    try {
      const healthStatus = await healthCheck.runHealthChecks(db);
      res.json({ success: true, health: healthStatus });
    } catch (error) {
      console.error('[Health] Error getting health status:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/admin/settings/update", async (req, res) => {
    // Check if the user is authorized to make changes
    if (!req.session.userinfo || !req.session.userinfo.id) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    const isAdmin = await checkAdmin(req, res, db);
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    const { path, value } = req.body;

    if (!path || value === undefined) {
      return res.status(400).json({ success: false, error: "Missing path or value parameter" });
    }

    try {
      const settingsPath = "./settings.json";
      
      // Use async file operations to avoid blocking
      const settingsData = await fs.promises.readFile(settingsPath, 'utf8');
      const settings = JSON.parse(settingsData);

      // Split the path by dots and set the value
      const keys = path.split(".");
      let currentObj = settings;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!currentObj[keys[i]]) {
          currentObj[keys[i]] = {};
        }
        currentObj = currentObj[keys[i]];
      }
      currentObj[keys[keys.length - 1]] = value;

      // Use async write to avoid blocking
      await fs.promises.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
      
      console.log(`[Settings] Updated ${path} = ${JSON.stringify(value)}`);
      
      log(
        'settings updated',
        `${req.session.userinfo.username}#${req.session.userinfo.discriminator} updated ${path} in settings.`
      );
      
      res.json({ success: true, message: "Settings updated successfully" });
    } catch (err) {
      console.error(`[Settings] Error updating ${path}:`, err);
      res.status(500).json({ success: false, error: `Failed to update setting: ${err.message}` });
    }
  });
  
  app.get("/setcoins", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.userinfo || !req.session.userinfo.id) return four0four(req, res, theme);

    if (!(await checkAdmin(req, res, db))) return four0four(req, res, theme);

    let failredirect = theme.settings.redirect.failedsetcoins || "/";

    let id = req.query.id;
    let coins = req.query.coins;

    if (!id) return res.redirect(failredirect + "?err=MISSINGID");
    if (!(await db.get("users-" + req.query.id)))
      return res.redirect(`${failredirect}?err=INVALIDID`);

    if (!coins) return res.redirect(failredirect + "?err=MISSINGCOINS");

    coins = parseFloat(coins);

    if (isNaN(coins))
      return res.redirect(failredirect + "?err=INVALIDCOINNUMBER");

    if (coins < 0 || coins > 999999999999999)
      return res.redirect(`${failredirect}?err=COINSIZE`);

    if (coins == 0) {
      await db.delete("coins-" + id);
    } else {
      await db.set("coins-" + id, coins);
    }

    let successredirect = theme.settings.redirect.setcoins || "/";
    log(
      `set coins`,
      `${req.session.userinfo.username}#${req.session.userinfo.discriminator} set the coins of the user with the ID \`${id}\` to \`${coins}\`.`
    );
    
    // Trigger webhook event for admin action
    const { onAdminAction } = require('../lib/integrations');
    onAdminAction(
      req.session.userinfo.username,
      'Set Coins',
      id,
      [
        { name: 'New Balance', value: coins.toString(), inline: true }
      ]
    ).catch(err => console.error('Webhook error:', err));
    
    res.redirect(successredirect + "?err=none");
  });

  app.get("/addcoins", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.userinfo || !req.session.userinfo.id) return four0four(req, res, theme);

    if (!(await checkAdmin(req, res, db))) return four0four(req, res, theme);

    let failredirect = theme.settings.redirect.failedsetcoins || "/";

    let id = req.query.id;
    let coins = req.query.coins;

    if (!id) return res.redirect(failredirect + "?err=MISSINGID");
    if (!(await db.get("users-" + req.query.id)))
      return res.redirect(`${failredirect}?err=INVALIDID`);

    if (!coins) return res.redirect(failredirect + "?err=MISSINGCOINS");

    let currentcoins = (await db.get("coins-" + id)) || 0;

    coins = currentcoins + parseFloat(coins);

    if (isNaN(coins))
      return res.redirect(failredirect + "?err=INVALIDCOINNUMBER");

    if (coins < 0 || coins > 999999999999999)
      return res.redirect(`${failredirect}?err=COINSIZE`);

    if (coins == 0) {
      await db.delete("coins-" + id);
    } else {
      await db.set("coins-" + id, coins);
    }

    let successredirect = theme.settings.redirect.setcoins || "/";
    log(
      `add coins`,
      `${req.session.userinfo.username}#${req.session.userinfo.discriminator} added \`${req.query.coins}\` coins to the user with the ID \`${id}\`'s account.`
    );
    
    // Trigger webhook event for admin adding coins
    const { onCoinsAdded } = require('../lib/integrations');
    onCoinsAdded(
      id,
      `User ${id}`,
      parseFloat(req.query.coins)
    ).catch(err => console.error('Webhook error:', err));
    res.redirect(successredirect + "?err=none");
  });

  app.get("/setresources", async (req, res) => {
    let theme = indexjs.get(req);

    if (!(await checkAdmin(req, res, db))) return four0four(req, res, theme);

    let failredirect = theme.settings.redirect.failedsetresources || "/";

    if (!req.query.id) return res.redirect(`${failredirect}?err=MISSINGID`);

    if (!(await db.get("users-" + req.query.id)))
      return res.redirect(`${failredirect}?err=INVALIDID`);

    let successredirect = theme.settings.redirect.setresources || "/";

    if (req.query.ram || req.query.disk || req.query.cpu || req.query.servers) {
      let ramstring = req.query.ram;
      let diskstring = req.query.disk;
      let cpustring = req.query.cpu;
      let serversstring = req.query.servers;
      let id = req.query.id;

      let currentextra = await db.get("extra-" + req.query.id);
      let extra;

      if (typeof currentextra == "object") {
        extra = currentextra;
      } else {
        extra = {
          ram: 0,
          disk: 0,
          cpu: 0,
          servers: 0,
        };
      }

      if (ramstring) {
        let ram = parseFloat(ramstring);
        log(`setresources RAM`, `input=${ramstring}, parsed=${ram}, current=${extra.ram}, isNegative=${ram < 0}`);
        if (ram < -999999999999999 || ram > 999999999999999) {
          return res.redirect(`${failredirect}?err=RAMSIZE`);
        }
        // If negative, subtract from current value; otherwise set to exact value
        const newRam = ram < 0 ? Math.max(0, extra.ram + ram) : ram;
        log(`setresources RAM result`, `new value=${newRam} (${ram < 0 ? 'subtract' : 'set'})`);
        extra.ram = newRam;
      }

      if (diskstring) {
        let disk = parseFloat(diskstring);
        console.log(`[setresources] Disk: input=${diskstring}, parsed=${disk}, current=${extra.disk}`);
        if (disk < -999999999999999 || disk > 999999999999999) {
          return res.redirect(`${failredirect}?err=DISKSIZE`);
        }
        // If negative, subtract from current value; otherwise set to exact value
        const newDisk = disk < 0 ? Math.max(0, extra.disk + disk) : disk;
        console.log(`[setresources] Disk: new value=${newDisk} (${disk < 0 ? 'subtract' : 'set'})`);
        extra.disk = newDisk;
      }

      if (cpustring) {
        let cpu = parseFloat(cpustring);
        if (cpu < -999999999999999 || cpu > 999999999999999) {
          return res.redirect(`${failredirect}?err=CPUSIZE`);
        }
        // If negative, subtract from current value; otherwise set to exact value
        extra.cpu = cpu < 0 ? Math.max(0, extra.cpu + cpu) : cpu;
      }

      if (serversstring) {
        let servers = parseFloat(serversstring);
        if (servers < -999999999999999 || servers > 999999999999999) {
          return res.redirect(`${failredirect}?err=SERVERSIZE`);
        }
        // If negative, subtract from current value; otherwise set to exact value
        extra.servers = servers < 0 ? Math.max(0, extra.servers + servers) : servers;
      }

      if (
        extra.ram == 0 &&
        extra.disk == 0 &&
        extra.cpu == 0 &&
        extra.servers == 0
      ) {
        await db.delete("extra-" + req.query.id);
      } else {
        await db.set("extra-" + req.query.id, extra);
      }

      adminjs.suspend(req.query.id);

      log(
        `set resources`,
        `${req.session.userinfo.username}#${req.session.userinfo.discriminator} set the resources of the user with the ID \`${id}\` to:\`\`\`servers: ${serversstring}\nCPU: ${cpustring}%\nMemory: ${ramstring} MB\nDisk: ${diskstring} MB\`\`\``
      );
      
      // Trigger webhook event for admin action
      const { onAdminAction } = require('../lib/integrations');
      const fields = [];
      if (req.query.servers) fields.push({ name: 'Servers', value: serversstring, inline: true });
      if (req.query.cpu) fields.push({ name: 'CPU', value: cpustring + '%', inline: true });
      if (req.query.ram) fields.push({ name: 'RAM', value: ramstring + ' MB', inline: true });
      if (req.query.disk) fields.push({ name: 'Disk', value: diskstring + ' MB', inline: true });
      
      onAdminAction(
        req.session.userinfo.username,
        'Set Resources',
        id,
        fields
      ).catch(err => console.error('Webhook error:', err));
      
      return res.redirect(successredirect + "?err=none");
    } else {
      res.redirect(`${failredirect}?err=MISSINGVARIABLES`);
    }
  });

  app.get("/addresources", async (req, res) => {
    let theme = indexjs.get(req);

    if (!(await checkAdmin(req, res, db))) return four0four(req, res, theme);

    let failredirect = theme.settings.redirect.failedsetresources
      ? theme.settings.redirect.failedsetresources
      : "/";

    if (!req.query.id) return res.redirect(`${failredirect}?err=MISSINGID`);

    if (!(await db.get("users-" + req.query.id)))
      return res.redirect(`${failredirect}?err=INVALIDID`);

    let successredirect = theme.settings.redirect.setresources
      ? theme.settings.redirect.setresources
      : "/";

    if (req.query.ram || req.query.disk || req.query.cpu || req.query.servers) {
      let ramstring = req.query.ram;
      let diskstring = req.query.disk;
      let cpustring = req.query.cpu;
      let serversstring = req.query.servers;

      let currentextra = await db.get("extra-" + req.query.id);
      let extra;

      if (typeof currentextra == "object") {
        extra = currentextra;
      } else {
        extra = {
          ram: 0,
          disk: 0,
          cpu: 0,
          servers: 0,
        };
      }

      if (ramstring) {
        let ram = parseFloat(ramstring);
        if (ram < 0 || ram > 999999999999999) {
          return res.redirect(`${failredirect}?err=RAMSIZE`);
        }
        extra.ram = extra.ram + ram;
      }

      if (diskstring) {
        let disk = parseFloat(diskstring);
        if (disk < 0 || disk > 999999999999999) {
          return res.redirect(`${failredirect}?err=DISKSIZE`);
        }
        extra.disk = extra.disk + disk;
      }

      if (cpustring) {
        let cpu = parseFloat(cpustring);
        if (cpu < 0 || cpu > 999999999999999) {
          return res.redirect(`${failredirect}?err=CPUSIZE`);
        }
        extra.cpu = extra.cpu + cpu;
      }

      if (serversstring) {
        let servers = parseFloat(serversstring);
        if (servers < 0 || servers > 999999999999999) {
          return res.redirect(`${failredirect}?err=SERVERSIZE`);
        }
        extra.servers = extra.servers + servers;
      }

      if (
        extra.ram == 0 &&
        extra.disk == 0 &&
        extra.cpu == 0 &&
        extra.servers == 0
      ) {
        await db.delete("extra-" + req.query.id);
      } else {
        await db.set("extra-" + req.query.id, extra);
      }

      adminjs.suspend(req.query.id);
      return res.redirect(successredirect + "?err=none");
    } else {
      res.redirect(`${failredirect}?err=MISSINGVARIABLES`);
    }
  });

  app.get("/setplan", async (req, res) => {
    let theme = indexjs.get(req);

    if (!(await checkAdmin(req, res, db))) return four0four(req, res, theme);

    let failredirect = theme.settings.redirect.failedsetplan || "/";

    if (!req.query.id) return res.redirect(`${failredirect}?err=MISSINGID`);

    if (!(await db.get("users-" + req.query.id)))
      return res.redirect(`${failredirect}?err=INVALIDID`);

    let successredirect = theme.settings.redirect.setplan || "/";

    if (!req.query.package) {
      await db.delete("package-" + req.query.id);
      adminjs.suspend(req.query.id);

      log(
        `set plan`,
        `${req.session.userinfo.username}#${req.session.userinfo.discriminator} removed the plan of the user with the ID \`${req.query.id}\`.`
      );
      return res.redirect(successredirect + "?err=none");
    } else {
      let newsettings = JSON.parse(
        fs.readFileSync("./settings.json").toString()
      );
      if (!newsettings.api.client.packages.list[req.query.package])
        return res.redirect(`${failredirect}?err=INVALIDPACKAGE`);
      await db.set("package-" + req.query.id, req.query.package);
      adminjs.suspend(req.query.id);

      log(
        `set plan`,
        `${req.session.userinfo.username}#${req.session.userinfo.discriminator} set the plan of the user with the ID \`${req.query.id}\` to \`${req.query.package}\`.`
      );
      return res.redirect(successredirect + "?err=none");
    }
  });

  app.get("/create_coupon", async (req, res) => {
    let theme = indexjs.get(req);

    if (!(await checkAdmin(req, res, db))) return four0four(req, res, theme);

    let code = req.query.code
      ? req.query.code.slice(0, 200)
      : Math.random().toString(36).substring(2, 15);

    if (!code.match(/^[a-z0-9]+$/i))
      return res.redirect(
        theme.settings.redirect.couponcreationfailed +
          "?err=CREATECOUPONINVALIDCHARACTERS"
      );

    let coins = req.query.coins || 0;
    let ram = req.query.ram * 1024 || 0;
    let disk = req.query.disk * 1024 || 0;
    let cpu = req.query.cpu * 100 || 0;
    let servers = req.query.servers || 0;

    coins = parseFloat(coins);
    ram = parseFloat(ram);
    disk = parseFloat(disk);
    cpu = parseFloat(cpu);
    servers = parseFloat(servers);

    if (coins < 0)
      return res.redirect(
        theme.settings.redirect.couponcreationfailed +
          "?err=CREATECOUPONLESSTHANONE"
      );
    if (ram < 0)
      return res.redirect(
        theme.settings.redirect.couponcreationfailed +
          "?err=CREATECOUPONLESSTHANONE"
      );
    if (disk < 0)
      return res.redirect(
        theme.settings.redirect.couponcreationfailed +
          "?err=CREATECOUPONLESSTHANONE"
      );
    if (cpu < 0)
      return res.redirect(
        theme.settings.redirect.couponcreationfailed +
          "?err=CREATECOUPONLESSTHANONE"
      );
    if (servers < 0)
      return res.redirect(
        theme.settings.redirect.couponcreationfailed +
          "?err=CREATECOUPONLESSTHANONE"
      );

    if (!coins && !ram && !disk && !cpu && !servers)
      return res.redirect(
        theme.settings.redirect.couponcreationfailed + "?err=CREATECOUPONEMPTY"
      );

    await db.set("coupon-" + code, {
      coins: coins,
      ram: ram,
      disk: disk,
      cpu: cpu,
      servers: servers,
    });

    log(
      `create coupon`,
      `${req.session.userinfo.username}#${req.session.userinfo.discriminator} created the coupon code \`${code}\` which gives:\`\`\`coins: ${coins}\nMemory: ${ram} MB\nDisk: ${disk} MB\nCPU: ${cpu}%\nServers: ${servers}\`\`\``
    );
    res.redirect(
      theme.settings.redirect.couponcreationsuccess + "?code=" + code
    );
  });

  app.get("/revoke_coupon", async (req, res) => {
    let theme = indexjs.get(req);

    if (!(await checkAdmin(req, res, db))) return four0four(req, res, theme);

    let code = req.query.code;

    if (!code.match(/^[a-z0-9]+$/i))
      return res.redirect(
        theme.settings.redirect.couponrevokefailed +
          "?err=REVOKECOUPONCANNOTFINDCODE"
      );

    if (!(await db.get("coupon-" + code)))
      return res.redirect(
        theme.settings.redirect.couponrevokefailed +
          "?err=REVOKECOUPONCANNOTFINDCODE"
      );

    await db.delete("coupon-" + code);

    log(
      `revoke coupon`,
      `${req.session.userinfo.username}#${req.session.userinfo.discriminator} revoked the coupon code \`${code}\`.`
    );
    res.redirect(
      theme.settings.redirect.couponrevokesuccess + "?revokedcode=true"
    );
  });

  app.get("/remove_account", async (req, res) => {
    let theme = indexjs.get(req);

    if (!(await checkAdmin(req, res, db))) return four0four(req, res, theme);

    // This doesn't delete the account and doesn't touch the renewal system.

    if (!req.query.id)
      return res.redirect(
        theme.settings.redirect.removeaccountfailed +
          "?err=REMOVEACCOUNTMISSINGID"
      );

    let discordid = req.query.id;
    let pteroid = await db.get("users-" + discordid);

    // Remove IP.

    let selected_ip = await db.get("ip-" + discordid);

    if (selected_ip) {
      let allips = (await db.get("ips")) || [];
      allips = allips.filter((ip) => ip !== selected_ip);

      if (allips.length == 0) {
        await db.delete("ips");
      } else {
        await db.set("ips", allips);
      }

      await db.delete("ip-" + discordid);
    }

    // Remove user.

    let userids = (await db.get("users")) || [];
    userids = userids.filter((user) => user !== pteroid);

    if (userids.length == 0) {
      await db.delete("users");
    } else {
      await db.set("users", userids);
    }

    await db.delete("users-" + discordid);

    // Remove coins/resources.

    await db.delete("coins-" + discordid);
    await db.delete("extra-" + discordid);
    await db.delete("package-" + discordid);

    log(
      `remove account`,
      `${req.session.userinfo.username}#${req.session.userinfo.discriminator} removed the account with the ID \`${discordid}\`.`
    );
    res.redirect(
      theme.settings.redirect.removeaccountsuccess + "?success=REMOVEACCOUNT"
    );
  });

  app.get("/getip", async (req, res) => {
    let theme = indexjs.get(req);

    if (!(await checkAdmin(req, res, db))) return four0four(req, res, theme);

    let failredirect = theme.settings.redirect.failedgetip || "/";
    let successredirect = theme.settings.redirect.getip || "/";
    if (!req.query.id) return res.redirect(`${failredirect}?err=MISSINGID`);

    if (!(await db.get("users-" + req.query.id)))
      return res.redirect(`${failredirect}?err=INVALIDID`);

    if (!(await db.get("ip-" + req.query.id)))
      return res.redirect(`${failredirect}?err=NOIP`);
    let ip = await db.get("ip-" + req.query.id);
    log(
      `view ip`,
      `${req.session.userinfo.username}#${req.session.userinfo.discriminator} viewed the IP of the account with the ID \`${req.query.id}\`.`
    );
    return res.redirect(successredirect + "?err=NONE&ip=" + ip);
  });

  app.get("/userinfo", async (req, res) => {
    let theme = indexjs.get(req);

    if (!(await checkAdmin(req, res, db))) return four0four(req, res, theme);

    if (!req.query.id) return res.send({ status: "missing id" });

    if (!(await db.get("users-" + req.query.id)))
      return res.send({ status: "invalid id" });

    let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());

    if (newsettings.api.client.oauth2.link.slice(-1) == "/")
      newsettings.api.client.oauth2.link =
        newsettings.api.client.oauth2.link.slice(0, -1);

    if (newsettings.api.client.oauth2.callbackpath.slice(0, 1) !== "/")
      newsettings.api.client.oauth2.callbackpath =
        "/" + newsettings.api.client.oauth2.callbackpath;

    if (newsettings.pterodactyl.domain.slice(-1) == "/")
      newsettings.pterodactyl.domain = newsettings.pterodactyl.domain.slice(
        0,
        -1
      );

    let packagename = await db.get("package-" + req.query.id);
    let package =
      newsettings.api.client.packages.list[
        packagename ? packagename : newsettings.api.client.packages.default
      ];
    if (!package)
      package = {
        ram: 0,
        disk: 0,
        cpu: 0,
        servers: 0,
      };

    package["name"] = packagename;

    let pterodactylid = await db.get("users-" + req.query.id);
    let userinforeq = await fetch(
      newsettings.pterodactyl.domain +
        "/api/application/users/" +
        pterodactylid +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${newsettings.pterodactyl.key}`,
        },
      }
    );
    if ((await userinforeq.statusText) == "Not Found") {
      console.log(
        "App ― An error has occured while attempting to get a user's information"
      );
      console.log("- Discord ID: " + req.query.id);
      console.log("- Pterodactyl Panel ID: " + pterodactylid);
      return res.send({ status: "could not find user on panel" });
    }
    let userinfo = await userinforeq.json();

    res.send({
      status: "success",
      package: package,
      extra: (await db.get("extra-" + req.query.id))
        ? await db.get("extra-" + req.query.id)
        : {
            ram: 0,
            disk: 0,
            cpu: 0,
            servers: 0,
          },
      userinfo: userinfo,
      coins:
        newsettings.api.client.coins.enabled == true
          ? (await db.get("coins-" + req.query.id))
            ? await db.get("coins-" + req.query.id)
            : 0
          : null,
    });
  });

  async function four0four(req, res, theme) {
    ejs.renderFile(
      `./views/${theme.settings.notfound}`,
      await eval(indexjs.renderdataeval),
      null,
      function (err, str) {
        delete req.session.newaccount;
        if (err) {
          console.log(
            `App ― An error has occured on path ${req._parsedUrl.pathname}:`
          );
          console.log(err);
          return res.send("Internal Server Error");
        }
        res.status(404);
        res.send(str);
      }
    );
  }

  module.exports.suspend = async function (discordid) {
    let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
    if (newsettings.api.client.allow.overresourcessuspend !== true) return;

    let canpass = await indexjs.islimited();
    if (canpass == false) {
      setTimeout(async function () {
        adminjs.suspend(discordid);
      }, 1);
      return;
    }

    indexjs.ratelimits(1);
    let pterodactylid = await db.get("users-" + discordid);
    let userinforeq = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        pterodactylid +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await userinforeq.statusText) == "Not Found") {
      console.log(
        "App ― An error has occured while attempting to check if a user's server should be suspended."
      );
      console.log("- Discord ID: " + discordid);
      console.log("- Pterodactyl Panel ID: " + pterodactylid);
      return;
    }
    let userinfo = JSON.parse(await userinforeq.text());

    let packagename = await db.get("package-" + discordid);
    let package =
      newsettings.api.client.packages.list[
        packagename || newsettings.api.client.packages.default
      ];

    let extra = (await db.get("extra-" + discordid)) || {
      ram: 0,
      disk: 0,
      cpu: 0,
      servers: 0,
    };

    let plan = {
      ram: package.ram + extra.ram,
      disk: package.disk + extra.disk,
      cpu: package.cpu + extra.cpu,
      servers: package.servers + extra.servers,
    };

    let current = {
      ram: 0,
      disk: 0,
      cpu: 0,
      servers: userinfo.attributes.relationships.servers.data.length,
    };
    for (
      let i = 0, len = userinfo.attributes.relationships.servers.data.length;
      i < len;
      i++
    ) {
      current.ram =
        current.ram +
        userinfo.attributes.relationships.servers.data[i].attributes.limits
          .memory;
      current.disk =
        current.disk +
        userinfo.attributes.relationships.servers.data[i].attributes.limits
          .disk;
      current.cpu =
        current.cpu +
        userinfo.attributes.relationships.servers.data[i].attributes.limits.cpu;
    }

    indexjs.ratelimits(userinfo.attributes.relationships.servers.data.length);
    if (
      current.ram > plan.ram ||
      current.disk > plan.disk ||
      current.cpu > plan.cpu ||
      current.servers > plan.servers
    ) {
      for (
        let i = 0, len = userinfo.attributes.relationships.servers.data.length;
        i < len;
        i++
      ) {
        let suspendid =
          userinfo.attributes.relationships.servers.data[i].attributes.id;
        await fetch(
          settings.pterodactyl.domain +
            "/api/application/servers/" +
            suspendid +
            "/suspend",
          {
            method: "post",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${settings.pterodactyl.key}`,
            },
          }
        );
      }
    } else {
      if (settings.api.client.allow.renewsuspendsystem.enabled == true) return;
      for (
        let i = 0, len = userinfo.attributes.relationships.servers.data.length;
        i < len;
        i++
      ) {
        let suspendid =
          userinfo.attributes.relationships.servers.data[i].attributes.id;
        await fetch(
          settings.pterodactyl.domain +
            "/api/application/servers/" +
            suspendid +
            "/unsuspend",
          {
            method: "post",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${settings.pterodactyl.key}`,
            },
          }
        );
      }
    }
  };

  // Admin endpoint to manage server renewals
  app.post("/admin/server/expiry", async (req, res) => {
    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { serverId, expiryDays } = req.body;

    if (!serverId) {
      return res.status(400).json({ error: "Server ID is required" });
    }

    try {
      if (expiryDays === null || expiryDays === undefined || expiryDays === "") {
        // Remove expiration
        await db.delete("server-expiry-" + serverId);
        log(
          "remove server expiry",
          `${req.session.userinfo.username} removed expiration for server ${serverId}`
        );
        return res.json({ success: true, message: "Expiration removed" });
      }

      const days = parseInt(expiryDays);
      if (isNaN(days)) {
        return res.status(400).json({ error: "Invalid days value" });
      }

      const expiryDate = Date.now() + days * 24 * 60 * 60 * 1000;
      await db.set("server-expiry-" + serverId, expiryDate);

      log(
        "set server expiry",
        `${req.session.userinfo.username} set server ${serverId} to expire in ${days} days (${new Date(expiryDate).toISOString()})`
      );

      return res.json({
        success: true,
        message: `Expiration set to ${days} days from now`,
        expiryDate: new Date(expiryDate).toISOString(),
      });
    } catch (error) {
      console.error("Error setting server expiry:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== API KEY MANAGEMENT ====================

  /**
   * GET /admin/api-keys
   * Get all API keys
   */
  app.get("/admin/api-keys", async (req, res) => {
    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const apiKeys = await apiKeyManager.getAllApiKeys();
      res.json({ success: true, data: apiKeys });
    } catch (error) {
      console.error("Error fetching API keys:", error);
      res.status(500).json({ error: "Failed to fetch API keys" });
    }
  });

  /**
   * POST /admin/api-keys/create
   * Create a new API key
   */
  app.post("/admin/api-keys/create", async (req, res) => {
    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const { keyName, permissions } = req.body;

      if (!keyName || !permissions) {
        return res.status(400).json({ error: "Key name and permissions are required" });
      }

      const createdBy = req.session.userinfo.id;
      const apiKey = await apiKeyManager.createApiKey(
        keyName,
        JSON.stringify(permissions),
        createdBy
      );

      log(
        "create api key",
        `${req.session.userinfo.username} created API key: ${keyName}`
      );

      res.json({
        success: true,
        message: "API key created successfully",
        data: apiKey
      });
    } catch (error) {
      console.error("Error creating API key:", error);
      res.status(500).json({ error: "Failed to create API key" });
    }
  });

  /**
   * DELETE /admin/api-keys/:id
   * Delete an API key
   */
  app.delete("/admin/api-keys/:id", async (req, res) => {
    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const keyId = parseInt(req.params.id);
      const success = await apiKeyManager.deleteApiKey(keyId);

      if (success) {
        log(
          "delete api key",
          `${req.session.userinfo.username} deleted API key ID: ${keyId}`
        );
        res.json({ success: true, message: "API key deleted successfully" });
      } else {
        res.status(404).json({ error: "API key not found" });
      }
    } catch (error) {
      console.error("Error deleting API key:", error);
      res.status(500).json({ error: "Failed to delete API key" });
    }
  });

  /**
   * POST /admin/api-keys/:id/toggle
   * Toggle API key enabled status
   */
  app.post("/admin/api-keys/:id/toggle", async (req, res) => {
    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const keyId = parseInt(req.params.id);
      const { enabled } = req.body;

      const success = await apiKeyManager.toggleApiKey(keyId, enabled);

      if (success) {
        log(
          "toggle api key",
          `${req.session.userinfo.username} ${enabled ? "enabled" : "disabled"} API key ID: ${keyId}`
        );
        res.json({ success: true, message: `API key ${enabled ? "enabled" : "disabled"} successfully` });
      } else {
        res.status(404).json({ error: "API key not found" });
      }
    } catch (error) {
      console.error("Error toggling API key:", error);
      res.status(500).json({ error: "Failed to toggle API key" });
    }
  });

  // ==================== DISCORD ROLE CONFIGURATION ====================

  /**
   * GET /admin/discord-roles
   * Get all configured Discord roles
   */
  app.get("/admin/discord-roles", async (req, res) => {
    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const sqlite3 = require('better-sqlite3');
      const dbPath = settings.database.replace('sqlite://', './');
      const dbFile = new sqlite3(dbPath, { readonly: true });
      
      const roles = dbFile.prepare(`
        SELECT * FROM discord_roles 
        ORDER BY created_at DESC
      `).all();
      
      dbFile.close();

      res.json({ success: true, roles });
    } catch (error) {
      console.error("Error fetching Discord roles:", error);
      res.status(500).json({ error: "Failed to fetch Discord roles" });
    }
  });

  /**
   * POST /admin/discord-roles/create
   * Create a new Discord role configuration
   */
  app.post("/admin/discord-roles/create", async (req, res) => {
    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const { roleId, roleName, guildId, rewards } = req.body;

      if (!roleId || !roleName || !guildId) {
        return res.status(400).json({ error: "Missing required fields: roleId, roleName, guildId" });
      }

      const sqlite3 = require('better-sqlite3');
      const dbPath = settings.database.replace('sqlite://', './');
      const dbFile = new sqlite3(dbPath);
      
      const stmt = dbFile.prepare(`
        INSERT INTO discord_roles (
          role_id, role_name, guild_id, rewards_ram, rewards_disk, 
          rewards_cpu, rewards_servers, rewards_coins, enabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `);

      stmt.run(
        roleId,
        roleName,
        guildId,
        rewards?.ram || 0,
        rewards?.disk || 0,
        rewards?.cpu || 0,
        rewards?.servers || 0,
        rewards?.coins || 0
      );

      dbFile.close();

      log(
        "discord role created",
        `${req.session.userinfo.username} created Discord role configuration: ${roleName} (${roleId})`
      );

      res.json({ success: true, message: "Discord role configuration created successfully" });
    } catch (error) {
      console.error("Error creating Discord role:", error);
      if (error.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: "Role ID already exists" });
      } else {
        res.status(500).json({ error: "Failed to create Discord role configuration" });
      }
    }
  });

  /**
   * PUT /admin/discord-roles/:id
   * Update a Discord role configuration
   */
  app.put("/admin/discord-roles/:id", async (req, res) => {
    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const roleConfigId = parseInt(req.params.id);
      const { roleName, rewards, enabled } = req.body;

      const sqlite3 = require('better-sqlite3');
      const dbPath = settings.database.replace('sqlite://', './');
      const dbFile = new sqlite3(dbPath);
      
      const stmt = dbFile.prepare(`
        UPDATE discord_roles 
        SET role_name = ?, rewards_ram = ?, rewards_disk = ?, 
            rewards_cpu = ?, rewards_servers = ?, rewards_coins = ?,
            enabled = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const result = stmt.run(
        roleName,
        rewards?.ram || 0,
        rewards?.disk || 0,
        rewards?.cpu || 0,
        rewards?.servers || 0,
        rewards?.coins || 0,
        enabled ? 1 : 0,
        roleConfigId
      );

      dbFile.close();

      if (result.changes > 0) {
        log(
          "discord role updated",
          `${req.session.userinfo.username} updated Discord role configuration ID: ${roleConfigId}`
        );
        res.json({ success: true, message: "Discord role configuration updated successfully" });
      } else {
        res.status(404).json({ error: "Role configuration not found" });
      }
    } catch (error) {
      console.error("Error updating Discord role:", error);
      res.status(500).json({ error: "Failed to update Discord role configuration" });
    }
  });

  /**
   * DELETE /admin/discord-roles/:id
   * Delete a Discord role configuration
   */
  app.delete("/admin/discord-roles/:id", async (req, res) => {
    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const roleConfigId = parseInt(req.params.id);

      const sqlite3 = require('better-sqlite3');
      const dbPath = settings.database.replace('sqlite://', './');
      const dbFile = new sqlite3(dbPath);
      
      const stmt = dbFile.prepare('DELETE FROM discord_roles WHERE id = ?');
      const result = stmt.run(roleConfigId);

      dbFile.close();

      if (result.changes > 0) {
        log(
          "discord role deleted",
          `${req.session.userinfo.username} deleted Discord role configuration ID: ${roleConfigId}`
        );
        res.json({ success: true, message: "Discord role configuration deleted successfully" });
      } else {
        res.status(404).json({ error: "Role configuration not found" });
      }
    } catch (error) {
      console.error("Error deleting Discord role:", error);
      res.status(500).json({ error: "Failed to delete Discord role configuration" });
    }
  });

  /**
   * POST /admin/discord-roles/:id/toggle
   * Toggle role configuration enabled status
   */
  app.post("/admin/discord-roles/:id/toggle", async (req, res) => {
    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const roleConfigId = parseInt(req.params.id);
      const { enabled } = req.body;

      const sqlite3 = require('better-sqlite3');
      const dbPath = settings.database.replace('sqlite://', './');
      const dbFile = new sqlite3(dbPath);
      
      const stmt = dbFile.prepare(`
        UPDATE discord_roles 
        SET enabled = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const result = stmt.run(enabled ? 1 : 0, roleConfigId);
      dbFile.close();

      if (result.changes > 0) {
        log(
          "discord role toggled",
          `${req.session.userinfo.username} ${enabled ? "enabled" : "disabled"} Discord role configuration ID: ${roleConfigId}`
        );
        res.json({ success: true, message: `Role configuration ${enabled ? "enabled" : "disabled"} successfully` });
      } else {
        res.status(404).json({ error: "Role configuration not found" });
      }
    } catch (error) {
      console.error("Error toggling Discord role:", error);
      res.status(500).json({ error: "Failed to toggle role configuration" });
    }
  });

  /**
   * Ban System Endpoints
   */

  // Get all banned users
  app.get("/admin/bans/list", async (req, res) => {
    if (!req.session.pterodactyl) return res.status(401).json({ error: "Unauthorized" });
    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const BanManager = require("../lib/BanManager");
      const banManager = new BanManager(db, settings);
      const bannedUsers = await banManager.getBannedUsers();

      res.json({
        success: true,
        bans: bannedUsers
      });
    } catch (error) {
      console.error('[Admin] Error listing bans:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Ban a user
  app.post("/admin/bans/ban", async (req, res) => {
    if (!req.session.pterodactyl) return res.status(401).json({ error: "Unauthorized" });
    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const { userId, reason, duration, cleanup } = req.body;

      if (!userId) {
        return res.status(400).json({ success: false, error: "User ID is required" });
      }

      const BanManager = require("../lib/BanManager");
      const banManager = new BanManager(db, settings);
      
      const result = await banManager.banUser(userId, req.session.userinfo.id, {
        reason: reason || "No reason provided",
        duration: duration ? parseInt(duration) : null,
        cleanup: cleanup !== false,
        bannedByUsername: req.session.userinfo.username || 'Admin'
      });

      if (result.success) {
        log(
          "user banned",
          `${req.session.userinfo.username} banned user ${userId}. Reason: ${reason || 'No reason'}`
        );
      }

      res.json(result);
    } catch (error) {
      console.error('[Admin] Error banning user:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Unban a user
  app.post("/admin/bans/unban", async (req, res) => {
    if (!req.session.pterodactyl) return res.status(401).json({ error: "Unauthorized" });
    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const { userId, reason } = req.body;

      if (!userId) {
        return res.status(400).json({ success: false, error: "User ID is required" });
      }

      const BanManager = require("../lib/BanManager");
      const banManager = new BanManager(db, settings);
      
      const result = await banManager.unban(
        userId,
        req.session.userinfo.id,
        reason || "No reason provided"
      );

      if (result.success) {
        log(
          "user unbanned",
          `${req.session.userinfo.username} unbanned user ${userId}. Reason: ${reason || 'No reason'}`
        );
      }

      res.json(result);
    } catch (error) {
      console.error('[Admin] Error unbanning user:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get ban history for a user
  app.get("/admin/bans/history/:userId", async (req, res) => {
    if (!req.session.pterodactyl) return res.status(401).json({ error: "Unauthorized" });
    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const BanManager = require("../lib/BanManager");
      const banManager = new BanManager(db, settings);
      const history = await banManager.getBanHistory(req.params.userId);

      res.json({
        success: true,
        history: history
      });
    } catch (error) {
      console.error('[Admin] Error getting ban history:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Check if user is banned (for admins to check)
  app.get("/admin/bans/check/:userId", async (req, res) => {
    if (!req.session.pterodactyl) return res.status(401).json({ error: "Unauthorized" });
    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const BanManager = require("../lib/BanManager");
      const banManager = new BanManager(db, settings);
      const ban = await banManager.isBanned(req.params.userId);

      res.json({
        success: true,
        banned: !!ban,
        ban: ban
      });
    } catch (error) {
      console.error('[Admin] Error checking ban status:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ==================== SERVER MANAGEMENT ====================

  /**
   * GET /admin/servers/all
   * Get all servers with owner information
   */
  app.get("/admin/servers/all", async (req, res) => {
    if (!req.session.userinfo || !req.session.userinfo.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      // Fetch all servers from Pterodactyl with pagination
      let allServers = [];
      let currentPage = 1;
      let totalPages = 1;

      do {
        const response = await fetch(
          `${settings.pterodactyl.domain}/api/application/servers?include=user&per_page=100&page=${currentPage}`,
          {
            headers: {
              Authorization: `Bearer ${settings.pterodactyl.key}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          return res.status(500).json({ error: "Failed to fetch servers from Pterodactyl" });
        }

        const pterodactylData = await response.json();
        allServers = allServers.concat(pterodactylData.data);
        
        // Get total pages from meta
        totalPages = pterodactylData.meta?.pagination?.total_pages || 1;
        currentPage++;
      } while (currentPage <= totalPages);

      console.log(`[Admin] Fetched ${allServers.length} servers from Pterodactyl`);
      
      // Build map of Pterodactyl user ID to Discord ID
      const sqlite3 = require('better-sqlite3');
      const dbPath = settings.database.replace('sqlite://', './');
      const dbFile = new sqlite3(dbPath);
      const rows = dbFile.prepare("SELECT key, value FROM keyv WHERE key LIKE 'helium:users-%'").all();
      dbFile.close();
      
      const discordToPtero = {};
      const pteroToDiscord = {};
      rows.forEach(row => {
        const discordId = row.key.replace('helium:users-', '');
        let pteroId;
        try {
          const parsed = JSON.parse(row.value);
          pteroId = parsed.value;
        } catch(e) {
          pteroId = row.value;
        }
        discordToPtero[discordId] = pteroId;
        pteroToDiscord[pteroId] = discordId;
      });

      // Process servers
      const servers = [];
      for (const serverData of allServers) {
        const server = serverData.attributes;
        const user = server.relationships?.user?.attributes;
        
        // Find Discord ID
        let discordId = pteroToDiscord[user?.id];
        if (!discordId && user && /^\d{17,19}$/.test(user.username)) {
          discordId = user.username;
        }
        
        // Get expiry time
        const expiryTime = discordId ? await db.get(`server-expiry-${server.id}`) : null;
        
        servers.push({
          id: server.id,
          uuid: server.uuid,
          name: server.name,
          description: server.description,
          suspended: server.suspended,
          memory: server.limits.memory,
          disk: server.limits.disk,
          cpu: server.limits.cpu,
          ownerId: discordId || null,
          ownerUsername: user?.username || 'Unknown',
          ownerEmail: user?.email || null,
          pterodactylOwnerId: user?.id,
          expiryTime: expiryTime || null,
          createdAt: server.created_at,
          updatedAt: server.updated_at
        });
      }

      res.json({ success: true, servers });
    } catch (error) {
      console.error("Error fetching servers:", error);
      res.status(500).json({ error: "Failed to fetch servers" });
    }
  });

  /**
   * POST /admin/servers/renew
   * Renew a server (set expiration)
   */
  app.post("/admin/servers/renew", async (req, res) => {
    if (!req.session.userinfo || !req.session.userinfo.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { serverId, expiryDays } = req.body;

    if (!serverId) {
      return res.status(400).json({ error: "Server ID is required" });
    }

    try {
      // Verify server exists
      const serverResponse = await fetch(
        `${settings.pterodactyl.domain}/api/application/servers/${serverId}`,
        {
          headers: {
            Authorization: `Bearer ${settings.pterodactyl.key}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (!serverResponse.ok) {
        return res.status(404).json({ error: "Server not found" });
      }

      const serverData = await serverResponse.json();
      const serverName = serverData.attributes.name;

      if (expiryDays === null || expiryDays === undefined || expiryDays === "") {
        // Remove expiration
        await db.delete("server-expiry-" + serverId);
        log(
          "remove server expiry",
          `${req.session.userinfo.username} removed expiration for server ${serverName} (ID: ${serverId})`
        );
        return res.json({ success: true, message: "Expiration removed successfully" });
      }

      const days = parseInt(expiryDays);
      if (isNaN(days) || days < 1) {
        return res.status(400).json({ error: "Invalid days value" });
      }

      const expiryDate = Date.now() + days * 24 * 60 * 60 * 1000;
      await db.set("server-expiry-" + serverId, expiryDate);

      log(
        "set server expiry",
        `${req.session.userinfo.username} set server ${serverName} (ID: ${serverId}) to expire in ${days} days (${new Date(expiryDate).toISOString()})`
      );

      return res.json({
        success: true,
        message: `Server expiration set to ${days} days from now`,
        expiryDate: new Date(expiryDate).toISOString(),
      });
    } catch (error) {
      console.error("Error setting server expiry:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * POST /admin/servers/change-resources
   * Change server resources (RAM, Disk, CPU)
   */
  app.post("/admin/servers/change-resources", async (req, res) => {
    if (!req.session.userinfo || !req.session.userinfo.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { serverId, memory, disk, cpu } = req.body;

    if (!serverId || !memory || !disk || !cpu) {
      return res.status(400).json({ error: "Server ID and all resources (memory, disk, cpu) are required" });
    }

    try {
      // Validate resource values
      const memoryInt = parseInt(memory);
      const diskInt = parseInt(disk);
      const cpuInt = parseInt(cpu);

      if (isNaN(memoryInt) || isNaN(diskInt) || isNaN(cpuInt)) {
        return res.status(400).json({ error: "Invalid resource values" });
      }

      if (memoryInt < 128 || diskInt < 128 || cpuInt < 10) {
        return res.status(400).json({ error: "Resources below minimum values (Memory: 128MB, Disk: 128MB, CPU: 10%)" });
      }

      // Get server info
      const serverResponse = await fetch(
        `${settings.pterodactyl.domain}/api/application/servers/${serverId}`,
        {
          headers: {
            Authorization: `Bearer ${settings.pterodactyl.key}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (!serverResponse.ok) {
        return res.status(404).json({ error: "Server not found" });
      }

      const serverData = await serverResponse.json();
      const serverName = serverData.attributes.name;
      const oldResources = serverData.attributes.limits;

      // Update server build (resources)
      const updateResponse = await fetch(
        `${settings.pterodactyl.domain}/api/application/servers/${serverId}/build`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${settings.pterodactyl.key}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            memory: memoryInt,
            disk: diskInt,
            cpu: cpuInt,
            swap: serverData.attributes.limits.swap || 0,
            io: serverData.attributes.limits.io || 500,
            threads: serverData.attributes.limits.threads || null
          }),
        }
      );

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error("Failed to update server resources:", errorText);
        return res.status(500).json({ error: "Failed to update server resources on Pterodactyl" });
      }

      log(
        "change server resources",
        `${req.session.userinfo.username} changed resources for server ${serverName} (ID: ${serverId})\nOld: RAM ${oldResources.memory}MB, Disk ${oldResources.disk}MB, CPU ${oldResources.cpu}%\nNew: RAM ${memoryInt}MB, Disk ${diskInt}MB, CPU ${cpuInt}%`
      );

      return res.json({
        success: true,
        message: `Server resources updated successfully. Server should be restarted for changes to take effect.`,
      });
    } catch (error) {
      console.error("Error changing server resources:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * POST /admin/servers/change-owner
   * Change the owner of a server
   */
  app.post("/admin/servers/change-owner", async (req, res) => {
    if (!req.session.userinfo || !req.session.userinfo.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { serverId, newOwnerId } = req.body;

    if (!serverId || !newOwnerId) {
      return res.status(400).json({ error: "Server ID and new owner ID are required" });
    }

    try {
      // Check if new owner exists in our system
      const newPteroId = await db.get(`users-${newOwnerId}`);
      if (!newPteroId) {
        return res.status(404).json({ error: "New owner not found in the system. User must be registered first." });
      }

      // Verify new owner exists on Pterodactyl
      const userResponse = await fetch(
        `${settings.pterodactyl.domain}/api/application/users/${newPteroId}`,
        {
          headers: {
            Authorization: `Bearer ${settings.pterodactyl.key}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (!userResponse.ok) {
        return res.status(404).json({ error: "New owner not found on Pterodactyl panel" });
      }

      // Get server info
      const serverResponse = await fetch(
        `${settings.pterodactyl.domain}/api/application/servers/${serverId}`,
        {
          headers: {
            Authorization: `Bearer ${settings.pterodactyl.key}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (!serverResponse.ok) {
        return res.status(404).json({ error: "Server not found" });
      }

      const serverData = await serverResponse.json();
      const serverName = serverData.attributes.name;
      const oldOwnerId = serverData.attributes.user;

      // Update server owner on Pterodactyl
      const updateResponse = await fetch(
        `${settings.pterodactyl.domain}/api/application/servers/${serverId}/details`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${settings.pterodactyl.key}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            user: parseInt(newPteroId),
            name: serverData.attributes.name,
            external_id: serverData.attributes.external_id
          }),
        }
      );

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error("Failed to update server owner:", errorText);
        return res.status(500).json({ error: "Failed to update server owner on Pterodactyl" });
      }

      // Find old owner's Discord ID and mark their sessions for refresh
      const sqlite3 = require('better-sqlite3');
      const dbPath = settings.database.replace('sqlite://', './');
      const dbFile = new sqlite3(dbPath);
      const sessionRows = dbFile.prepare("SELECT key, value FROM keyv WHERE key LIKE 'helium:users-%'").all();
      
      let oldOwnerDiscordId = null;
      for (const row of sessionRows) {
        let pteroId;
        try {
          const parsed = JSON.parse(row.value);
          pteroId = parsed.value;
        } catch(e) {
          pteroId = row.value;
        }
        if (pteroId == oldOwnerId) {
          oldOwnerDiscordId = row.key.replace('helium:users-', '');
          break;
        }
      }

      // Mark both users' sessions as needing refresh
      if (oldOwnerDiscordId) {
        await db.set(`session-refresh-${oldOwnerDiscordId}`, {
          reason: 'server_ownership_changed',
          serverId: serverId,
          serverName: serverName,
          message: `Server "${serverName}" is no longer yours. It was transferred to another user.`,
          timestamp: Date.now()
        });
      }
      
      await db.set(`session-refresh-${newOwnerId}`, {
        reason: 'server_ownership_changed',
        serverId: serverId,
        serverName: serverName,
        message: `Server "${serverName}" has been transferred to you. Click "Refresh List" to see it.`,
        timestamp: Date.now()
      });

      dbFile.close();

      log(
        "change server owner",
        `${req.session.userinfo.username} changed owner of server ${serverName} (ID: ${serverId}) from Pterodactyl User ${oldOwnerId}${oldOwnerDiscordId ? ` (Discord: ${oldOwnerDiscordId})` : ''} to Discord User ${newOwnerId} (Pterodactyl User ${newPteroId})`
      );

      return res.json({
        success: true,
        message: `Server owner changed successfully. Users will be notified to refresh their server list.`,
        oldOwnerDiscordId: oldOwnerDiscordId,
        newOwnerDiscordId: newOwnerId
      });
    } catch (error) {
      console.error("Error changing server owner:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
};

function hexToDecimal(hex) {
  return parseInt(hex.replace("#", ""), 16);
}
