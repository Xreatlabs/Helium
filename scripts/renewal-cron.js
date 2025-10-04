/**
 * Server Renewal Cron Job
 * 
 * This script runs periodically to check for expired servers
 * and suspend/delete them based on the renewal system configuration.
 */

const CronJob = require("cron").CronJob;
const fetch = require("node-fetch");
const chalk = require("chalk");

module.exports = function (db, settings) {
  // Run every hour
  const job = new CronJob(
    "0 * * * *",
    async function () {
      try {
        if (!settings.api.client.allow.renewsuspendsystem?.enabled) {
          return;
        }

        console.log(chalk.blue("Renewal Cron: Checking for expired servers..."));

        const renewalConfig = settings.api.client.allow.renewsuspendsystem;
        const now = Date.now();
        const graceMs = renewalConfig.graceperiod * 24 * 60 * 60 * 1000;
        const deletionMs = renewalConfig.deletionperiod * 24 * 60 * 60 * 1000;

        // Get all server expiry keys
        const allKeys = [];
        try {
          // Since Keyv doesn't have a keys() method, we'll use the underlying sqlite store
          const Database = require("better-sqlite3");
          const dbPath = settings.database.replace("sqlite://", "");
          const sqliteDb = new Database(dbPath);
          
          const rows = sqliteDb
            .prepare("SELECT key FROM keyv WHERE key LIKE ? AND value IS NOT NULL")
            .all("%server-expiry-%");
          
          for (const row of rows) {
            // Remove the namespace prefix if it exists
            const key = row.key.replace(/^helium:/, "");
            allKeys.push(key);
          }
          
          sqliteDb.close();
        } catch (err) {
          console.error(chalk.red("Renewal Cron: Error fetching server keys:"), err);
          return;
        }

        let suspendedCount = 0;
        let deletedCount = 0;
        let warningCount = 0;
        let autoRenewedCount = 0;

        for (const key of allKeys) {
          try {
            const expiryTime = await db.get(key);
            if (!expiryTime) continue;

            const serverId = key.replace("server-expiry-", "");
            const timeSinceExpiry = now - expiryTime;

            // Check for auto-renewal first (if enabled and server is expired)
            if (
              renewalConfig.autorenewal &&
              timeSinceExpiry > 0 &&
              timeSinceExpiry <= graceMs
            ) {
              const autoRenewEnabled = await db.get("server-autorenewal-" + serverId);
              if (autoRenewEnabled) {
                // Find the server owner
                const ownerKey = await findServerOwner(serverId, db);
                if (ownerKey) {
                  const userCoins = (await db.get("coins-" + ownerKey)) || 0;
                  const renewalCost = renewalConfig.renewalcost;

                  if (userCoins >= renewalCost) {
                    // Deduct coins
                    await db.set("coins-" + ownerKey, userCoins - renewalCost);
                    
                    // Extend expiration
                    const newExpiry = now + (renewalConfig.renewalperiod * 24 * 60 * 60 * 1000);
                    await db.set("server-expiry-" + serverId, newExpiry);
                    
                    autoRenewedCount++;
                    console.log(
                      chalk.green(`Renewal Cron: Auto-renewed server ${serverId} for user ${ownerKey}`)
                    );

                    // Trigger webhook
                    try {
                      const { triggerEvent } = require("../lib/integrations");
                      await triggerEvent("server.renewed", {
                        serverId: serverId,
                        userId: ownerKey,
                        coinsSpent: renewalCost,
                        newExpiry: new Date(newExpiry).toISOString(),
                        automatic: true,
                      });
                    } catch (err) {
                      console.error("Webhook error:", err);
                    }
                    
                    // Skip to next server since this one is renewed
                    continue;
                  } else {
                    // Not enough coins - disable auto-renewal
                    await db.delete("server-autorenewal-" + serverId);
                    console.log(
                      chalk.yellow(`Renewal Cron: Disabled auto-renewal for server ${serverId} - insufficient coins`)
                    );
                  }
                }
              }
            }

            // Check if server should be deleted (if deletion is enabled)
            if (
              renewalConfig.deletionperiod > 0 &&
              timeSinceExpiry > graceMs + deletionMs
            ) {
              const isSuspended = await db.get("server-suspended-" + serverId);
              if (isSuspended) {
                await deleteServer(serverId, settings, db);
                deletedCount++;
                console.log(
                  chalk.yellow(`Renewal Cron: Deleted expired server ${serverId}`)
                );
              }
            }
            // Check if server should be suspended
            else if (renewalConfig.autosuspend && timeSinceExpiry > graceMs) {
              const isSuspended = await db.get("server-suspended-" + serverId);
              if (!isSuspended) {
                await suspendServer(serverId, settings, db);
                suspendedCount++;
                console.log(
                  chalk.yellow(`Renewal Cron: Suspended expired server ${serverId}`)
                );
              }
            }
            // Check if server is expiring soon (within 3 days)
            else if (expiryTime - now < 3 * 24 * 60 * 60 * 1000 && expiryTime > now) {
              warningCount++;
            }
          } catch (err) {
            console.error(
              chalk.red(`Renewal Cron: Error processing ${key}:`),
              err
            );
          }
        }

        if (suspendedCount > 0 || deletedCount > 0 || warningCount > 0 || autoRenewedCount > 0) {
          console.log(
            chalk.green(
              `Renewal Cron: Processed ${allKeys.length} servers - ${autoRenewedCount} auto-renewed, ${suspendedCount} suspended, ${deletedCount} deleted, ${warningCount} expiring soon`
            )
          );
        }
      } catch (error) {
        console.error(chalk.red("Renewal Cron: Fatal error:"), error);
      }
    },
    null,
    true,
    settings.timezone || "UTC"
  );

  console.log(chalk.green("Renewal Cron: Job started - checking every hour"));
  return job;
};

async function suspendServer(serverId, settings, db) {
  try {
    const response = await fetch(
      `${settings.pterodactyl.domain}/api/application/servers/${serverId}/suspend`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${settings.pterodactyl.key}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    if (response.ok || response.status === 204) {
      await db.set("server-suspended-" + serverId, true);

      // Trigger webhook event
      try {
        const { triggerEvent } = require("../lib/integrations");
        await triggerEvent("server.suspended", {
          serverId: serverId,
          reason: "Server expired and grace period ended",
          automatic: true,
        });
      } catch (err) {
        console.error("Webhook error:", err);
      }

      return true;
    } else {
      console.error(
        `Failed to suspend server ${serverId}: ${response.status} ${response.statusText}`
      );
      return false;
    }
  } catch (error) {
    console.error(`Error suspending server ${serverId}:`, error);
    return false;
  }
}

async function deleteServer(serverId, settings, db) {
  try {
    const response = await fetch(
      `${settings.pterodactyl.domain}/api/application/servers/${serverId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${settings.pterodactyl.key}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    if (response.ok || response.status === 204) {
      // Clean up database entries
      await db.delete("server-expiry-" + serverId);
      await db.delete("server-suspended-" + serverId);

      // Trigger webhook event
      try {
        const { triggerEvent } = require("../lib/integrations");
        await triggerEvent("server.deleted", {
          serverId: serverId,
          reason: "Server auto-deleted after suspension period",
          automatic: true,
        });
      } catch (err) {
        console.error("Webhook error:", err);
      }

      return true;
    } else {
      console.error(
        `Failed to delete server ${serverId}: ${response.status} ${response.statusText}`
      );
      return false;
    }
  } catch (error) {
    console.error(`Error deleting server ${serverId}:`, error);
    return false;
  }
}

async function findServerOwner(serverId, db) {
  try {
    const settings = require("../settings.json");
    const fetch = require("node-fetch");
    
    // Fetch server details from Pterodactyl to get user ID
    try {
      const response = await fetch(
        `${settings.pterodactyl.domain}/api/application/servers/${serverId}?include=user`,
        {
          headers: {
            Authorization: `Bearer ${settings.pterodactyl.key}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const pteroUserId = data.attributes.user;
        
        // Find the Discord ID mapped to this Pterodactyl user
        const Database = require("better-sqlite3");
        const dbPath = settings.database.replace("sqlite://", "");
        const sqliteDb = new Database(dbPath);
        
        const userRows = sqliteDb
          .prepare("SELECT key, value FROM keyv WHERE key LIKE ?")
          .all("%helium:users-%");
        
        for (const row of userRows) {
          try {
            const userData = JSON.parse(row.value);
            if (userData.value === pteroUserId) {
              const discordId = row.key.replace("helium:users-", "");
              sqliteDb.close();
              return discordId;
            }
          } catch (e) {}
        }
        sqliteDb.close();
      }
    } catch (err) {
      console.error("Error fetching server owner:", err);
    }
    
    return null;
  } catch (err) {
    console.error("Error in findServerOwner:", err);
    return null;
  }
}
