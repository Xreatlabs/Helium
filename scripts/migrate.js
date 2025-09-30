/**
 * Database Migration Script
 * Run with: npm run migrate
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const settings = require('../settings.json');

const dbPath = settings.database.replace('sqlite://', '');
const db = new sqlite3.Database(dbPath);

console.log('Running database migrations...');

// Read migration file
const migrationPath = path.join(__dirname, '../migrations/001_discord_webhooks.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

// Split by semicolon to execute multiple statements
const statements = migrationSQL
  .split(';')
  .map(stmt => stmt.trim())
  .filter(stmt => stmt.length > 0);

db.serialize(() => {
  statements.forEach((stmt, index) => {
    db.run(stmt, (err) => {
      if (err) {
        console.error(`Error executing statement ${index + 1}:`, err);
      } else {
        console.log(`✓ Executed statement ${index + 1}`);
      }
    });
  });
});

db.close((err) => {
  if (err) {
    console.error('Error closing database:', err);
  } else {
    console.log('\n✅ Migration completed successfully!');
  }
});
