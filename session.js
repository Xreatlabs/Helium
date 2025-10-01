const Keyv = require('keyv').default;
const { Store } = require('express-session');

class KeyvStore extends Store {
  constructor(options) {
    super();
    // Use a namespace for sessions to avoid conflicts
    this.keyv = new Keyv(options.uri, {
      ...options,
      namespace: 'session' // This will prefix all keys with 'session:'
    });
    this.keyv.on('error', err => console.error('Keyv connection error:', err));
    
    // Set TTL for sessions (24 hours by default)
    this.ttl = options.ttl || 86400000;
  }

  async get(sid, callback) {
    try {
      // Don't add prefix - Keyv handles it automatically
      const data = await this.keyv.get(sid);
      if (data) {
        // Check if session has expired
        if (data._expires && data._expires < Date.now()) {
          console.log(`Session expired: ${sid}`);
          await this.keyv.delete(sid);
          callback(null, null);
          return;
        }
        console.log(`Session retrieved: ${sid}, has userinfo: ${!!data.userinfo}`);
      } else {
        console.log(`Session NOT found: ${sid}`);
      }
      callback(null, data);
    } catch (err) {
      console.error(`Error getting session: ${sid}`, err);
      callback(err);
    }
  }

  async set(sid, session, callback) {
    try {
      // Don't add prefix - Keyv handles it automatically
      // Add expiration timestamp to session
      const sessionWithExpiry = {
        ...session,
        _expires: Date.now() + this.ttl
      };
      
      // Set with TTL
      await this.keyv.set(sid, sessionWithExpiry, this.ttl);
      console.log(`Session stored: ${sid}, has userinfo: ${!!session.userinfo}`);
      callback(null);
    } catch (err) {
      console.error(`Error setting session: ${sid}`, err);
      callback(err);
    }
  }

  async destroy(sid, callback) {
    try {
      // Don't add prefix - Keyv handles it automatically
      await this.keyv.delete(sid);
      console.log(`Session destroyed: ${sid}`);
      if (callback) callback(null);
    } catch (err) {
      console.error(`Error destroying session: ${sid}`, err);
      if (callback) callback(err);
    }
  }

  async touch(sid, session, callback) {
    try {
      // Don't add prefix - Keyv handles it automatically
      // Refresh session TTL
      const existing = await this.keyv.get(sid);
      if (existing) {
        const sessionWithExpiry = {
          ...session,
          _expires: Date.now() + this.ttl
        };
        await this.keyv.set(sid, sessionWithExpiry, this.ttl);
      }
      callback(null);
    } catch (err) {
      console.error(`Error touching session: ${sid}`, err);
      callback(err);
    }
  }
}

module.exports = KeyvStore;
