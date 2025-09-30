/**
 * Pterodactyl API Client with retry logic, rate limiting, and caching
 * @module PteroClient
 */

const axios = require('axios');
const NodeCache = require('node-cache');

class PteroClient {
  constructor(domain, apiKey, options = {}) {
    this.domain = domain.endsWith('/') ? domain.slice(0, -1) : domain;
    this.apiKey = apiKey;
    
    // Configuration
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.cacheTTL = options.cacheTTL || 60; // 60 seconds default
    
    // Cache setup
    this.cache = new NodeCache({ stdTTL: this.cacheTTL });
    
    // Rate limit tracking
    this.rateLimitReset = null;
    this.rateLimitRemaining = null;
  }

  /**
   * Make an authenticated request to Pterodactyl API with retry and backoff
   * @private
   */
  async _request(method, endpoint, data = null, retryCount = 0) {
    const url = `${this.domain}/api/application${endpoint}`;
    
    const config = {
      method,
      url,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };
    
    if (data) {
      config.data = data;
    }
    
    try {
      const response = await axios(config);
      
      // Update rate limit info
      if (response.headers['x-ratelimit-remaining']) {
        this.rateLimitRemaining = parseInt(response.headers['x-ratelimit-remaining']);
      }
      if (response.headers['x-ratelimit-reset']) {
        this.rateLimitReset = new Date(parseInt(response.headers['x-ratelimit-reset']) * 1000);
      }
      
      return response.data;
    } catch (error) {
      // Handle rate limiting (429)
      if (error.response && error.response.status === 429) {
        const retryAfter = error.response.headers['retry-after'] 
          ? parseInt(error.response.headers['retry-after']) * 1000 
          : this.retryDelay * Math.pow(2, retryCount);
        
        if (retryCount < this.maxRetries) {
          console.log(`Rate limited. Retrying after ${retryAfter}ms...`);
          await this._sleep(retryAfter);
          return this._request(method, endpoint, data, retryCount + 1);
        }
        throw new Error('Rate limit exceeded. Max retries reached.');
      }
      
      // Handle server errors with exponential backoff
      if (error.response && error.response.status >= 500 && retryCount < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, retryCount);
        console.log(`Server error. Retrying after ${delay}ms... (${retryCount + 1}/${this.maxRetries})`);
        await this._sleep(delay);
        return this._request(method, endpoint, data, retryCount + 1);
      }
      
      throw error;
    }
  }

  /**
   * Sleep helper for retry delays
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check - verify API connectivity
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const data = await this._request('GET', '/users?per_page=1');
      return {
        status: 'healthy',
        message: 'Successfully connected to Pterodactyl API',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message || 'Failed to connect to Pterodactyl API',
        timestamp: new Date().toISOString(),
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Get a single server by ID (with caching)
   * @param {string|number} serverId - Server ID
   * @param {boolean} fresh - Skip cache and fetch fresh data
   * @returns {Promise<Object>} Server data
   */
  async getServer(serverId, fresh = false) {
    const cacheKey = `server_${serverId}`;
    
    if (!fresh) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    const data = await this._request('GET', `/servers/${serverId}?include=allocations,user`);
    this.cache.set(cacheKey, data);
    return data;
  }

  /**
   * List all servers (with caching)
   * @param {Object} options - Query options
   * @param {boolean} fresh - Skip cache and fetch fresh data
   * @returns {Promise<Array>} Array of servers
   */
  async listServers(options = {}, fresh = false) {
    const cacheKey = `servers_${JSON.stringify(options)}`;
    
    if (!fresh) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    const params = new URLSearchParams(options).toString();
    const endpoint = `/servers${params ? '?' + params : ''}`;
    const data = await this._request('GET', endpoint);
    
    this.cache.set(cacheKey, data);
    return data;
  }

  /**
   * Get a user by ID
   * @param {string|number} userId - User ID
   * @param {boolean} fresh - Skip cache and fetch fresh data
   * @returns {Promise<Object>} User data
   */
  async getUser(userId, fresh = false) {
    const cacheKey = `user_${userId}`;
    
    if (!fresh) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    const data = await this._request('GET', `/users/${userId}?include=servers`);
    this.cache.set(cacheKey, data);
    return data;
  }

  /**
   * List all users
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of users
   */
  async listUsers(options = {}) {
    const params = new URLSearchParams(options).toString();
    const endpoint = `/users${params ? '?' + params : ''}`;
    return await this._request('GET', endpoint);
  }

  /**
   * Update server build configuration
   * @param {string|number} serverId - Server ID
   * @param {Object} buildData - Build configuration
   * @returns {Promise<Object>} Updated server data
   */
  async updateServerBuild(serverId, buildData) {
    this.cache.del(`server_${serverId}`);
    return await this._request('PATCH', `/servers/${serverId}/build`, buildData);
  }

  /**
   * Suspend a server
   * @param {string|number} serverId - Server ID
   * @returns {Promise<void>}
   */
  async suspendServer(serverId) {
    this.cache.del(`server_${serverId}`);
    return await this._request('POST', `/servers/${serverId}/suspend`);
  }

  /**
   * Unsuspend a server
   * @param {string|number} serverId - Server ID
   * @returns {Promise<void>}
   */
  async unsuspendServer(serverId) {
    this.cache.del(`server_${serverId}`);
    return await this._request('POST', `/servers/${serverId}/unsuspend`);
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.flushAll();
  }

  /**
   * Get rate limit information
   * @returns {Object} Rate limit info
   */
  getRateLimitInfo() {
    return {
      remaining: this.rateLimitRemaining,
      reset: this.rateLimitReset,
    };
  }
}

module.exports = PteroClient;
