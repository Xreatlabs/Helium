/**
 * API Key Manager for Helium Dashboard
 * Handles generation, validation, and management of API keys
 */

const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class ApiKeyManager {
  constructor(dbPath) {
    this.db = new sqlite3.Database(dbPath);
  }

  /**
   * Generate a secure API key
   * @returns {string} Generated API key
   */
  generateApiKey() {
    const prefix = 'hlm_';
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return prefix + randomBytes;
  }

  /**
   * Create a new API key
   * @param {string} keyName - Name/description for the key
   * @param {string} permissions - JSON string of permissions
   * @param {string} createdBy - Discord ID of creator
   * @returns {Promise<Object>} Created API key info
   */
  createApiKey(keyName, permissions, createdBy) {
    return new Promise((resolve, reject) => {
      const apiKey = this.generateApiKey();
      const query = `
        INSERT INTO api_keys (key_name, api_key, permissions, created_by, enabled)
        VALUES (?, ?, ?, ?, 1)
      `;

      this.db.run(query, [keyName, apiKey, permissions, createdBy], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            key_name: keyName,
            api_key: apiKey,
            permissions: permissions,
            created_by: createdBy,
            enabled: true
          });
        }
      });
    });
  }

  /**
   * Validate an API key
   * @param {string} apiKey - The API key to validate
   * @returns {Promise<Object|null>} API key info if valid, null otherwise
   */
  validateApiKey(apiKey) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM api_keys 
        WHERE api_key = ? AND enabled = 1
      `;

      this.db.get(query, [apiKey], (err, row) => {
        if (err) {
          reject(err);
        } else {
          if (row) {
            this.updateLastUsed(apiKey);
          }
          resolve(row || null);
        }
      });
    });
  }

  /**
   * Update last used timestamp for an API key
   * @param {string} apiKey - The API key
   */
  updateLastUsed(apiKey) {
    const query = `
      UPDATE api_keys 
      SET last_used_at = datetime('now')
      WHERE api_key = ?
    `;

    this.db.run(query, [apiKey], (err) => {
      if (err) console.error('Error updating last_used_at:', err);
    });
  }

  /**
   * Get all API keys
   * @returns {Promise<Array>} List of all API keys
   */
  getAllApiKeys() {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM api_keys ORDER BY created_at DESC`;

      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * Delete an API key
   * @param {number} keyId - ID of the key to delete
   * @returns {Promise<boolean>} Success status
   */
  deleteApiKey(keyId) {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM api_keys WHERE id = ?`;

      this.db.run(query, [keyId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  /**
   * Toggle API key enabled status
   * @param {number} keyId - ID of the key
   * @param {boolean} enabled - New enabled status
   * @returns {Promise<boolean>} Success status
   */
  toggleApiKey(keyId, enabled) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE api_keys 
        SET enabled = ?, updated_at = datetime('now')
        WHERE id = ?
      `;

      this.db.run(query, [enabled ? 1 : 0, keyId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  /**
   * Check if API key has specific permission
   * @param {Object} apiKeyInfo - API key info object
   * @param {string} permission - Permission to check
   * @returns {boolean} Whether key has permission
   */
  hasPermission(apiKeyInfo, permission) {
    try {
      const permissions = JSON.parse(apiKeyInfo.permissions);
      return permissions.includes('*') || permissions.includes(permission);
    } catch (e) {
      return false;
    }
  }

  /**
   * Close database connection
   */
  close() {
    this.db.close();
  }
}

module.exports = ApiKeyManager;
