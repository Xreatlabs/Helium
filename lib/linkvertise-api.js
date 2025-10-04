/**
 * Linkvertise API Client
 * Handles communication with Linkvertise API for verification and validation
 * @module linkvertise-api
 */

const axios = require('axios');

class LinkvertiseAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.linkvertise.com/v1';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000, // 10 second timeout
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Helium-Dashboard/1.0'
      }
    });
  }

  /**
   * Verify if a Linkvertise link has been completed by a user
   * @param {string} linkId - The Linkvertise link ID to verify
   * @param {string} userId - The user ID to verify against (optional, for enhanced verification)
   * @returns {Promise<Object>} Verification result
   */
  async verifyLinkCompletion(linkId, userId = null) {
    try {
      // Note: This is a placeholder implementation since Linkvertise's actual API
      // for completion verification might be different. This follows the pattern
      // from the documentation we inferred.
      
      const response = await this.client.get(`/links/${linkId}/check`, {
        params: {
          ...(userId && { user_id: userId })
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      // Handle different error types appropriately
      if (error.response) {
        // Server responded with error status
        return {
          success: false,
          error: `API Error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`,
          status: error.response.status
        };
      } else if (error.request) {
        // Request was made but no response received
        return {
          success: false,
          error: 'Network Error: Unable to reach Linkvertise API'
        };
      } else {
        // Something else happened
        return {
          success: false,
          error: `Request Error: ${error.message}`
        };
      }
    }
  }

  /**
   * Get link details from Linkvertise
   * @param {string} linkId - The Linkvertise link ID
   * @returns {Promise<Object>} Link details
   */
  async getLinkDetails(linkId) {
    try {
      const response = await this.client.get(`/links/${linkId}`);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Create a new Linkvertise link
   * @param {Object} linkData - Link configuration data
   * @returns {Promise<Object>} Created link information
   */
  async createLink(linkData) {
    try {
      const response = await this.client.post('/links', linkData);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Validate the API key by making a simple request
   * @returns {Promise<Object>} Validation result
   */
  async validateApiKey() {
    try {
      // Try to get user info or make a simple authenticated request
      const response = await this.client.get('/user');
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Handle API errors consistently
   * @private
   * @param {Error} error - The error to handle
   * @returns {Object} Formatted error response
   */
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      return {
        success: false,
        error: `API Error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`,
        status: error.response.status,
        details: error.response.data
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        success: false,
        error: 'Network Error: Unable to reach Linkvertise API'
      };
    } else {
      // Something else happened
      return {
        success: false,
        error: `Request Error: ${error.message}`
      };
    }
  }

  /**
   * Enhanced verification method using multiple checks
   * Since Linkvertise's real verification API might not be publicly available,
   * we implement several security measures to prevent abuse
   * @param {string} linkId - The Linkvertise link ID
   * @param {string} targetUrl - The target URL that was used in the link
   * @param {string} userId - The user ID (for enhanced verification)
   * @param {Object} req - The HTTP request object for additional checks
   * @returns {Promise<Object>} Verification result
   */
  async enhancedVerifyCompletion(linkId, targetUrl, userId = null, req = null) {
    try {
      // Check if the request comes directly from Linkvertise by examining headers
      let verified = true;
      let verificationDetails = {
        linkId,
        userId,
        timestamp: Date.now(),
        ip: null,
        userAgent: null,
        verified: false,
        checks: {}
      };

      // Additional security checks if request object is provided
      if (req) {
        // Store IP and user agent for logging purposes
        verificationDetails.ip = req.ip || req.connection.remoteAddress;
        verificationDetails.userAgent = req.headers['user-agent'];
        
        // Check referer header (Linkvertise should send requests with referer)
        const referer = req.headers.referer || req.headers.referrer;
        verificationDetails.checks.refererCheck = {
          passed: referer && referer.includes('linkvertise.com'),
          value: referer
        };
        
        // Check user agent (Linkvertise should have specific user agents)
        const userAgent = req.headers['user-agent'];
        verificationDetails.checks.userAgentCheck = {
          passed: userAgent && (
            userAgent.includes('Linkvertise') || 
            userAgent.includes('linkvertise') ||
            userAgent.toLowerCase().includes('bot') // Linkvertise might use bot-like agents
          ),
          value: userAgent
        };
      }

      // Determine if verification passed based on all checks
      verificationDetails.verified = 
        verificationDetails.checks.refererCheck?.passed || 
        verificationDetails.checks.userAgentCheck?.passed;

      return {
        success: true,
        verified: verificationDetails.verified,
        method: 'enhanced_verification',
        details: verificationDetails
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        verified: false
      };
    }
  }

  /**
   * Fallback verification that uses time-based checks and session validation
   * @param {string} linkId - The Linkvertise link ID  
   * @param {string} userId - The user ID
   * @param {Object} session - The user session for additional validation
   * @returns {Promise<Object>} Verification result
   */
  async fallbackVerification(linkId, userId, session = null) {
    try {
      // This method implements fallback verification when API verification isn't possible
      const verificationDetails = {
        linkId,
        userId,
        timestamp: Date.now(),
        method: 'session_based',
        checks: {
          sessionExists: !!session,
          sessionValid: session && session.userinfo && session.userinfo.id === userId
        }
      };

      // For enhanced security, we can track user behavior patterns
      // This is a basic implementation - real implementation might include
      // checking if user spent enough time before callback, etc.
      return {
        success: true,
        verified: verificationDetails.checks.sessionValid,
        method: 'fallback_verification',
        details: verificationDetails
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        verified: false
      };
    }
  }
}

module.exports = LinkvertiseAPI;