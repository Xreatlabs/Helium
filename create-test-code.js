const settings = require('./settings.json');
const Keyv = require('keyv').default;
const { KeyvSqlite } = require('@keyv/sqlite');

const sqliteStore = new KeyvSqlite({
  uri: settings.database,
  busyTimeout: 10000
});

const db = new Keyv({
  store: sqliteStore,
  namespace: 'helium'
});

const testCode = {
  code: 'FAIRNODES2024',
  rewards: {
    coins: 1000,
    ram: 2048,
    disk: 10240,
    cpu: 100,
    servers: 1
  },
  maxUses: 100,
  maxUsesPerUser: 1,
  uses: 0,
  usedBy: {},
  createdAt: Date.now(),
  createdBy: 'system',
  expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
};

(async () => {
  try {
    await db.set('code-FAIRNODES2024', testCode);
    const allCodes = (await db.get('all-codes')) || [];
    if (!allCodes.includes('FAIRNODES2024')) {
      allCodes.push('FAIRNODES2024');
      await db.set('all-codes', allCodes);
    }
    console.log('✅ Test code created successfully!');
    console.log('');
    console.log('Code: FAIRNODES2024');
    console.log('Rewards:');
    console.log('  - 1000 coins');
    console.log('  - 2048 MB RAM');
    console.log('  - 10240 MB Disk (10 GB)');
    console.log('  - 100% CPU');
    console.log('  - 1 server slot');
    console.log('');
    console.log('Max Uses: 100 (total)');
    console.log('Max Uses Per User: 1');
    console.log('Expires: 30 days');
    console.log('');
    console.log('Test it in Discord with:');
    console.log('  /redeemcode code:FAIRNODES2024');
    console.log('  OR');
    console.log('  !code FAIRNODES2024');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
