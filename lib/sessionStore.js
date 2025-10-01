/**
 * Modern Session Store for Helium
 * Using better-sqlite3-session-store for reliable session persistence
 */

const session = require('express-session');
const SQLiteStore = require('better-sqlite3-session-store')(session);
const Database = require('better-sqlite3');
const path = require('path');

// Singleton database instance to share across all workers
let dbInstance = null;

function createSessionStore(dbPath) {
  // Use singleton pattern to avoid multiple database connections
  if (!dbInstance) {
    const absolutePath = path.resolve(dbPath);
    dbInstance = new Database(absolutePath, { 
      // Remove verbose logging
    });
    
    console.log(`[SessionStore] Database initialized at ${absolutePath}`);
  }
  
  return new SQLiteStore({
    client: dbInstance,
    expired: {
      clear: true,
      intervalMs: 900000 // Clear expired sessions every 15 minutes
    }
  });
}

module.exports = createSessionStore;

