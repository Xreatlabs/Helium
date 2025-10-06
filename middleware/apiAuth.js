/**
 * API Key Authentication Middleware for Helium Dashboard
 */

const ApiKeyManager = require('../managers/ApiKeyManager');
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');
const apiKeyManager = new ApiKeyManager(dbPath);

/**
 * Middleware to validate API key from request headers
 * @param {Array<string>} requiredPermissions - Optional permissions to check
 */
function requireApiKey(requiredPermissions = []) {
  return async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header. Use: Authorization: Bearer <api_key>'
      });
    }

    const apiKey = authHeader.substring(7);

    try {
      const apiKeyInfo = await apiKeyManager.validateApiKey(apiKey);

      if (!apiKeyInfo) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or disabled API key'
        });
      }

      if (requiredPermissions.length > 0) {
        const hasAllPermissions = requiredPermissions.every(perm => 
          apiKeyManager.hasPermission(apiKeyInfo, perm)
        );

        if (!hasAllPermissions) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'API key does not have required permissions',
            required: requiredPermissions
          });
        }
      }

      req.apiKeyInfo = apiKeyInfo;
      next();
    } catch (error) {
      console.error('API key validation error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to validate API key'
      });
    }
  };
}

module.exports = {
  requireApiKey,
  apiKeyManager
};
