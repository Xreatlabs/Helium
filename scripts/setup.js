/**
 * Initial Setup Script
 * Copies example configuration files to actual config files if they don't exist
 * Run with: node scripts/setup.js
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Helium Setup\n');

// Check if settings.json exists
const settingsPath = path.join(__dirname, '../settings.json');
const settingsExamplePath = path.join(__dirname, '../settings.example.json');

if (!fs.existsSync(settingsPath)) {
  if (fs.existsSync(settingsExamplePath)) {
    fs.copyFileSync(settingsExamplePath, settingsPath);
    console.log('✅ Created settings.json from settings.example.json');
    console.log('   → Please edit settings.json with your configuration\n');
  } else {
    console.log('❌ Error: settings.example.json not found\n');
    process.exit(1);
  }
} else {
  console.log('✓ settings.json already exists (keeping your configuration)\n');
}

// Check if .env exists
const envPath = path.join(__dirname, '../.env');
const envExamplePath = path.join(__dirname, '../.env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Created .env from .env.example');
    console.log('   → Please edit .env with your environment variables\n');
  } else {
    console.log('ℹ️  .env.example not found (optional)\n');
  }
} else {
  console.log('✓ .env already exists (keeping your configuration)\n');
}

console.log('📝 Next Steps:');
console.log('   1. Edit settings.json with your Pterodactyl & Discord credentials');
console.log('   2. Run: npm install');
console.log('   3. Run: npm run migrate');
console.log('   4. Run: npm start\n');

console.log('✨ Setup complete!\n');
