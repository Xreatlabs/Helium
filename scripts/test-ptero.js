/**
 * Pterodactyl API Test Script
 * Tests if the Pterodactyl panel is accessible and API key is valid
 */

const fetch = require('node-fetch');
const path = require('path');
const settings = require(path.join(__dirname, '../settings.json'));

async function testPterodactylAPI() {
  console.log('🔍 Testing Pterodactyl API Connection...\n');
  
  const { domain, key } = settings.pterodactyl;
  
  console.log(`📡 Panel URL: ${domain}`);
  console.log(`🔑 API Key: ${key ? key.substring(0, 8) + '...' : 'NOT SET'}\n`);
  
  if (!domain || !key) {
    console.error('❌ Error: Pterodactyl domain or API key not configured in settings.json');
    process.exit(1);
  }
  
  // Test 1: Basic connectivity
  console.log('1️⃣ Testing basic connectivity...');
  try {
    const response = await fetch(domain, {
      method: 'GET',
      timeout: 10000
    });
    
    if (response.ok) {
      console.log('✅ Panel is accessible');
    } else {
      console.log(`⚠️  Panel returned status: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Cannot reach panel:', error.message);
    console.log('💡 Check if the domain is correct and panel is running');
    return;
  }
  
  // Test 2: API endpoint accessibility
  console.log('\n2️⃣ Testing API endpoint...');
  try {
    const apiUrl = `${domain}/api/application/users`;
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    console.log(`📊 API Response Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log('✅ API endpoint is accessible');
      
      // Test 3: Parse JSON response
      console.log('\n3️⃣ Testing JSON response parsing...');
      try {
        const data = await response.json();
        console.log('✅ JSON response parsed successfully');
        console.log(`📈 Found ${data.data ? data.data.length : 0} users in the system`);
        
        if (data.data && data.data.length > 0) {
          console.log(`👤 Sample user: ${data.data[0].attributes.username} (${data.data[0].attributes.email})`);
        }
        
      } catch (jsonError) {
        console.error('❌ Failed to parse JSON response:', jsonError.message);
        console.log('💡 The API might be returning HTML instead of JSON');
        
        // Show what we actually got
        const responseText = await response.text();
        console.log('\n📄 Response preview:');
        console.log(responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
      }
      
    } else {
      console.error('❌ API endpoint returned error');
      
      // Show error details
      const responseText = await response.text();
      console.log('\n📄 Error response:');
      console.log(responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));
      
      if (response.status === 401) {
        console.log('\n💡 This looks like an authentication error. Check your API key.');
      } else if (response.status === 403) {
        console.log('\n💡 This looks like a permissions error. Check if your API key has the right permissions.');
      } else if (response.status === 404) {
        console.log('\n💡 API endpoint not found. Check if the panel URL is correct.');
      }
    }
    
  } catch (error) {
    console.error('❌ API request failed:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.log('💡 DNS resolution failed. Check if the domain is correct.');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('💡 Connection refused. Check if the panel is running and accessible.');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('💡 Request timed out. Check network connectivity.');
    }
  }
  
  // Test 4: Check specific user endpoint (if we have a test user)
  console.log('\n4️⃣ Testing user-specific endpoint...');
  try {
    const testUserId = '1'; // Try to get user with ID 1
    const userUrl = `${domain}/api/application/users/${testUserId}`;
    const userResponse = await fetch(userUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    if (userResponse.ok) {
      console.log('✅ User endpoint is accessible');
    } else if (userResponse.status === 404) {
      console.log('⚠️  User endpoint accessible but no user with ID 1 (this is normal)');
    } else {
      console.log(`⚠️  User endpoint returned: ${userResponse.status}`);
    }
    
  } catch (error) {
    console.log(`⚠️  User endpoint test failed: ${error.message}`);
  }
  
  console.log('\n🏁 Test completed!');
  console.log('\n📋 Summary:');
  console.log('- If all tests passed, your Pterodactyl API is working correctly');
  console.log('- If you see errors, check the suggestions above');
  console.log('- Make sure your API key has "Application" permissions in Pterodactyl');
  console.log('- The API key should be from the Application API, not the Client API');
}

// Run the test
testPterodactylAPI().catch(error => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});
