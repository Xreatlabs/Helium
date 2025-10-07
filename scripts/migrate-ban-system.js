/**
 * Migration script for Ban System
 * Run this to create the necessary database tables
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');
const migrationPath = path.join(__dirname, '../migrations/004_ban_system.sql');

try {
  console.log('Running Ban System migration...');
  
  const db = new Database(dbPath);
  const migration = fs.readFileSync(migrationPath, 'utf8');
  
  // Split by semicolons and execute each statement
  const statements = migration
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  statements.forEach(statement => {
    db.exec(statement);
  });
  
  db.close();
  
  console.log('✅ Migration completed successfully!');
  console.log('Created tables:');
  console.log('  - banned_users');
  console.log('  - ban_history');
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
