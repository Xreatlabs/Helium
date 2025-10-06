/**
 * Test script for Helium Dashboard Bot API
 * This script tests all major API endpoints to verify they're working correctly
 */

const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:19133';
const API_KEY = 'hlm_2f45c6e7383be7c3883b04bb47a9443230987c45e039d036b472b3df43ef1a00';
const TEST_DISCORD_ID = '917098673127694428'; // Replace with your Discord ID

// Create API client
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, message) {
  const status = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${status}\x1b[0m ${name}`);
  if (message) {
    console.log(`  ${message}`);
  }
  
  results.tests.push({ name, passed, message });
  if (passed) results.passed++;
  else results.failed++;
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('Testing Helium Dashboard Bot API');
  console.log('='.repeat(60));
  console.log('');

  // Test 1: Health Check
  try {
    const response = await api.get('/api/dashboard/health');
    const data = response.data;
    logTest(
      'Health Check',
      data.success && data.data.dashboard === 'online',
      `Dashboard: ${data.data.dashboard}, Pterodactyl: ${data.data.pterodactyl}`
    );
  } catch (error) {
    logTest('Health Check', false, error.message);
  }

  // Test 2: Statistics
  try {
    const response = await api.get('/api/dashboard/stats');
    const data = response.data;
    logTest(
      'Get Statistics',
      data.success && typeof data.data.totalUsers === 'number',
      `Users: ${data.data.totalUsers}, Servers: ${data.data.totalServers}`
    );
  } catch (error) {
    logTest('Get Statistics', false, error.message);
  }

  // Test 3: Get Packages
  try {
    const response = await api.get('/api/dashboard/packages');
    const data = response.data;
    logTest(
      'Get Packages',
      data.success && data.data.packages,
      `Available packages: ${Object.keys(data.data.packages).join(', ')}`
    );
  } catch (error) {
    logTest('Get Packages', false, error.message);
  }

  // Test 4: Get Settings
  try {
    const response = await api.get('/api/dashboard/settings');
    const data = response.data;
    logTest(
      'Get Settings',
      data.success && data.data.name,
      `Dashboard: ${data.data.name}`
    );
  } catch (error) {
    logTest('Get Settings', false, error.message);
  }

  // Test 5: Get User Info
  try {
    const response = await api.get(`/api/dashboard/users/${TEST_DISCORD_ID}`);
    const data = response.data;
    logTest(
      'Get User Info',
      data.success && data.data.discordId === TEST_DISCORD_ID,
      `Coins: ${data.data.coins}, Package: ${data.data.packageName || 'default'}`
    );
  } catch (error) {
    logTest('Get User Info', false, error.message);
  }

  // Test 6: Get User Servers
  try {
    const response = await api.get(`/api/dashboard/servers?discordId=${TEST_DISCORD_ID}`);
    const data = response.data;
    const serverCount = data.data.data.length;
    logTest(
      'Get User Servers',
      data.success && Array.isArray(data.data.data),
      `Found ${serverCount} server(s)`
    );
    
    // Show server names
    if (serverCount > 0) {
      data.data.data.forEach((server, i) => {
        console.log(`    ${i + 1}. ${server.attributes.name} (ID: ${server.attributes.id})`);
      });
    }
  } catch (error) {
    logTest('Get User Servers', false, error.message);
  }

  // Test 7: Get All Servers (no filter)
  try {
    const response = await api.get('/api/dashboard/servers?per_page=5');
    const data = response.data;
    logTest(
      'Get All Servers',
      data.success && data.data.meta,
      `Total servers: ${data.data.meta.pagination.total}`
    );
  } catch (error) {
    logTest('Get All Servers', false, error.message);
  }

  // Summary
  console.log('');
  console.log('='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`\x1b[32mPassed: ${results.passed}\x1b[0m`);
  console.log(`\x1b[31mFailed: ${results.failed}\x1b[0m`);
  console.log('');

  if (results.failed === 0) {
    console.log('\x1b[32m✓ All tests passed! Your API is working correctly.\x1b[0m');
    console.log('');
    console.log('You can now use this API key in your Discord bot:');
    console.log(`API Key: ${API_KEY}`);
    console.log(`API URL: ${API_URL}`);
  } else {
    console.log('\x1b[31m✗ Some tests failed. Please check the errors above.\x1b[0m');
  }
  
  console.log('');
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
