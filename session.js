const Keyv = require('keyv').default;
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
      const key = `sess:${sid}`;
      const data = await this.keyv.get(key);
      if (data) {
        // Check if session has expired
        if (data._expires && data._expires < Date.now()) {
          console.log(`Session expired: ${sid}`);
          await this.keyv.delete(key);
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
      const key = `sess:${sid}`;
      // Add expiration timestamp to session
      const sessionWithExpiry = {
        ...session,
        _expires: Date.now() + this.ttl
      };
      
      // Set with TTL
      await this.keyv.set(key, sessionWithExpiry, this.ttl);
      console.log(`Session stored: ${sid}, has userinfo: ${!!session.userinfo}`);
      callback(null);
    } catch (err) {
      console.error(`Error setting session: ${sid}`, err);
      callback(err);
    }
  }

  async destroy(sid, callback) {
    try {
      const key = `sess:${sid}`;
      await this.keyv.delete(key);
      console.log(`Session destroyed: ${sid}`);
      if (callback) callback(null);
    } catch (err) {
      console.error(`Error destroying session: ${sid}`, err);
      if (callback) callback(err);
    }
  }

  async touch(sid, session, callback) {
    try {
      const key = `sess:${sid}`;
      // Refresh session TTL
      const existing = await this.keyv.get(key);
      if (existing) {
        const sessionWithExpiry = {
          ...session,
          _expires: Date.now() + this.ttl
        };
        await this.keyv.set(key, sessionWithExpiry, this.ttl);
      }
      callback(null);
    } catch (err) {
      console.error(`Error touching session: ${sid}`, err);
      callback(err);
    }
  }
}

module.exports = KeyvStore;
