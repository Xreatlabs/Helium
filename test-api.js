/**
 * Quick API Test Script
 * Usage: node test-api.js <your_api_key>
 */

const axios = require('axios');

const apiKey = process.argv[2];
const apiUrl = process.env.API_URL || 'http://localhost:3000';

if (!apiKey) {
  console.log('\n❌ Please provide an API key!');
  console.log('Usage: node test-api.js YOUR_API_KEY\n');
  console.log('Example: node test-api.js hlm_abc123...\n');
  process.exit(1);
}

const api = axios.create({
  baseURL: apiUrl,
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
});

async function runTests() {
  console.log('\n🧪 Testing Dashboard API...');
  console.log(`📍 API URL: ${apiUrl}\n`);

  // Test 1: Health Check
  console.log('1️⃣  Testing health endpoint...');
  try {
    const response = await api.get('/api/dashboard/health');
    console.log('   ✅ Health check passed!');
    console.log(`   Dashboard: ${response.data.data.dashboard}`);
    console.log(`   Pterodactyl: ${response.data.data.pterodactyl}\n`);
  } catch (error) {
    console.log('   ❌ Health check failed!');
    console.log(`   Error: ${error.response?.data?.message || error.message}\n`);
    return;
  }

  // Test 2: Stats
  console.log('2️⃣  Testing stats endpoint...');
  try {
    const response = await api.get('/api/dashboard/stats');
    console.log('   ✅ Stats retrieved successfully!');
    console.log(`   Total Users: ${response.data.data.totalUsers}`);
    console.log(`   Total Servers: ${response.data.data.totalServers}\n`);
  } catch (error) {
    console.log('   ❌ Stats retrieval failed!');
    console.log(`   Error: ${error.response?.data?.message || error.message}\n`);
  }

  // Test 3: Packages
  console.log('3️⃣  Testing packages endpoint...');
  try {
    const response = await api.get('/api/dashboard/packages');
    const packages = Object.keys(response.data.data.packages);
    console.log('   ✅ Packages retrieved successfully!');
    console.log(`   Available packages: ${packages.join(', ')}\n`);
  } catch (error) {
    console.log('   ❌ Packages retrieval failed!');
    console.log(`   Error: ${error.response?.data?.message || error.message}\n`);
  }

  console.log('✅ API is working correctly!');
  console.log('\n📝 Your API key has the necessary permissions.');
  console.log('🤖 You can now use this key in your Discord bot!\n');
}

runTests().catch(error => {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
});
