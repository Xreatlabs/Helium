/**
 * Modern Session Store for Helium
 * Using better-sqlite3-session-store for reliable session persistence
 */

const session = require('express-session');
const SQLiteStore = require('better-sqlite3-session-store')(session);
const Database = require('better-sqlite3');

function createSessionStore(dbPath) {
  const db = new Database(dbPath, { 
    verbose: console.log 
  });
  
  // Create sessions table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      expires INTEGER NOT NULL,
      data TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);
  `);
  
  return new SQLiteStore({
    client: db,
    expired: {
      clear: true,
      intervalMs: 900000 // Clear expired sessions every 15 minutes
    }
  });
}

module.exports = createSessionStore;

