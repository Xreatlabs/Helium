/**
 * Test script for Discord webhook logging system
 */

const log = require('./misc/log');

console.log('🔔 Testing Discord Webhook Logging System\n');

console.log('📝 Sending test log message...');
log('signup', 'Test user created account - This is a test message from the webhook system');

console.log('\n✅ Test message sent!');
console.log('📱 Check your Discord channel to see if the webhook message appeared');
console.log('\nIf you see the message in Discord, the webhook system is working correctly!');
console.log('If not, please check:');
console.log('  1. Webhook ID and Token are correct in settings.json');
console.log('  2. Logging is enabled (status: true)');
console.log('  3. The action "signup" is enabled in logging.actions.user');
console.log('  4. Check console for any error messages\n');
