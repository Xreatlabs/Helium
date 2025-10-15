/**
 * Clear all user sessions without deleting user data
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve('./database.sqlite');
console.log(`[ClearSessions] Opening database at ${dbPath}`);

const db = new Database(dbPath);

try {
  // Check if sessions table exists
  const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'").get();
  
  if (tableExists) {
    // Count sessions before deletion
    const countBefore = db.prepare("SELECT COUNT(*) as count FROM sessions").get();
    console.log(`[ClearSessions] Found ${countBefore.count} active sessions`);
    
    // Delete all sessions
    const result = db.prepare("DELETE FROM sessions").run();
    console.log(`[ClearSessions] Deleted ${result.changes} sessions`);
    
    // Verify deletion
    const countAfter = db.prepare("SELECT COUNT(*) as count FROM sessions").get();
    console.log(`[ClearSessions] Remaining sessions: ${countAfter.count}`);
    
    console.log(`[ClearSessions] ✅ All users have been logged out successfully`);
  } else {
    console.log(`[ClearSessions] No sessions table found - sessions may be stored elsewhere`);
  }
} catch (error) {
  console.error(`[ClearSessions] Error:`, error);
} finally {
  db.close();
  console.log(`[ClearSessions] Database closed`);
}
