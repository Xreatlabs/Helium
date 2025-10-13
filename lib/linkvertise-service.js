const crypto = require('crypto');

class LinkvertiseService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Generate a secure random token
   * @returns {string} - Random token string
   */
  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a one-time callback token
   * @param {string} userId - The user ID
   * @returns {Promise<string>} - Returns the token or empty string on failure
   */
  async createCallbackToken(userId) {
    try {
      if (!userId) {
        console.error('[LinkvertiseService] Cannot create token: userId is missing');
        return '';
      }

      const token = this.generateToken();
      const key = `linkvertise-token-${token}`;
      
      const tokenData = {
        token: token,
        user_id: userId,
        created_at: new Date().toISOString(),
        used: false
      };

      await this.db.set(key, tokenData);
      console.log(`[LinkvertiseService] Token stored with key: ${key}`);
      
      // Verify token was stored
      const verification = await this.db.get(key);
      if (!verification) {
        console.error(`[LinkvertiseService] Token verification failed - token not found after storing`);
        return '';
      }
      console.log(`[LinkvertiseService] Token verified successfully`);
      
      return token;
    } catch (error) {
      console.error('[LinkvertiseService] Failed to create callback token:', error.message, error.stack);
      return '';
    }
  }

  /**
   * Validate and consume a one-time token
   * @param {string} token - The token to validate
   * @param {string} userId - The user ID to validate against
   * @returns {Promise<Object>} - Returns validation result
   */
  async validateAndConsumeToken(token, userId) {
    try {
      if (!token || !userId) {
        console.log('[LinkvertiseService] Validation failed: Missing token or user ID');
        return { valid: false, reason: 'Missing token or user ID' };
      }

      const key = `linkvertise-token-${token}`;
      console.log(`[LinkvertiseService] Looking up token with key: ${key}`);
      
      const tokenData = await this.db.get(key);

      if (!tokenData) {
        console.log(`[LinkvertiseService] Token not found in database`);
        return { valid: false, reason: 'Token not found' };
      }

      console.log(`[LinkvertiseService] Token found:`, tokenData);

      if (tokenData.used) {
        console.log('[LinkvertiseService] Token already used');
        return { valid: false, reason: 'Token already used' };
      }

      if (tokenData.user_id !== userId) {
        console.log(`[LinkvertiseService] User ID mismatch - Token user: ${tokenData.user_id}, Provided: ${userId}`);
        return { valid: false, reason: 'User ID mismatch' };
      }

      // Mark token as used and delete it
      await this.db.delete(key);
      console.log(`[LinkvertiseService] Token consumed and deleted`);

      return { valid: true, userId: tokenData.user_id };
    } catch (error) {
      console.error('[LinkvertiseService] Failed to validate token:', error.message, error.stack);
      return { valid: false, reason: 'Validation error' };
    }
  }

  /**
   * Create a new linkvertise entry
   * @param {string} code - The unique code for the link
   * @param {string} userId - The user ID
   * @returns {Promise<string>} - Returns the UUID of the created entry or empty string on failure
   */
  async create(code, userId) {
    try {
      if (!code || !userId) {
        return '';
      }

      // Generate a UUID for the link
      const linkId = uuidv4();
      const key = `linkvertise-${linkId}`;
      
      const linkData = {
        id: linkId,
        code: code,
        user: userId,
        completed: false,
        created_at: new Date().toISOString()
      };

      await this.db.set(key, linkData);
      
      // Add to user's history
      await this.addToUserHistory(userId, linkId);
      
      return linkId;
    } catch (error) {
      console.error('Failed to create linkvertise entry:', error.message);
      return '';
    }
  }

  /**
   * Get all linkvertise entries by user
   * @param {string} userId - The user ID
   * @param {number} limit - The limit of entries to return
   * @returns {Promise<Array>} - Array of linkvertise entries
   */
  async getAllByUser(userId, limit = 35) {
    try {
      if (!userId) {
        return [];
      }

      // Retrieve user's linkvertise history from a separate key
      const userHistoryKey = `linkvertise-history-${userId}`;
      const userHistory = await this.db.get(userHistoryKey) || [];
      
      // Get the actual link data for each entry in the history
      const links = [];
      for (const linkId of userHistory) {
        const linkData = await this.db.get(`linkvertise-${linkId}`);
        if (linkData) {
          links.push(linkData);
          if (links.length >= limit) break; // Limit results
        }
      }

      // Sort by creation date (newest first)
      links.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return links.slice(0, limit);
    } catch (error) {
      console.error('Failed to get linkvertise entries by user:', error.message);
      return [];
    }
  }

  /**
   * Mark a linkvertise entry as completed
   * @param {string} linkId - The UUID of the linkvertise entry
   * @returns {Promise<boolean>} - True if successful, false otherwise
   */
  async markAsCompleted(linkId) {
    try {
      if (!linkId) {
        return false;
      }

      const key = `linkvertise-${linkId}`;
      const linkData = await this.db.get(key);

      if (!linkData) {
        return false;
      }

      linkData.completed = true;
      await this.db.set(key, linkData);

      return true;
    } catch (error) {
      console.error('Failed to mark linkvertise as completed:', error.message);
      return false;
    }
  }

  /**
   * Get a linkvertise entry by ID
   * @param {string} linkId - The UUID of the linkvertise entry
   * @returns {Promise<Object>} - The linkvertise entry data
   */
  async getById(linkId) {
    try {
      if (!linkId) {
        return {};
      }

      const key = `linkvertise-${linkId}`;
      const linkData = await this.db.get(key);
      
      return linkData || {};
    } catch (error) {
      console.error('Failed to get linkvertise by ID:', error.message);
      return {};
    }
  }

  /**
   * Delete a linkvertise entry
   * @param {string} linkId - The UUID of the linkvertise entry
   * @returns {Promise<boolean>} - True if successful, false otherwise
   */
  async delete(linkId) {
    try {
      if (!linkId) {
        return false;
      }

      const key = `linkvertise-${linkId}`;
      await this.db.delete(key);
      return true;
    } catch (error) {
      console.error('Failed to delete linkvertise entry:', error.message);
      return false;
    }
  }

  /**
   * Count user's linkvertise entries in the last 24 hours
   * @param {string} userId - The user ID
   * @returns {Promise<number>} - Count of entries in last 24 hours
   */
  async countUserEntriesInLast24Hours(userId) {
    try {
      if (!userId) {
        return 0;
      }

      const userHistoryKey = `linkvertise-history-${userId}`;
      const userHistory = await this.db.get(userHistoryKey) || [];
      
      const now = Date.now();
      const dayAgo = now - (24 * 60 * 60 * 1000); // 24 hours ago
      let count = 0;

      for (const linkId of userHistory) {
        const linkData = await this.db.get(`linkvertise-${linkId}`);
        if (linkData) {
          const createdAt = new Date(linkData.created_at).getTime();
          if (createdAt > dayAgo) {
            count++;
          }
        }
      }

      return count;
    } catch (error) {
      console.error('Failed to count user entries in last 24 hours:', error.message);
      return 0;
    }
  }

  /**
   * Check if user has completed a link within cooldown period
   * @param {string} userId - The user ID
   * @param {number} cooldownSeconds - Cooldown period in seconds
   * @returns {Promise<boolean>} - True if user is within cooldown, false otherwise
   */
  async isUserInCooldown(userId, cooldownSeconds = 3600) { // Default 1 hour cooldown
    try {
      if (!userId) {
        return false;
      }

      const userHistoryKey = `linkvertise-history-${userId}`;
      const userHistory = await this.db.get(userHistoryKey) || [];
      
      const now = Date.now();
      const cooldownTime = cooldownSeconds * 1000; // Convert to milliseconds

      for (const linkId of userHistory) {
        const linkData = await this.db.get(`linkvertise-${linkId}`);
        if (linkData) {
          const createdAt = new Date(linkData.created_at).getTime();
          const timeSinceCreation = now - createdAt;
          
          if (timeSinceCreation < cooldownTime) {
            return true; // User is in cooldown
          }
        }
      }

      return false;
    } catch (error) {
      console.error('Failed to check user cooldown:', error.message);
      return false;
    }
  }
  
  /**
   * Add a link to user's history
   * @param {string} userId - The user ID
   * @param {string} linkId - The link UUID
   * @returns {Promise<boolean>} - True if successful, false otherwise
   */
  async addToUserHistory(userId, linkId) {
    try {
      if (!userId || !linkId) {
        return false;
      }

      const userHistoryKey = `linkvertise-history-${userId}`;
      let userHistory = await this.db.get(userHistoryKey) || [];
      
      // Add to the beginning of the array (most recent first)
      userHistory.unshift(linkId);
      
      // Limit to 100 entries to prevent unlimited growth
      if (userHistory.length > 100) {
        userHistory = userHistory.slice(0, 100);
      }
      
      await this.db.set(userHistoryKey, userHistory);
      return true;
    } catch (error) {
      console.error('Failed to add to user history:', error.message);
      return false;
    }
  }

  /**
   * Track daily linkvertise usage for a user
   * @param {string} userId - The user ID
   * @returns {Promise<boolean>} - True if successful, false otherwise
   */
  async trackDailyUsage(userId) {
    try {
      if (!userId) {
        return false;
      }

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const dailyUsageKey = `linkvertise-daily-${userId}-${today}`;
      
      let usageCount = await this.db.get(dailyUsageKey) || 0;
      usageCount++;
      
      // Set with 24 hour expiry (86400 seconds)
      await this.db.set(dailyUsageKey, usageCount);
      
      console.log(`[LinkvertiseService] Daily usage tracked for user ${userId}: ${usageCount} times today`);
      return true;
    } catch (error) {
      console.error('[LinkvertiseService] Failed to track daily usage:', error.message);
      return false;
    }
  }

  /**
   * Get daily linkvertise usage count for a user
   * @param {string} userId - The user ID
   * @returns {Promise<number>} - Number of times used today
   */
  async getDailyUsageCount(userId) {
    try {
      if (!userId) {
        return 0;
      }

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const dailyUsageKey = `linkvertise-daily-${userId}-${today}`;
      
      const usageCount = await this.db.get(dailyUsageKey) || 0;
      return usageCount;
    } catch (error) {
      console.error('[LinkvertiseService] Failed to get daily usage count:', error.message);
      return 0;
    }
  }

  /**
   * Check if user has reached daily limit
   * @param {string} userId - The user ID
   * @param {number} dailyLimit - Maximum uses per day (0 = unlimited)
   * @returns {Promise<boolean>} - True if limit reached, false otherwise
   */
  async hasReachedDailyLimit(userId, dailyLimit) {
    try {
      if (!userId || dailyLimit === 0) {
        return false; // No limit
      }

      const usageCount = await this.getDailyUsageCount(userId);
      return usageCount >= dailyLimit;
    } catch (error) {
      console.error('[LinkvertiseService] Failed to check daily limit:', error.message);
      return false;
    }
  }
}

module.exports = LinkvertiseService;