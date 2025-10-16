/**
 * Dashboard API Routes
 * Comprehensive API system for Discord bot and external integrations
 */

const { requireApiKey } = require('../middleware/apiAuth');
const settings = require('../settings.json');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const log = require('../misc/log');

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
  
  // ==================== SETTINGS MANAGEMENT ====================
  
  /**
   * POST /admin/settings/update
   * Update settings.json dynamically
   */
  app.post('/admin/settings/update', async (req, res) => {
    if (!req.session.pterodactyl) return res.status(401).json({ error: "Unauthorized" });
    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const { path: settingPath, value } = req.body;
      
      if (!settingPath) {
        return res.status(400).json({ success: false, error: "Setting path is required" });
      }

      // Read current settings
      const settingsPath = path.resolve('./settings.json');
      const currentSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

      // Update the setting using path notation (e.g., "backup.enabled")
      const pathParts = settingPath.split('.');
      let target = currentSettings;
      
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!target[pathParts[i]]) {
          target[pathParts[i]] = {};
        }
        target = target[pathParts[i]];
      }
      
      target[pathParts[pathParts.length - 1]] = value;

      // Write back to settings.json
      fs.writeFileSync(settingsPath, JSON.stringify(currentSettings, null, 2));

      res.json({ 
        success: true, 
        message: "Setting updated successfully",
        requiresRestart: true 
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ==================== USER MANAGEMENT ====================
  
  /**
   * GET /api/dashboard/users/:discordId
   * Get user information by Discord ID
   */
  app.get('/api/dashboard/users/:discordId', requireApiKey(['users.read', '*']), async (req, res) => {
    try {
      const discordId = req.params.discordId;
      const pterodactylId = await db.get(`users-${discordId}`);
      
      if (!pterodactylId) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found in database'
        });
      }

      const packageName = await db.get(`package-${discordId}`);
      const coins = await db.get(`coins-${discordId}`) || 0;
      const extraResources = await db.get(`extra-${discordId}`) || {
        ram: 0, disk: 0, cpu: 0, servers: 0
      };
      const isAdmin = await db.get(`admin-${discordId}`) || false;

      const userResponse = await fetch(
        `${settings.pterodactyl.domain}/api/application/users/${pterodactylId}?include=servers`,
        {
          headers: {
            'Authorization': `Bearer ${settings.pterodactyl.key}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!userResponse.ok) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found on Pterodactyl panel'
        });
      }

      const userData = await userResponse.json();

      res.json({
        success: true,
        data: {
          discordId,
          pterodactylId,
          packageName,
          coins,
          extraResources,
          isAdmin,
          pterodactylUser: userData.attributes
        }
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });

  /**
   * POST /api/dashboard/users/:discordId/resources
   * Update user resources (extra resources)
   */
  app.post('/api/dashboard/users/:discordId/resources', requireApiKey(['users.write', '*']), async (req, res) => {
    try {
      const discordId = req.params.discordId;
      const { ram, disk, cpu, servers } = req.body;

      const pterodactylId = await db.get(`users-${discordId}`);
      if (!pterodactylId) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found'
        });
      }

      const currentExtra = await db.get(`extra-${discordId}`) || {
        ram: 0, disk: 0, cpu: 0, servers: 0
      };

      const newExtra = {
        ram: typeof ram === 'number' ? ram : currentExtra.ram,
        disk: typeof disk === 'number' ? disk : currentExtra.disk,
        cpu: typeof cpu === 'number' ? cpu : currentExtra.cpu,
        servers: typeof servers === 'number' ? servers : currentExtra.servers
      };

      await db.set(`extra-${discordId}`, newExtra);

      res.json({
        success: true,
        message: 'Resources updated successfully',
        data: newExtra
      });
    } catch (error) {
      console.error('Error updating resources:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });

  /**
   * POST /api/dashboard/users/:discordId/coins
   * Update user coins
   */
  app.post('/api/dashboard/users/:discordId/coins', requireApiKey(['users.write', '*']), async (req, res) => {
    try {
      const discordId = req.params.discordId;
      const { coins, action } = req.body;

      if (typeof coins !== 'number') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Coins must be a number'
        });
      }

      const pterodactylId = await db.get(`users-${discordId}`);
      if (!pterodactylId) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found'
        });
      }

      let newCoins = coins;
      
      if (action === 'add' || action === 'subtract') {
        const currentCoins = await db.get(`coins-${discordId}`) || 0;
        newCoins = action === 'add' ? currentCoins + coins : currentCoins - coins;
        newCoins = Math.max(0, newCoins);
      }

      await db.set(`coins-${discordId}`, newCoins);

      res.json({
        success: true,
        message: 'Coins updated successfully',
        data: { coins: newCoins }
      });
    } catch (error) {
      console.error('Error updating coins:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });

  /**
   * POST /api/dashboard/users/:discordId/package
   * Update user package/plan
   */
  app.post('/api/dashboard/users/:discordId/package', requireApiKey(['users.write', '*']), async (req, res) => {
    try {
      const discordId = req.params.discordId;
      const { packageName } = req.body;

      const pterodactylId = await db.get(`users-${discordId}`);
      if (!pterodactylId) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found'
        });
      }

      if (!packageName) {
        await db.delete(`package-${discordId}`);
      } else {
        if (!settings.api.client.packages.list[packageName]) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid package name'
          });
        }
        await db.set(`package-${discordId}`, packageName);
      }

      res.json({
        success: true,
        message: 'Package updated successfully',
        data: { packageName }
      });
    } catch (error) {
      console.error('Error updating package:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });

  /**
   * POST /api/dashboard/users/:discordId/purchase
   * Purchase resources from the store (deducts coins and adds resources)
   */
  app.post('/api/dashboard/users/:discordId/purchase', requireApiKey(['users.write', '*']), async (req, res) => {
    try {
      const discordId = req.params.discordId;
      const { type, amount } = req.body;

      // Validate inputs
      const validTypes = ['ram', 'disk', 'cpu', 'servers'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid resource type. Must be: ram, disk, cpu, or servers'
        });
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount < 1) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Amount must be a number greater than 0'
        });
      }

      // Check if store is enabled
      if (!settings.api.client.coins.store.enabled) {
        return res.status(503).json({
          error: 'Service Unavailable',
          message: 'Store is currently disabled'
        });
      }

      const pterodactylId = await db.get(`users-${discordId}`);
      if (!pterodactylId) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found'
        });
      }

      // Get user coins
      const userCoins = (await db.get(`coins-${discordId}`)) || 0;

      // Get store configuration
      const { per, cost } = settings.api.client.coins.store[type];
      const purchaseCost = cost * parsedAmount;
      const resourceAmount = per * parsedAmount;

      // Check if user has enough coins
      if (userCoins < purchaseCost) {
        return res.status(400).json({
          error: 'Insufficient Funds',
          message: `Not enough coins. Need ${purchaseCost} coins, have ${userCoins} coins`,
          data: {
            required: purchaseCost,
            available: userCoins,
            shortage: purchaseCost - userCoins
          }
        });
      }

      // Deduct coins
      const newUserCoins = userCoins - purchaseCost;
      if (newUserCoins === 0) {
        await db.delete(`coins-${discordId}`);
      } else {
        await db.set(`coins-${discordId}`, newUserCoins);
      }

      // Add resources
      const extra = (await db.get(`extra-${discordId}`)) || {
        ram: 0,
        disk: 0,
        cpu: 0,
        servers: 0
      };

      extra[type] = (extra[type] || 0) + resourceAmount;

      await db.set(`extra-${discordId}`, extra);

      // Suspend user to refresh resources
      const adminjs = require('./admin.js');
      adminjs.suspend(discordId);

      res.json({
        success: true,
        message: 'Purchase successful',
        data: {
          resourceType: type,
          resourceAmount: resourceAmount,
          cost: purchaseCost,
          remainingCoins: newUserCoins,
          newTotal: extra[type]
        }
      });
    } catch (error) {
      console.error('Error processing purchase:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });

  /**
   * POST /api/dashboard/users/:discordId/reset
   * Reset user account to default values
   */
  app.post('/api/dashboard/users/:discordId/reset', requireApiKey(['users.write', '*']), async (req, res) => {
    try {
      const discordId = req.params.discordId;
      const { keepServers } = req.body;

      const pterodactylId = await db.get(`users-${discordId}`);
      if (!pterodactylId) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found'
        });
      }

      // Reset coins to 0
      await db.set(`coins-${discordId}`, 0);

      // Reset extra resources to 0
      await db.set(`extra-${discordId}`, {
        ram: 0,
        disk: 0,
        cpu: 0,
        servers: 0
      });

      // Reset package to default
      await db.set(`package-${discordId}`, settings.api.client.packages.default);

      // Delete servers if requested
      if (!keepServers) {
        try {
          // Get user's servers
          const serverResponse = await fetch(
            `${settings.pterodactyl.domain}/api/application/users/${pterodactylId}?include=servers`,
            {
              headers: {
                'Authorization': `Bearer ${settings.pterodactyl.key}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              }
            }
          );

          if (serverResponse.ok) {
            const userData = await serverResponse.json();
            const servers = userData.attributes?.relationships?.servers?.data || [];

            // Delete each server
            for (const server of servers) {
              try {
                await fetch(
                  `${settings.pterodactyl.domain}/api/application/servers/${server.attributes.id}`,
                  {
                    method: 'DELETE',
                    headers: {
                      'Authorization': `Bearer ${settings.pterodactyl.key}`,
                      'Content-Type': 'application/json',
                      'Accept': 'application/json'
                    }
                  }
                );
              } catch (err) {
                console.error(`Failed to delete server ${server.attributes.id}:`, err);
              }
            }
          }
        } catch (err) {
          console.error('Error deleting servers during reset:', err);
        }
      }

      res.json({
        success: true,
        message: 'User account reset successfully',
        data: {
          discordId: discordId,
          serversDeleted: !keepServers
        }
      });
    } catch (error) {
      console.error('Error resetting user:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });

  // ==================== SERVER MANAGEMENT ====================
  
  /**
   * GET /api/dashboard/servers
   * List all servers (with optional user filter)
   */
  app.get('/api/dashboard/servers', requireApiKey(['servers.read', '*']), async (req, res) => {
    try {
      const { discordId, page = 1, perPage = 50 } = req.query;

      // If discordId is provided, get servers via user endpoint
      if (discordId) {
        const pterodactylId = await db.get(`users-${discordId}`);
        if (!pterodactylId) {
          return res.status(404).json({
            error: 'Not Found',
            message: 'User not found'
          });
        }

        // Use the user endpoint to get their servers
        const response = await fetch(
          `${settings.pterodactyl.domain}/api/application/users/${pterodactylId}?include=servers`,
          {
            headers: {
              'Authorization': `Bearer ${settings.pterodactyl.key}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return res.status(response.status).json({
            error: 'Pterodactyl API Error',
            message: 'Failed to fetch user servers',
            details: errorText
          });
        }

        const userData = await response.json();
        
        // Extract servers from user data
        const servers = userData.attributes?.relationships?.servers?.data || [];
        
        // Format response to match expected structure
        res.json({
          success: true,
          data: {
            object: 'list',
            data: servers,
            meta: {
              pagination: {
                total: servers.length,
                count: servers.length,
                per_page: servers.length,
                current_page: 1,
                total_pages: 1
              }
            }
          }
        });
      } else {
        // Get all servers (no filter)
        const url = `${settings.pterodactyl.domain}/api/application/servers?page=${page}&per_page=${perPage}`;
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${settings.pterodactyl.key}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          return res.status(response.status).json({
            error: 'Pterodactyl API Error',
            message: 'Failed to fetch servers',
            details: errorText
          });
        }

        const data = await response.json();

        res.json({
          success: true,
          data: data
        });
      }
    } catch (error) {
      console.error('Error fetching servers:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });

  /**
   * GET /api/dashboard/servers/:serverId
   * Get server details by ID
   */
  app.get('/api/dashboard/servers/:serverId', requireApiKey(['servers.read', '*']), async (req, res) => {
    try {
      const serverId = req.params.serverId;

      const response = await fetch(
        `${settings.pterodactyl.domain}/api/application/servers/${serverId}?include=allocations,user`,
        {
          headers: {
            'Authorization': `Bearer ${settings.pterodactyl.key}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Server not found'
        });
      }

      const data = await response.json();

      res.json({
        success: true,
        data: data.attributes
      });
    } catch (error) {
      console.error('Error fetching server:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });

  /**
   * POST /api/dashboard/servers/:serverId/power
   * Send power action to server (start, stop, restart, kill)
   * Supports two methods:
   * 1. Global: Configure clientKey in settings.json (easier setup)
   * 2. Per-request: Pass pteroKey in request body (more flexible)
   */
  app.post('/api/dashboard/servers/:serverId/power', requireApiKey(['servers.control', '*']), async (req, res) => {
    try {
      const serverId = req.params.serverId;
      const { action, identifier, pteroKey } = req.body;

      const validActions = ['start', 'stop', 'restart', 'kill'];
      if (!validActions.includes(action)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: `Invalid action. Must be one of: ${validActions.join(', ')}`
        });
      }

      // Determine which Pterodactyl client key to use
      // Priority: 1. Request body pteroKey, 2. Settings clientKey
      const clientKey = pteroKey || settings.pterodactyl.clientKey;

      if (!clientKey) {
        return res.status(501).json({
          error: 'Not Configured',
          message: 'Power control requires a Pterodactyl client API key. Either:\n1. Add "clientKey" to pterodactyl settings in settings.json, OR\n2. Pass "pteroKey" in request body',
          documentation: 'See POWER_CONTROL.md for setup instructions'
        });
      }

      // If identifier is provided, use it directly. Otherwise, fetch server details first
      let serverIdentifier = identifier;
      
      if (!serverIdentifier) {
        // Fetch server details to get identifier
        const serverResponse = await fetch(
          `${settings.pterodactyl.domain}/api/application/servers/${serverId}`,
          {
            headers: {
              'Authorization': `Bearer ${settings.pterodactyl.key}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }
        );

        if (!serverResponse.ok) {
          return res.status(404).json({
            error: 'Not Found',
            message: 'Server not found'
          });
        }

        const serverData = await serverResponse.json();
        serverIdentifier = serverData.attributes.identifier;
      }

      // Send power action using client API
      const powerResponse = await fetch(
        `${settings.pterodactyl.domain}/api/client/servers/${serverIdentifier}/power`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${clientKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ signal: action })
        }
      );

      if (!powerResponse.ok) {
        const errorText = await powerResponse.text();
        console.error('Pterodactyl power control error:', errorText);
        
        return res.status(powerResponse.status).json({
          error: 'Pterodactyl Error',
          message: 'Failed to send power action',
          details: errorText
        });
      }

      res.json({
        success: true,
        message: `Power action '${action}' sent successfully to server ${serverId}`,
        data: {
          serverId: serverId,
          identifier: serverIdentifier,
          action: action,
          keySource: pteroKey ? 'request' : 'settings'
        }
      });
    } catch (error) {
      console.error('Error in power endpoint:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });

  /**
   * DELETE /api/dashboard/servers/:serverId
   * Delete a server
   */
  app.delete('/api/dashboard/servers/:serverId', requireApiKey(['servers.delete', '*']), async (req, res) => {
    try {
      const serverId = req.params.serverId;

      const response = await fetch(
        `${settings.pterodactyl.domain}/api/application/servers/${serverId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${settings.pterodactyl.key}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        return res.status(response.status).json({
          error: 'Pterodactyl API Error',
          message: 'Failed to delete server'
        });
      }

      res.json({
        success: true,
        message: 'Server deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting server:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });

  /**
   * PATCH /api/dashboard/servers/:serverId/owner
   * Transfer server ownership to another user
   */
  app.patch('/api/dashboard/servers/:serverId/owner', requireApiKey(['servers.manage', '*']), async (req, res) => {
    try {
      const serverId = req.params.serverId;
      const { newOwnerId } = req.body;

      if (!newOwnerId) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'newOwnerId is required'
        });
      }

      // Get new owner's Pterodactyl ID
      const newPteroId = await db.get(`users-${newOwnerId}`);
      if (!newPteroId) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'New owner not found in database. They need to login first.'
        });
      }

      // First, get current server details to preserve existing configuration
      const getServerResponse = await fetch(
        `${settings.pterodactyl.domain}/api/application/servers/${serverId}`,
        {
          headers: {
            'Authorization': `Bearer ${settings.pterodactyl.key}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      if (!getServerResponse.ok) {
        return res.status(getServerResponse.status).json({
          error: 'Pterodactyl API Error',
          message: 'Failed to get server details'
        });
      }

      const serverData = await getServerResponse.json();
      const serverAttrs = serverData.attributes;

      // Update server owner in Pterodactyl with complete build config
      const response = await fetch(
        `${settings.pterodactyl.domain}/api/application/servers/${serverId}/build`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${settings.pterodactyl.key}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            allocation: serverAttrs.allocation,
            memory: serverAttrs.limits.memory,
            swap: serverAttrs.limits.swap,
            disk: serverAttrs.limits.disk,
            io: serverAttrs.limits.io,
            cpu: serverAttrs.limits.cpu,
            threads: serverAttrs.limits.threads,
            feature_limits: {
              databases: serverAttrs.feature_limits.databases,
              allocations: serverAttrs.feature_limits.allocations,
              backups: serverAttrs.feature_limits.backups
            },
            user: parseInt(newPteroId)
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({
          error: 'Pterodactyl API Error',
          message: 'Failed to transfer server ownership',
          details: errorText
        });
      }

      res.json({
        success: true,
        message: 'Server ownership transferred successfully',
        data: {
          serverId: serverId,
          serverName: serverAttrs.name,
          oldOwnerId: serverAttrs.user,
          newOwnerId: newOwnerId,
          newPteroId: newPteroId
        }
      });
    } catch (error) {
      console.error('Error transferring server ownership:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });

  /**
   * POST /api/dashboard/servers/:serverId/renew
   * Renew/refresh a server (reinstall)
   */
  app.post('/api/dashboard/servers/:serverId/renew', requireApiKey(['servers.manage', '*']), async (req, res) => {
    try {
      const serverId = req.params.serverId;

      // Trigger server reinstall via Pterodactyl API
      const response = await fetch(
        `${settings.pterodactyl.domain}/api/application/servers/${serverId}/reinstall`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${settings.pterodactyl.key}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({
          error: 'Pterodactyl API Error',
          message: 'Failed to renew server',
          details: errorText
        });
      }

      res.json({
        success: true,
        message: 'Server renewal initiated successfully',
        data: { serverId: serverId }
      });
    } catch (error) {
      console.error('Error renewing server:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });

  /**
   * PATCH /api/dashboard/servers/:serverId
   * Update server resource limits
   */
  app.patch('/api/dashboard/servers/:serverId', requireApiKey(['servers.manage', '*']), async (req, res) => {
    try {
      const serverId = req.params.serverId;
      const { memory, disk, cpu, name } = req.body;

      const updates = {};
      if (memory !== undefined) updates.memory = parseInt(memory);
      if (disk !== undefined) updates.disk = parseInt(disk);
      if (cpu !== undefined) updates.cpu = parseInt(cpu);

      if (Object.keys(updates).length === 0 && !name) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'At least one field must be provided (memory, disk, cpu, name)'
        });
      }

      // Update build limits if provided
      if (Object.keys(updates).length > 0) {
        const buildResponse = await fetch(
          `${settings.pterodactyl.domain}/api/application/servers/${serverId}/build`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${settings.pterodactyl.key}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              allocation: undefined,
              ...updates,
              swap: 0,
              io: 500,
              threads: null
            })
          }
        );

        if (!buildResponse.ok) {
          const errorText = await buildResponse.text();
          return res.status(buildResponse.status).json({
            error: 'Pterodactyl API Error',
            message: 'Failed to update server limits',
            details: errorText
          });
        }
      }

      // Update server name if provided
      if (name) {
        const detailsResponse = await fetch(
          `${settings.pterodactyl.domain}/api/application/servers/${serverId}/details`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${settings.pterodactyl.key}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ name: name })
          }
        );

        if (!detailsResponse.ok) {
          const errorText = await detailsResponse.text();
          return res.status(detailsResponse.status).json({
            error: 'Pterodactyl API Error',
            message: 'Failed to update server name',
            details: errorText
          });
        }
      }

      res.json({
        success: true,
        message: 'Server updated successfully',
        data: { serverId: serverId, updates: { ...updates, name } }
      });
    } catch (error) {
      console.error('Error updating server:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });

  /**
   * POST /api/dashboard/servers/:serverId/backup
   * Create a server backup
   */
  app.post('/api/dashboard/servers/:serverId/backup', requireApiKey(['servers.manage', '*']), async (req, res) => {
    try {
      const serverId = req.params.serverId;
      const { pteroKey } = req.body;

      const clientKey = pteroKey || settings.pterodactyl.clientKey;
      if (!clientKey) {
        return res.status(501).json({
          error: 'Not Configured',
          message: 'Pterodactyl client key not configured'
        });
      }

      // Get server details to find identifier
      const serverResponse = await fetch(
        `${settings.pterodactyl.domain}/api/application/servers/${serverId}`,
        {
          headers: {
            'Authorization': `Bearer ${settings.pterodactyl.key}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      if (!serverResponse.ok) {
        return res.status(serverResponse.status).json({
          error: 'Pterodactyl API Error',
          message: 'Failed to get server details'
        });
      }

      const serverData = await serverResponse.json();
      const identifier = serverData.attributes.identifier;

      // Create backup via client API
      const backupResponse = await fetch(
        `${settings.pterodactyl.domain}/api/client/servers/${identifier}/backups`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${clientKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({})
        }
      );

      if (!backupResponse.ok) {
        const errorText = await backupResponse.text();
        return res.status(backupResponse.status).json({
          error: 'Pterodactyl API Error',
          message: 'Failed to create backup',
          details: errorText
        });
      }

      const backupData = await backupResponse.json();

      res.json({
        success: true,
        message: 'Backup created successfully',
        data: backupData
      });
    } catch (error) {
      console.error('Error creating backup:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });

  /**
   * GET /api/dashboard/servers/:serverId/logs
   * Get server console logs
   */
  app.get('/api/dashboard/servers/:serverId/logs', requireApiKey(['servers.read', '*']), async (req, res) => {
    try {
      const serverId = req.params.serverId;
      const lines = req.query.lines || 50;
      const pteroKey = req.headers['ptero-key'];

      const clientKey = pteroKey || settings.pterodactyl.clientKey;
      if (!clientKey) {
        return res.status(501).json({
          error: 'Not Configured',
          message: 'Pterodactyl client key not configured'
        });
      }

      // Get server details to find identifier
      const serverResponse = await fetch(
        `${settings.pterodactyl.domain}/api/application/servers/${serverId}`,
        {
          headers: {
            'Authorization': `Bearer ${settings.pterodactyl.key}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      if (!serverResponse.ok) {
        return res.status(serverResponse.status).json({
          error: 'Pterodactyl API Error',
          message: 'Failed to get server details'
        });
      }

      const serverData = await serverResponse.json();
      const identifier = serverData.attributes.identifier;

      // Note: Pterodactyl doesn't have a direct logs endpoint in client API
      // This would need WebSocket connection. For now, return a message
      res.json({
        success: true,
        message: 'Log retrieval requires WebSocket connection',
        data: {
          logs: 'Console logs require real-time WebSocket connection. Please use the panel to view logs.',
          identifier: identifier,
          websocket: `wss://${settings.pterodactyl.domain.replace('https://', '').replace('http://', '')}/api/client/servers/${identifier}/websocket`
        }
      });
    } catch (error) {
      console.error('Error getting server logs:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });

  // ==================== SETTINGS & CONFIGURATION ====================
  
  /**
   * GET /api/dashboard/settings
   * Get dashboard settings (safe subset)
   */
  app.get('/api/dashboard/settings', requireApiKey(['settings.read', '*']), async (req, res) => {
    try {
      const safeSettings = {
        name: settings.name,
        packages: settings.api.client.packages.list,
        coins: {
          enabled: settings.api.client.coins.enabled,
          store: settings.api.client.coins.store
        },
        pterodactyl: {
          domain: settings.pterodactyl.domain
        }
      };

      res.json({
        success: true,
        data: safeSettings
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });

  /**
   * GET /api/dashboard/packages
   * Get available packages
   */
  app.get('/api/dashboard/packages', requireApiKey(['settings.read', '*']), async (req, res) => {
    try {
      res.json({
        success: true,
        data: {
          packages: settings.api.client.packages.list,
          default: settings.api.client.packages.default
        }
      });
    } catch (error) {
      console.error('Error fetching packages:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });

  // ==================== STATISTICS & MONITORING ====================
  
  /**
   * GET /api/dashboard/stats
   * Get dashboard statistics
   */
  app.get('/api/dashboard/stats', requireApiKey(['stats.read', '*']), async (req, res) => {
    try {
      const usersResponse = await fetch(
        `${settings.pterodactyl.domain}/api/application/users`,
        {
          headers: {
            'Authorization': `Bearer ${settings.pterodactyl.key}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const serversResponse = await fetch(
        `${settings.pterodactyl.domain}/api/application/servers`,
        {
          headers: {
            'Authorization': `Bearer ${settings.pterodactyl.key}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const usersData = await usersResponse.json();
      const serversData = await serversResponse.json();

      res.json({
        success: true,
        data: {
          totalUsers: usersData.meta?.pagination?.total || 0,
          totalServers: serversData.meta?.pagination?.total || 0,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });

  /**
   * GET /api/dashboard/health
   * Health check endpoint
   */
  app.get('/api/dashboard/health', requireApiKey(['*']), async (req, res) => {
    try {
      const pteroResponse = await fetch(
        `${settings.pterodactyl.domain}/api/application/users?per_page=1`,
        {
          headers: {
            'Authorization': `Bearer ${settings.pterodactyl.key}`,
            'Content-Type': 'application/json'
          }
        }
      );

      res.json({
        success: true,
        data: {
          dashboard: 'online',
          pterodactyl: pteroResponse.ok ? 'online' : 'offline',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.json({
        success: true,
        data: {
          dashboard: 'online',
          pterodactyl: 'offline',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  // ==================== DISCORD ROLE REWARDS SYSTEM ====================
  
  /**
   * POST /api/dashboard/roles/sync
   * Sync user roles from Discord and grant rewards
   * This endpoint should be called by Discord bot when:
   * - User gets a new role (including boosts)
   * - User loses a role
   * - Manual sync is requested
   */
  app.post('/api/dashboard/roles/sync', requireApiKey(['roles.write', '*']), async (req, res) => {
    try {
      const { discordId, roles, action } = req.body;

      if (!discordId || !roles || !Array.isArray(roles)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Missing required fields: discordId, roles (array)'
        });
      }

      const pterodactylId = await db.get(`users-${discordId}`);
      if (!pterodactylId) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found in database'
        });
      }

      // Get role rewards from database
      const sqlite3 = require('better-sqlite3');
      const dbPath = settings.database.replace('sqlite://', './');
      const dbFile = new sqlite3(dbPath, { readonly: true });
      
      const roleConfigs = dbFile.prepare(`
        SELECT role_id, role_name, rewards_ram, rewards_disk, rewards_cpu, rewards_servers, rewards_coins
        FROM discord_roles 
        WHERE enabled = 1 AND role_id IN (${roles.map(() => '?').join(',')})
      `).all(...roles);
      
      dbFile.close();

      if (roleConfigs.length === 0) {
        return res.json({
          success: true,
          message: 'No reward-enabled roles found',
          rewarded: false
        });
      }

      // Calculate total rewards from all matching roles
      let totalRewards = {
        ram: 0,
        disk: 0,
        cpu: 0,
        servers: 0,
        coins: 0
      };

      roleConfigs.forEach(role => {
        totalRewards.ram += role.rewards_ram || 0;
        totalRewards.disk += role.rewards_disk || 0;
        totalRewards.cpu += role.rewards_cpu || 0;
        totalRewards.servers += role.rewards_servers || 0;
        totalRewards.coins += role.rewards_coins || 0;
      });

      // Grant rewards based on action
      if (action === 'add') {
        // Add rewards when role is granted
        const currentExtra = await db.get(`extra-${discordId}`) || {
          ram: 0, disk: 0, cpu: 0, servers: 0
        };

        const newExtra = {
          ram: currentExtra.ram + totalRewards.ram,
          disk: currentExtra.disk + totalRewards.disk,
          cpu: currentExtra.cpu + totalRewards.cpu,
          servers: currentExtra.servers + totalRewards.servers
        };

        await db.set(`extra-${discordId}`, newExtra);

        // Add coins
        if (totalRewards.coins > 0) {
          const currentCoins = await db.get(`coins-${discordId}`) || 0;
          await db.set(`coins-${discordId}`, currentCoins + totalRewards.coins);
        }

        // Track role assignment
        const dbWrite = new sqlite3(dbPath);
        const stmt = dbWrite.prepare(`
          INSERT OR IGNORE INTO user_discord_roles (discord_id, role_id) 
          VALUES (?, ?)
        `);
        
        roles.forEach(roleId => {
          stmt.run(discordId, roleId);
        });
        
        dbWrite.close();

        res.json({
          success: true,
          message: 'Role rewards granted successfully',
          rewarded: true,
          rewards: totalRewards,
          roles: roleConfigs.map(r => r.role_name)
        });

      } else if (action === 'remove') {
        // Remove rewards when role is lost
        const currentExtra = await db.get(`extra-${discordId}`) || {
          ram: 0, disk: 0, cpu: 0, servers: 0
        };

        const newExtra = {
          ram: Math.max(0, currentExtra.ram - totalRewards.ram),
          disk: Math.max(0, currentExtra.disk - totalRewards.disk),
          cpu: Math.max(0, currentExtra.cpu - totalRewards.cpu),
          servers: Math.max(0, currentExtra.servers - totalRewards.servers)
        };

        await db.set(`extra-${discordId}`, newExtra);

        // Remove coins (but don't go below 0)
        if (totalRewards.coins > 0) {
          const currentCoins = await db.get(`coins-${discordId}`) || 0;
          await db.set(`coins-${discordId}`, Math.max(0, currentCoins - totalRewards.coins));
        }

        // Remove role tracking
        const dbWrite = new sqlite3(dbPath);
        const stmt = dbWrite.prepare(`
          DELETE FROM user_discord_roles 
          WHERE discord_id = ? AND role_id = ?
        `);
        
        roles.forEach(roleId => {
          stmt.run(discordId, roleId);
        });
        
        dbWrite.close();

        res.json({
          success: true,
          message: 'Role rewards removed successfully',
          rewarded: true,
          removed: totalRewards,
          roles: roleConfigs.map(r => r.role_name)
        });

      } else {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid action. Must be "add" or "remove"'
        });
      }

    } catch (error) {
      console.error('Error syncing roles:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });

  /**
   * GET /api/dashboard/roles/user/:discordId
   * Get user's Discord roles and their rewards
   */
  app.get('/api/dashboard/roles/user/:discordId', requireApiKey(['roles.read', '*']), async (req, res) => {
    try {
      const discordId = req.params.discordId;

      const sqlite3 = require('better-sqlite3');
      const dbPath = settings.database.replace('sqlite://', './');
      const dbFile = new sqlite3(dbPath, { readonly: true });
      
      const userRoles = dbFile.prepare(`
        SELECT ur.role_id, ur.granted_at, dr.role_name, dr.rewards_ram, dr.rewards_disk, 
               dr.rewards_cpu, dr.rewards_servers, dr.rewards_coins
        FROM user_discord_roles ur
        LEFT JOIN discord_roles dr ON ur.role_id = dr.role_id
        WHERE ur.discord_id = ?
      `).all(discordId);
      
      dbFile.close();

      res.json({
        success: true,
        data: {
          discordId,
          roles: userRoles
        }
      });
    } catch (error) {
      console.error('Error fetching user roles:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });

  /**
   * POST /api/dashboard/ban
   * Ban a user from the dashboard
   * 
   * Body: {
   *   discordId: "user_discord_id",
   *   reason: "Ban reason",
   *   duration: 86400 (optional, in seconds, null for permanent),
   *   cleanup: true (optional, default true)
   * }
   */
  app.post('/api/dashboard/ban', requireApiKey(['users.write', 'admin', '*']), async (req, res) => {
    try {
      const { discordId, reason, duration, cleanup } = req.body;

      if (!discordId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: discordId'
        });
      }

      const BanManager = require('../lib/BanManager');
      const banManager = new BanManager(db, settings);

      const result = await banManager.banUser(discordId, 'BOT', {
        reason: reason || 'Banned by bot',
        duration: duration ? parseInt(duration) : null,
        cleanup: cleanup !== false,
        bannedByUsername: 'Discord Bot'
      });

      res.json(result);
    } catch (error) {
      console.error('[Dashboard API] Error banning user:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  });

  /**
   * POST /api/dashboard/unban
   * Unban a user from the dashboard
   * 
   * Body: {
   *   discordId: "user_discord_id",
   *   reason: "Unban reason"
   * }
   */
  app.post('/api/dashboard/unban', requireApiKey(['users.write', 'admin', '*']), async (req, res) => {
    try {
      const { discordId, reason } = req.body;

      if (!discordId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: discordId'
        });
      }

      const BanManager = require('../lib/BanManager');
      const banManager = new BanManager(db, settings);

      const result = await banManager.unban(
        discordId,
        'BOT',
        reason || 'Unbanned by bot'
      );

      res.json(result);
    } catch (error) {
      console.error('[Dashboard API] Error unbanning user:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  });

  /**
   * GET /api/dashboard/ban/check/:discordId
   * Check if a user is banned
   */
  app.get('/api/dashboard/ban/check/:discordId', requireApiKey(['users.read', '*']), async (req, res) => {
    try {
      const { discordId } = req.params;

      const BanManager = require('../lib/BanManager');
      const banManager = new BanManager(db, settings);

      const ban = await banManager.isBanned(discordId);

      res.json({
        success: true,
        banned: !!ban,
        ban: ban
      });
    } catch (error) {
      console.error('[Dashboard API] Error checking ban:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  });

  /**
   * GET /api/dashboard/bans/history/:discordId
   * Get ban history for a user
   */
  app.get('/api/dashboard/bans/history/:discordId', requireApiKey(['users.read', '*']), async (req, res) => {
    try {
      const { discordId } = req.params;

      const sqlite3 = require('better-sqlite3');
      const dbPath = settings.database.replace('sqlite://', './');
      const dbFile = new sqlite3(dbPath, { readonly: true });

      const history = dbFile.prepare(`
        SELECT userId, reason, bannedAt, bannedBy, expiresAt, unbannedAt, unbannedBy, unbannedReason
        FROM ban_history
        WHERE userId = ?
        ORDER BY bannedAt DESC
      `).all(discordId);

      dbFile.close();

      res.json({
        success: true,
        discordId,
        history
      });
    } catch (error) {
      console.error('[Dashboard API] Error fetching ban history:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  });

  /**
   * GET /api/dashboard/bans/list
   * Get list of all currently banned users
   */
  app.get('/api/dashboard/bans/list', requireApiKey(['users.read', '*']), async (req, res) => {
    try {
      const sqlite3 = require('better-sqlite3');
      const dbPath = settings.database.replace('sqlite://', './');
      const dbFile = new sqlite3(dbPath, { readonly: true });

      const bans = dbFile.prepare(`
        SELECT userId, reason, bannedAt, bannedBy, expiresAt
        FROM banned_users
        ORDER BY bannedAt DESC
      `).all();

      dbFile.close();

      res.json({
        success: true,
        bans
      });
    } catch (error) {
      console.error('[Dashboard API] Error fetching ban list:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  });

  // ==================== CODE REDEMPTION ====================
  
  /**
   * POST /api/dashboard/codes/redeem
   * Redeem a code for a user (Bot-friendly API)
   * 
   * Body: {
   *   discordId: "user_discord_id",
   *   code: "CODE-TO-REDEEM"
   * }
   */
  app.post('/api/dashboard/codes/redeem', requireApiKey(['codes.redeem', '*']), async (req, res) => {
    try {
      const { discordId, code } = req.body;

      if (!discordId || !code) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Missing required fields: discordId, code'
        });
      }

      // Check if user exists
      const pterodactylId = await db.get(`users-${discordId}`);
      if (!pterodactylId) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'User not found. Please login to the dashboard first.'
        });
      }

      const codeUpper = code.toUpperCase().trim();
      const codeData = await db.get(`code-${codeUpper}`);

      if (!codeData) {
        return res.status(404).json({
          success: false,
          error: 'Invalid Code',
          message: 'This code does not exist or has been deleted.'
        });
      }

      // Check if code is expired
      if (codeData.expiresAt && Date.now() > codeData.expiresAt) {
        return res.status(400).json({
          success: false,
          error: 'Expired',
          message: 'This code has expired.'
        });
      }

      // Check if code has reached max uses
      if (codeData.uses >= codeData.maxUses) {
        return res.status(400).json({
          success: false,
          error: 'Max Uses Reached',
          message: 'This code has reached its maximum number of uses.'
        });
      }

      // Check if user has already used this code max times
      const userUseCount = codeData.usedBy[discordId] || 0;
      if (userUseCount >= codeData.maxUsesPerUser) {
        return res.status(400).json({
          success: false,
          error: 'Already Redeemed',
          message: `You have already used this code ${userUseCount} time(s). Maximum uses per user: ${codeData.maxUsesPerUser}`
        });
      }

      // Grant rewards
      const rewards = codeData.rewards;

      // Add coins
      if (rewards.coins > 0) {
        const currentCoins = (await db.get(`coins-${discordId}`)) || 0;
        await db.set(`coins-${discordId}`, currentCoins + rewards.coins);
      }

      // Add extra resources
      const extra = (await db.get(`extra-${discordId}`)) || {
        ram: 0,
        disk: 0,
        cpu: 0,
        servers: 0
      };

      if (rewards.ram > 0) extra.ram += rewards.ram;
      if (rewards.disk > 0) extra.disk += rewards.disk;
      if (rewards.cpu > 0) extra.cpu += rewards.cpu;
      if (rewards.servers > 0) extra.servers += rewards.servers;

      await db.set(`extra-${discordId}`, extra);

      // Update code usage
      codeData.uses += 1;
      codeData.usedBy[discordId] = (codeData.usedBy[discordId] || 0) + 1;
      await db.set(`code-${codeUpper}`, codeData);

      // Build rewards list for response
      const rewardsList = [];
      if (rewards.coins > 0) rewardsList.push(`${rewards.coins} coins`);
      if (rewards.ram > 0) rewardsList.push(`${rewards.ram}MB RAM`);
      if (rewards.disk > 0) rewardsList.push(`${rewards.disk}MB Disk`);
      if (rewards.cpu > 0) rewardsList.push(`${rewards.cpu}% CPU`);
      if (rewards.servers > 0) rewardsList.push(`${rewards.servers} server slot(s)`);

      const remainingUses = codeData.maxUsesPerUser - codeData.usedBy[discordId];

      // Log redemption
      log(
        `code redeemed`,
        `Discord user ${discordId} redeemed code ${codeUpper} via bot and received: ${rewardsList.join(', ')}`
      );

      // Trigger webhook for coins if applicable
      const { onCoinsAdded } = require('../lib/integrations');
      if (rewards.coins > 0) {
        onCoinsAdded(
          discordId,
          `Discord User ${discordId}`,
          rewards.coins
        ).catch(err => console.error('Webhook error:', err));
      }

      res.json({
        success: true,
        message: `Successfully redeemed! You received: ${rewardsList.join(', ')}`,
        data: {
          rewards,
          rewardsList,
          remainingUses,
          totalUsesRemaining: codeData.maxUses - codeData.uses
        }
      });
    } catch (error) {
      console.error('[Dashboard API] Error redeeming code:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });

  /**
   * POST /api/dashboard/codes/check
   * Check if a code is valid without redeeming it
   * 
   * Body: {
   *   discordId: "user_discord_id",
   *   code: "CODE-TO-CHECK"
   * }
   */
  app.post('/api/dashboard/codes/check', requireApiKey(['codes.read', '*']), async (req, res) => {
    try {
      const { discordId, code } = req.body;

      if (!discordId || !code) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Missing required fields: discordId, code'
        });
      }

      const codeUpper = code.toUpperCase().trim();
      const codeData = await db.get(`code-${codeUpper}`);

      if (!codeData) {
        return res.json({
          success: true,
          valid: false,
          reason: 'Code does not exist'
        });
      }

      const userUseCount = codeData.usedBy[discordId] || 0;

      const valid =
        (!codeData.expiresAt || Date.now() <= codeData.expiresAt) &&
        codeData.uses < codeData.maxUses &&
        userUseCount < codeData.maxUsesPerUser;

      let reason = "";
      if (codeData.expiresAt && Date.now() > codeData.expiresAt) reason = "Code has expired";
      else if (codeData.uses >= codeData.maxUses) reason = "Code has reached maximum total uses";
      else if (userUseCount >= codeData.maxUsesPerUser) reason = `You have already used this code ${userUseCount}/${codeData.maxUsesPerUser} times`;
      else reason = "Code is valid";

      res.json({
        success: true,
        valid,
        reason,
        rewards: valid ? codeData.rewards : null,
        usesRemaining: valid ? codeData.maxUsesPerUser - userUseCount : 0
      });
    } catch (error) {
      console.error('[Dashboard API] Error checking code:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });
};
