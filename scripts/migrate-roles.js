/**
 * Migration script for Discord Roles system
 * Run this to create the necessary database tables
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');
const migrationPath = path.join(__dirname, '../migrations/003_discord_roles.sql');

try {
  console.log('Running Discord Roles migration...');
  
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
  console.log('  - discord_roles');
  console.log('  - user_discord_roles');
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
