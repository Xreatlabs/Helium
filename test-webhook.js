/**
 * Test script for Discord webhook logging system with enhanced embeds
 */

const log = require('./misc/log');

console.log('🔔 Testing Enhanced Discord Webhook Logging System\n');
console.log('━'.repeat(60));

// Test 1: User Signup
console.log('\n📝 Test 1: User Signup Event');
log('signup', 'TestUser#1234 created account', {
    userId: '123456789012345678'
});

// Test 2: Server Creation
console.log('🚀 Test 2: Server Creation Event');
log('create server', 'TestUser#1234 created a new Minecraft server', {
    userId: '123456789012345678',
    serverName: 'My Test Server'
});

// Test 3: Resource Purchase
console.log('💾 Test 3: RAM Purchase Event');
log('buy ram', 'TestUser#1234 bought 2048 MB RAM from the store for 500 coins.', {
    userId: '123456789012345678',
    amount: '500 coins',
    resourceType: '2048 MB RAM'
});

// Test 4: Admin Action
console.log('💰 Test 4: Admin Set Coins Event');
log('set coins', 'AdminUser#9999 set the coins of the user with the ID `987654321098765432` to `1000`.', {
    userId: '987654321098765432',
    amount: '1000 coins'
});

// Test 5: Coupon Creation
console.log('🎟️ Test 5: Coupon Creation Event');
log('create coupon', 'AdminUser#9999 created a new coupon code: WELCOME100', {
    amount: '100 coins'
});

console.log('\n━'.repeat(60));
console.log('\n✅ All test messages sent!');
console.log('📱 Check your Discord channel to see the enhanced webhook embeds');
console.log('\n🎨 Features to look for:');
console.log('  ✓ Color-coded embeds (different colors for different actions)');
console.log('  ✓ Emoji indicators for each action type');
console.log('  ✓ Structured fields showing user ID, amounts, etc.');
console.log('  ✓ Timestamp on each message');
console.log('  ✓ Action type badge (User/Admin)');
console.log('  ✓ Footer with system name');
console.log('\nIf you see colorful, well-structured embeds, the enhancement is working!');
console.log('If not, please check:');
console.log('  1. Webhook ID and Token are correct in settings.json');
console.log('  2. Logging is enabled (status: true)');
console.log('  3. The actions are enabled in logging.actions.user/admin');
console.log('  4. Check console for any error messages\n');
