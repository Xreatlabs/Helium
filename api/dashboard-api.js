/**
 * Dashboard API Routes
 * Comprehensive API system for Discord bot and external integrations
 */

const { requireApiKey } = require('../middleware/apiAuth');
const settings = require('../settings.json');
const fetch = require('node-fetch');
const fs = require('fs');

module.exports.load = async function (app, db) {
  
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

  // ==================== SERVER MANAGEMENT ====================
  
  /**
   * GET /api/dashboard/servers
   * List all servers (with optional user filter)
   */
  app.get('/api/dashboard/servers', requireApiKey(['servers.read', '*']), async (req, res) => {
    try {
      const { discordId, page = 1, perPage = 50 } = req.query;

      let url = `${settings.pterodactyl.domain}/api/application/servers?page=${page}&per_page=${perPage}`;
      
      if (discordId) {
        const pterodactylId = await db.get(`users-${discordId}`);
        if (!pterodactylId) {
          return res.status(404).json({
            error: 'Not Found',
            message: 'User not found'
          });
        }
        url += `&filter[owner_id]=${pterodactylId}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${settings.pterodactyl.key}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      res.json({
        success: true,
        data: data
      });
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
   */
  app.post('/api/dashboard/servers/:serverId/power', requireApiKey(['servers.control', '*']), async (req, res) => {
    try {
      const serverId = req.params.serverId;
      const { action } = req.body;

      const validActions = ['start', 'stop', 'restart', 'kill'];
      if (!validActions.includes(action)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: `Invalid action. Must be one of: ${validActions.join(', ')}`
        });
      }

      const response = await fetch(
        `${settings.pterodactyl.domain}/api/client/servers/${serverId}/power`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${settings.pterodactyl.key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ signal: action })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return res.status(response.status).json({
          error: 'Pterodactyl API Error',
          message: errorData.errors?.[0]?.detail || 'Failed to send power action'
        });
      }

      res.json({
        success: true,
        message: `Power action '${action}' sent successfully`
      });
    } catch (error) {
      console.error('Error sending power action:', error);
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
          enabled: settings.api.client.coins.enabled
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
};
