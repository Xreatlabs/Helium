const Keyv = require('keyv').default;
const { KeyvSqlite } = require('@keyv/sqlite');
const settings = require('./settings.json');
const readline = require('readline');

const sqliteStore = new KeyvSqlite({
  uri: settings.database,
  busyTimeout: 10000
});

const db = new Keyv({
  store: sqliteStore,
  namespace: 'helium'
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function checkAccount() {
  rl.question('Enter your Discord ID: ', async (discordId) => {
    console.log(`\nChecking account for Discord ID: ${discordId}\n`);
    
    const pteroUserId = await db.get(`users-${discordId}`);
    const userInfo = await db.get(`userinfo-${discordId}`);
    const pteroKey = await db.get(`ptero-${discordId}`);
    
    console.log(`Pterodactyl User ID (users-${discordId}):`, pteroUserId);
    console.log(`Type:`, typeof pteroUserId);
    console.log(`\nUser Info (userinfo-${discordId}):`, userInfo);
    console.log(`\nPtero Key (ptero-${discordId}):`, pteroKey);
    
    if (typeof pteroUserId === 'object') {
      console.log('\n⚠️  ERROR: Pterodactyl User ID is an object, should be a number!');
      console.log('You need to logout and login again, or run the fix script.');
    } else if (pteroUserId) {
      console.log('\n✓ Account looks good! Pterodactyl user ID is set correctly.');
    } else {
      console.log('\n✗ No Pterodactyl user ID found. You need to login.');
    }
    
    await db.disconnect();
    rl.close();
  });
}

checkAccount().catch(console.error);
