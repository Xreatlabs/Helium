/**
 * Test Admin System
 * This script checks all users in the database and shows their admin status
 */

const Keyv = require("keyv").default;
const settings = require("./settings.json");

// Initialize database
const db = new Keyv(settings.database);

async function testAdminSystem() {
  console.log("🔍 Testing Admin System...\n");
  
  try {
    // Get all users from the database
    const allUsers = await db.get("users") || [];
    console.log(`📊 Total users in database: ${allUsers.length}`);
    console.log(`📋 Users array content: [${allUsers.join(', ')}]\n`);
    
    if (allUsers.length === 0) {
      console.log("❌ No users found in database");
      console.log("\n💡 This is normal if no one has logged in yet.");
      console.log("   The admin system will work once users start logging in.");
      console.log("   When a user logs in, their admin status will be checked and stored.");
      
      // Show what the system will do
      console.log("\n🔧 How the Admin System Works:");
      console.log("   1. User logs in via Discord OAuth");
      console.log("   2. System checks if user is root_admin in Pterodactyl");
      console.log("   3. Admin status is stored as: admin-{discordId} = 1 (admin) or 0 (not admin)");
      console.log("   4. User mapping is stored as: users-{discordId} = {pterodactylId}");
      
      // Test database connectivity
      console.log("\n🔌 Testing Database Connectivity:");
      try {
        await db.set("test-key", "test-value");
        const testValue = await db.get("test-key");
        if (testValue === "test-value") {
          console.log("   ✅ Database is working correctly");
          await db.delete("test-key"); // Clean up
        } else {
          console.log("   ❌ Database read/write test failed");
        }
      } catch (dbError) {
        console.log("   ❌ Database error:", dbError.message);
      }
      
      return;
    }
    
    console.log("👥 User Admin Status Report:");
    console.log("=" .repeat(80));
    console.log("Discord ID".padEnd(20) + "Pterodactyl ID".padEnd(20) + "Admin Status".padEnd(15) + "Notes");
    console.log("-".repeat(80));
    
    let adminCount = 0;
    let nonAdminCount = 0;
    
    for (const pterodactylId of allUsers) {
      // Find Discord ID for this Pterodactyl ID
      let discordId = null;
      
      // Search through all possible user mappings
      for (let i = 0; i < 1000000; i++) { // Reasonable search range
        const testDiscordId = i.toString();
        const storedPterodactylId = await db.get(`users-${testDiscordId}`);
        if (storedPterodactylId === pterodactylId) {
          discordId = testDiscordId;
          break;
        }
      }
      
      if (!discordId) {
        console.log(`Unknown`.padEnd(20) + pterodactylId.padEnd(20) + "❌ No Discord ID".padEnd(15) + "Mapping not found");
        continue;
      }
      
      // Check admin status
      const adminStatus = await db.get(`admin-${discordId}`);
      const isAdmin = adminStatus === 1;
      
      if (isAdmin) {
        adminCount++;
        console.log(discordId.padEnd(20) + pterodactylId.padEnd(20) + "✅ Admin".padEnd(15) + "Has admin privileges");
      } else {
        nonAdminCount++;
        console.log(discordId.padEnd(20) + pterodactylId.padEnd(20) + "❌ Not Admin".padEnd(15) + "Regular user");
      }
    }
    
    console.log("-".repeat(80));
    console.log(`\n📈 Summary:`);
    console.log(`   Total Users: ${allUsers.length}`);
    console.log(`   Admins: ${adminCount}`);
    console.log(`   Non-Admins: ${nonAdminCount}`);
    
    // Check for any orphaned admin entries
    console.log(`\n🔍 Checking for orphaned admin entries...`);
    let orphanedAdmins = 0;
    
    for (let i = 0; i < 1000000; i++) {
      const testDiscordId = i.toString();
      const adminStatus = await db.get(`admin-${testDiscordId}`);
      
      if (adminStatus === 1) {
        const pterodactylId = await db.get(`users-${testDiscordId}`);
        if (!pterodactylId || !allUsers.includes(pterodactylId)) {
          orphanedAdmins++;
          console.log(`   ⚠️  Orphaned admin entry: Discord ID ${testDiscordId} (Pterodactyl ID: ${pterodactylId || 'Not found'})`);
        }
      }
    }
    
    if (orphanedAdmins === 0) {
      console.log(`   ✅ No orphaned admin entries found`);
    } else {
      console.log(`   ⚠️  Found ${orphanedAdmins} orphaned admin entries`);
    }
    
    // Test database keys format
    console.log(`\n🔑 Database Key Format Test:`);
    console.log(`   User mapping key: users-{discordId} -> {pterodactylId}`);
    console.log(`   Admin status key: admin-{discordId} -> 1 (admin) or 0 (not admin)`);
    
    // Show some example keys
    console.log(`\n📝 Example Keys in Database:`);
    const exampleKeys = [];
    for (let i = 0; i < 10; i++) {
      const testDiscordId = i.toString();
      const pterodactylId = await db.get(`users-${testDiscordId}`);
      const adminStatus = await db.get(`admin-${testDiscordId}`);
      
      if (pterodactylId) {
        exampleKeys.push({
          discordId: testDiscordId,
          pterodactylId: pterodactylId,
          adminStatus: adminStatus
        });
      }
    }
    
    if (exampleKeys.length > 0) {
      console.log("   Discord ID -> Pterodactyl ID (Admin Status)");
      exampleKeys.forEach(key => {
        const adminText = key.adminStatus === 1 ? "Admin" : "User";
        console.log(`   ${key.discordId} -> ${key.pterodactylId} (${adminText})`);
      });
    } else {
      console.log("   No user mappings found in the expected range");
    }
    
  } catch (error) {
    console.error("❌ Error testing admin system:", error);
  }
  
  // Don't close database connection here - let main() handle it
  console.log(`\n✅ Test completed.`);
}

// Function to create test data
async function createTestData() {
  console.log("🧪 Creating Test Data...\n");
  
  try {
    // Create some test users
    const testUsers = [
      { discordId: "123456789", pterodactylId: "1", isAdmin: true },
      { discordId: "987654321", pterodactylId: "2", isAdmin: false },
      { discordId: "555666777", pterodactylId: "3", isAdmin: true }
    ];
    
    // Add users to the users array
    const existingUsers = await db.get("users") || [];
    const newUsers = testUsers.map(u => u.pterodactylId);
    const allUsers = [...existingUsers, ...newUsers];
    await db.set("users", allUsers);
    console.log(`   📝 Updated users array: [${allUsers.join(', ')}]`);
    
    // Create user mappings and admin status
    for (const user of testUsers) {
      await db.set(`users-${user.discordId}`, user.pterodactylId);
      await db.set(`admin-${user.discordId}`, user.isAdmin ? 1 : 0);
      console.log(`   ✅ Created user: ${user.discordId} -> ${user.pterodactylId} (${user.isAdmin ? 'Admin' : 'User'})`);
    }
    
    console.log(`\n✅ Test data created successfully!`);
    console.log(`   Run the test again to see the admin status report.`);
    
  } catch (error) {
    console.error("❌ Error creating test data:", error);
  }
}

// Function to clear test data
async function clearTestData() {
  console.log("🧹 Clearing Test Data...\n");
  
  try {
    const testUsers = ["123456789", "987654321", "555666777"];
    
    for (const discordId of testUsers) {
      await db.delete(`users-${discordId}`);
      await db.delete(`admin-${discordId}`);
    }
    
    // Remove test Pterodactyl IDs from users array
    const existingUsers = await db.get("users") || [];
    const filteredUsers = existingUsers.filter(id => !["1", "2", "3"].includes(id));
    await db.set("users", filteredUsers);
    
    console.log("✅ Test data cleared successfully!");
    
  } catch (error) {
    console.error("❌ Error clearing test data:", error);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--create-test-data')) {
    await createTestData();
  } else if (args.includes('--clear-test-data')) {
    await clearTestData();
  } else {
    await testAdminSystem();
  }
  
  await db.disconnect();
}

// Run the appropriate function
main().catch(console.error);
