/**
 * Ban Manager
 * Handles user bans, unbans, and cleanup
 */

const Database = require('better-sqlite3');
const fetch = require('node-fetch');

class BanManager {
  constructor(db, settings) {
    this.db = db;
    this.settings = settings;
    this.pterodactylDomain = settings.pterodactyl?.domain;
    this.pterodactylKey = settings.pterodactyl?.key;
  }

  /**
   * Check if a user is banned
   * @param {string} userId - Discord user ID
   * @returns {Promise<Object|null>} Ban info or null if not banned
   */
  async isBanned(userId) {
    try {
      const dbConn = new Database('./database.sqlite');
      const ban = dbConn.prepare(`
        SELECT * FROM banned_users 
        WHERE user_id = ? 
        AND (permanent = 1 OR expires_at > datetime('now'))
      `).get(userId);
      
      dbConn.close();
      
      if (!ban) return null;
      
      // Check if temporary ban expired
      if (!ban.permanent && ban.expires_at) {
        const expiresAt = new Date(ban.expires_at);
        if (expiresAt < new Date()) {
          // Ban expired, remove it
          await this.unban(userId, 'SYSTEM', 'Ban expired');
          return null;
        }
      }
      
      return ban;
    } catch (error) {
      console.error('[BanManager] Error checking ban status:', error);
      return null;
    }
  }

  /**
   * Ban a user and cleanup their data
   * @param {string} userId - Discord user ID
   * @param {string} bannedBy - Admin user ID who issued the ban
   * @param {Object} options - Ban options
   * @returns {Promise<Object>} Result of ban operation
   */
  async banUser(userId, bannedBy, options = {}) {
    const {
      reason = 'No reason provided',
      duration = null, // Duration in seconds, null for permanent
      cleanup = true,
      bannedByUsername = 'Admin'
    } = options;

    try {
      const dbConn = new Database('./database.sqlite');
      
      // Get user info
      const userInfo = await this.db.get(`userinfo-${userId}`);
      const parsedInfo = userInfo ? JSON.parse(userInfo) : {};
      
      // Check if already banned
      const existingBan = await this.isBanned(userId);
      if (existingBan) {
        dbConn.close();
        return {
          success: false,
          error: 'User is already banned',
          existingBan
        };
      }

      // Calculate expiration
      const expiresAt = duration ? new Date(Date.now() + duration * 1000).toISOString() : null;
      const permanent = duration ? 0 : 1;

      // Insert ban record
      const banResult = dbConn.prepare(`
        INSERT INTO banned_users (
          user_id, username, discriminator, banned_by, banned_by_username,
          reason, expires_at, permanent, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        parsedInfo.username || 'Unknown',
        parsedInfo.discriminator || '0000',
        bannedBy,
        bannedByUsername,
        reason,
        expiresAt,
        permanent,
        JSON.stringify({
          bannedAt: new Date().toISOString(),
          ipAddress: parsedInfo.ip || 'Unknown'
        })
      );

      // Log ban action
      dbConn.prepare(`
        INSERT INTO ban_history (user_id, action, performed_by, reason, metadata)
        VALUES (?, 'ban', ?, ?, ?)
      `).run(
        userId,
        bannedBy,
        reason,
        JSON.stringify({ duration, permanent })
      );

      dbConn.close();

      // Cleanup user data if requested
      let cleanupResult = null;
      if (cleanup) {
        cleanupResult = await this.cleanupUserData(userId);
      }

      console.log(`[BanManager] User ${userId} banned by ${bannedBy}. Reason: ${reason}`);

      return {
        success: true,
        message: 'User banned successfully',
        ban: {
          userId,
          reason,
          permanent,
          expiresAt,
          bannedBy,
          bannedByUsername
        },
        cleanup: cleanupResult
      };
    } catch (error) {
      console.error('[BanManager] Error banning user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Unban a user
   * @param {string} userId - Discord user ID
   * @param {string} unbannedBy - Admin user ID who removed the ban
   * @param {string} reason - Reason for unban
   * @returns {Promise<Object>} Result of unban operation
   */
  async unban(userId, unbannedBy, reason = 'No reason provided') {
    try {
      const dbConn = new Database('./database.sqlite');
      
      // Check if user is banned
      const ban = await this.isBanned(userId);
      if (!ban) {
        dbConn.close();
        return {
          success: false,
          error: 'User is not banned'
        };
      }

      // Remove ban
      dbConn.prepare('DELETE FROM banned_users WHERE user_id = ?').run(userId);

      // Log unban action
      dbConn.prepare(`
        INSERT INTO ban_history (user_id, action, performed_by, reason)
        VALUES (?, 'unban', ?, ?)
      `).run(userId, unbannedBy, reason);

      dbConn.close();

      console.log(`[BanManager] User ${userId} unbanned by ${unbannedBy}. Reason: ${reason}`);

      return {
        success: true,
        message: 'User unbanned successfully',
        userId
      };
    } catch (error) {
      console.error('[BanManager] Error unbanning user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cleanup all user data (servers, resources, etc.)
   * @param {string} userId - Discord user ID
   * @returns {Promise<Object>} Cleanup results
   */
  async cleanupUserData(userId) {
    const results = {
      serversDeleted: 0,
      resourcesCleared: false,
      coinsCleared: false,
      sessionsCleared: false,
      errors: []
    };

    try {
      // Get user's servers from Pterodactyl
      const servers = await this.getUserServers(userId);
      
      // Delete each server
      for (const server of servers) {
        try {
          await this.deletePterodactylServer(server.attributes.identifier);
          results.serversDeleted++;
        } catch (error) {
          results.errors.push(`Failed to delete server ${server.attributes.name}: ${error.message}`);
        }
      }

      // Clear user resources
      try {
        await this.db.set(`package-${userId}`, null);
        await this.db.set(`extra-${userId}`, JSON.stringify({
          ram: 0,
          disk: 0,
          cpu: 0,
          servers: 0
        }));
        results.resourcesCleared = true;
      } catch (error) {
        results.errors.push(`Failed to clear resources: ${error.message}`);
      }

      // Clear coins
      try {
        await this.db.set(`coins-${userId}`, null);
        results.coinsCleared = true;
      } catch (error) {
        results.errors.push(`Failed to clear coins: ${error.message}`);
      }

      // Clear user info and sessions
      try {
        await this.db.delete(`userinfo-${userId}`);
        await this.db.delete(`admin-${userId}`);
        results.sessionsCleared = true;
      } catch (error) {
        results.errors.push(`Failed to clear sessions: ${error.message}`);
      }

      return results;
    } catch (error) {
      console.error('[BanManager] Error cleaning up user data:', error);
      results.errors.push(`General cleanup error: ${error.message}`);
      return results;
    }
  }

  /**
   * Get user's servers from Pterodactyl
   * @param {string} userId - Discord user ID
   * @returns {Promise<Array>} List of servers
   */
  async getUserServers(userId) {
    try {
      const userInfo = await this.db.get(`userinfo-${userId}`);
      if (!userInfo) return [];

      const parsedInfo = JSON.parse(userInfo);
      const pterodactylId = parsedInfo.id;

      if (!pterodactylId) return [];

      const response = await fetch(
        `${this.pterodactylDomain}/api/application/users/${pterodactylId}?include=servers`,
        {
          headers: {
            'Authorization': `Bearer ${this.pterodactylKey}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) return [];

      const data = await response.json();
      return data.attributes?.relationships?.servers?.data || [];
    } catch (error) {
      console.error('[BanManager] Error getting user servers:', error);
      return [];
    }
  }

  /**
   * Delete a server from Pterodactyl
   * @param {string} serverIdentifier - Server identifier
   * @returns {Promise<boolean>} Success status
   */
  async deletePterodactylServer(serverIdentifier) {
    try {
      const response = await fetch(
        `${this.pterodactylDomain}/api/application/servers/${serverIdentifier}/force`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.pterodactylKey}`,
            'Accept': 'application/json'
          }
        }
      );

      return response.ok;
    } catch (error) {
      console.error('[BanManager] Error deleting server:', error);
      throw error;
    }
  }

  /**
   * Get list of all banned users
   * @returns {Promise<Array>} List of banned users
   */
  async getBannedUsers() {
    try {
      const dbConn = new Database('./database.sqlite');
      const users = dbConn.prepare(`
        SELECT * FROM banned_users 
        WHERE permanent = 1 OR expires_at > datetime('now')
        ORDER BY banned_at DESC
      `).all();
      dbConn.close();

      return users;
    } catch (error) {
      console.error('[BanManager] Error getting banned users:', error);
      return [];
    }
  }

  /**
   * Get ban history for a user
   * @param {string} userId - Discord user ID
   * @returns {Promise<Array>} Ban history
   */
  async getBanHistory(userId) {
    try {
      const dbConn = new Database('./database.sqlite');
      const history = dbConn.prepare(`
        SELECT * FROM ban_history 
        WHERE user_id = ?
        ORDER BY timestamp DESC
      `).all(userId);
      dbConn.close();

      return history;
    } catch (error) {
      console.error('[BanManager] Error getting ban history:', error);
      return [];
    }
  }
}

module.exports = BanManager;
