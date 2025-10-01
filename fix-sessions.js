/**
 * Fix sessions table schema
 */

const Database = require('better-sqlite3');

console.log('Fixing sessions table schema...');

const db = new Database('./database.sqlite');

try {
  // Drop the old sessions table
  db.exec('DROP TABLE IF EXISTS sessions;');
  console.log('✓ Dropped old sessions table');
  
  // Let better-sqlite3-session-store create the correct table
  console.log('✓ Database is ready for the new session store');
  
} catch (error) {
  console.error('Error fixing database:', error);
} finally {
  db.close();
  console.log('✓ Database connection closed');
}
