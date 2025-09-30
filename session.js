const Keyv = require('keyv');
const { Store } = require('express-session');

class KeyvStore extends Store {
  constructor(options) {
    super();
    this.keyv = new Keyv(options.uri, options);
    this.keyv.on('error', err => console.error('Keyv connection error:', err));
    
    // Set TTL for sessions (24 hours by default)
    this.ttl = options.ttl || 86400000;
  }

  async get(sid, callback) {
    try {
      const data = await this.keyv.get(sid);
      if (data) {
        // Check if session has expired
        if (data._expires && data._expires < Date.now()) {
          console.log(`Session expired: ${sid}`);
          await this.keyv.delete(sid);
          callback(null, null);
          return;
        }
      }
      callback(null, data);
    } catch (err) {
      console.error(`Error getting session: ${sid}`, err);
      callback(err);
    }
  }

  async set(sid, session, callback) {
    try {
      // Add expiration timestamp to session
      const sessionWithExpiry = {
        ...session,
        _expires: Date.now() + this.ttl
      };
      
      // Set with TTL
      await this.keyv.set(sid, sessionWithExpiry, this.ttl);
      callback(null);
    } catch (err) {
      console.error(`Error setting session: ${sid}`, err);
      callback(err);
    }
  }

  async destroy(sid, callback) {
    try {
      await this.keyv.delete(sid);
      if (callback) callback(null);
    } catch (err) {
      console.error(`Error destroying session: ${sid}`, err);
      if (callback) callback(err);
    }
  }

  async touch(sid, session, callback) {
    try {
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
