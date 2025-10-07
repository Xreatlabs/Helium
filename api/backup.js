/**
 * Backup API Endpoints
 * 
 * Provides endpoints for manual backup management
 */

const BackupManager = require("../managers/BackupManager");
const log = require("../misc/log");

async function checkAdmin(req, res, db) {
  if (!req.session || !req.session.userinfo || !req.session.userinfo.id) {
    return false;
  }
  const isRootAdminSession = !!(req.session.pterodactyl && req.session.pterodactyl.root_admin === true);
  if (isRootAdminSession) return true;
  const adminStatus = await db.get(`admin-${req.session.userinfo.id}`);
  return adminStatus === 1 || adminStatus === true || adminStatus === "1" || adminStatus === "true";
}

module.exports.load = async function (app, db) {
  const settings = require("../settings.json");
  const backupManager = new BackupManager(db, settings);

  // List all backups
  app.get("/admin/backups/list", async (req, res) => {
    if (!req.session.pterodactyl) return res.status(401).json({ error: "Unauthorized" });
    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const backups = await backupManager.listBackups();
      const stats = await backupManager.getStats();

      res.json({
        success: true,
        backups: backups,
        stats: stats,
        config: {
          enabled: settings.backup?.enabled || false,
          automatic: settings.backup?.automatic || false,
          schedule: settings.backup?.schedule || 'daily',
          maxBackups: settings.backup?.maxBackups || 10,
        },
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create a manual backup
  app.post("/admin/backups/create", async (req, res) => {
    if (!req.session.pterodactyl) return res.status(401).json({ error: "Unauthorized" });
    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const { name } = req.body;
      const result = await backupManager.createBackup(name);

      if (result.success) {
        log(
          "backup created",
          `${req.session.userinfo.username} created a manual backup: ${result.backup.name}`
        );
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Restore a backup
  app.post("/admin/backups/restore", async (req, res) => {
    if (!req.session.pterodactyl) return res.status(401).json({ error: "Unauthorized" });
    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const { backupName } = req.body;

      if (!backupName) {
        return res.status(400).json({ success: false, error: "Backup name is required" });
      }

      const result = await backupManager.restoreBackup(backupName);

      if (result.success) {
        log(
          "backup restored",
          `${req.session.userinfo.username} restored backup: ${backupName}`
        );
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Delete a backup
  app.delete("/admin/backups/delete/:backupName", async (req, res) => {
    if (!req.session.pterodactyl) return res.status(401).json({ error: "Unauthorized" });
    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const backupName = req.params.backupName;
      const result = await backupManager.deleteBackup(backupName);

      if (result.success) {
        log(
          "backup deleted",
          `${req.session.userinfo.username} deleted backup: ${backupName}`
        );
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Download a backup
  app.get("/admin/backups/download/:backupName", async (req, res) => {
    if (!req.session.pterodactyl) return res.status(401).send("Unauthorized");
    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).send("Unauthorized");
    }

    try {
      const backupName = req.params.backupName;
      const backupPath = require("path").join(
        backupManager.backupPath,
        `${backupName}.sqlite`
      );

      if (!require("fs").existsSync(backupPath)) {
        return res.status(404).send("Backup not found");
      }

      res.download(backupPath, `${backupName}.sqlite`, (err) => {
        if (err) {
          console.error("Error downloading backup:", err);
        } else {
          log(
            "backup downloaded",
            `${req.session.userinfo.username} downloaded backup: ${backupName}`
          );
        }
      });
    } catch (error) {
      res.status(500).send(error.message);
    }
  });

  // Get backup statistics
  app.get("/admin/backups/stats", async (req, res) => {
    if (!req.session.pterodactyl) return res.status(401).json({ error: "Unauthorized" });
    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const stats = await backupManager.getStats();
      res.json({ success: true, stats: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Verify a backup
  app.post("/admin/backups/verify", async (req, res) => {
    if (!req.session.pterodactyl) return res.status(401).json({ error: "Unauthorized" });
    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const { backupName } = req.body;

      if (!backupName) {
        return res.status(400).json({ success: false, error: "Backup name is required" });
      }

      const result = await backupManager.verifyBackup(backupName);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get backup system status
  app.get("/admin/backups/status", async (req, res) => {
    if (!req.session.pterodactyl) return res.status(401).json({ error: "Unauthorized" });
    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const status = backupManager.getStatus();
      res.json({ success: true, status: status });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
};
