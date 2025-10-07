# Discord Role Rewards System - Setup Guide

## 📋 Overview

The Discord Role Rewards system automatically grants resources and coins when users receive specific Discord roles. Perfect for server boost rewards!

## ✅ System Status

- ✅ **Database Tables:** Created and ready
- ✅ **API Endpoints:** Working
- ✅ **Admin UI:** Available at `/discord-roles`
- ✅ **API Key:** Generated and ready
- ⚠️ **Discord Bot:** Needs to be set up to call the API

## 🔑 API Key

You can get your API key from the dashboard admin panel under API settings.

**⚠️ Keep this key secure! It has full API access.**

## 🎯 Current Configuration

You already have one role configured:

**Role:** Co-Owner (ID: 1355861083562311832)
- 💰 Coins: 10,000,000,000,000
- 🎮 RAM: 10,240 MB
- 💾 Disk: 102,400 MB
- ⚡ CPU: 100,000%
- 🖥️ Servers: 1,000

## 🚀 Setup Steps

### Step 1: Configure More Roles (Optional)

1. Login to your dashboard as admin
2. Go to `/discord-roles`
3. Click "Add Role Configuration"
4. Enter:
   - **Role ID:** Get from Discord (right-click role → Copy ID)
   - **Role Name:** Display name
   - **Guild ID:** Your Discord server ID
   - **Rewards:** Set coins, RAM, disk, CPU, servers
5. Click "Create"

**💡 Tip:** For server boost rewards, use your server's booster role ID!

### Step 2: Set Up Discord Bot

You need a Discord bot to sync roles automatically. Two options:

#### Option A: Use Provided Example Script

1. Install dependencies:
   ```bash
   npm install discord.js axios
   ```

2. Run the example bot:
   ```bash
   cd /root/Dash/b57a3633-fdc2-4103-ac67-197afe8871a2/Helium
   
   # Set environment variables
   export DISCORD_BOT_TOKEN="your_bot_token_here"
   export DASHBOARD_URL="http://localhost:19133"
   export API_KEY="your_api_key_here"
   export GUILD_ID="your_guild_id_here"
   
   # Run the bot
   node bot-examples/discord-role-sync.js
   ```

3. Test with commands:
   - `!syncmyroles` - Sync your current roles and get rewards
   - `!myroles` - Show your configured roles

#### Option B: Add to Existing Bot

Add this code to your existing Discord bot:

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:19133',
  headers: {
    'X-API-Key': 'your_api_key_here',
    'Content-Type': 'application/json',
  },
});

// When a user gains a role
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  const addedRoles = newMember.roles.cache.filter(role => 
    !oldMember.roles.cache.has(role.id)
  );
  
  if (addedRoles.size > 0) {
    const roleIds = Array.from(addedRoles.keys());
    
    try {
      const response = await api.post('/api/dashboard/roles/sync', {
        discordId: newMember.user.id,
        roles: roleIds,
        action: 'add'
      });
      
      if (response.data.rewarded) {
        // User received rewards!
        console.log('Rewards granted:', response.data.rewards);
        
        // Optional: Notify user via DM
        await newMember.send(
          `🎉 You received rewards!\n` +
          JSON.stringify(response.data.rewards, null, 2)
        );
      }
    } catch (error) {
      console.error('Failed to sync roles:', error);
    }
  }
});

// Server boost detection
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  if (!oldMember.premiumSince && newMember.premiumSince) {
    const boosterRole = newMember.guild.roles.premiumSubscriberRole;
    
    if (boosterRole) {
      await api.post('/api/dashboard/roles/sync', {
        discordId: newMember.user.id,
        roles: [boosterRole.id],
        action: 'add'
      });
      
      await newMember.send(
        `🚀 Thank you for boosting! You've received special rewards! 🎁`
      );
    }
  }
});
```

### Step 3: Test the System

1. **Give yourself a configured role** in Discord
2. **Wait a moment** for the bot to detect the change
3. **Check your dashboard** - you should see the rewards!
4. **Or run** `!syncmyroles` in Discord to sync immediately

## 📡 API Endpoints

### Sync Roles
```
POST /api/dashboard/roles/sync
Headers: X-API-Key: your_api_key_here
Body: {
  "discordId": "user_discord_id",
  "roles": ["role_id_1", "role_id_2"],
  "action": "add" // or "remove"
}
```

### Get User's Roles
```
GET /api/dashboard/roles/user/:discordId
Headers: X-API-Key: your_api_key_here
```

### List Role Configs (Admin)
```
GET /admin/discord-roles
Headers: Cookie: session_cookie
```

## 🎮 How It Works

1. **User gets a Discord role** (manually, boost, etc.)
2. **Discord bot detects** the role change
3. **Bot calls API** to sync roles
4. **Dashboard checks** if role has rewards configured
5. **Rewards are granted** to user's account
6. **User can use** new resources immediately!

## 🔧 Troubleshooting

### "No rewards granted"
- Make sure the role is configured in `/discord-roles`
- Check if the role is **enabled**
- Verify the Role ID matches exactly

### "API Error 401 Unauthorized"
- Check your API key is correct
- Make sure you're using the `X-API-Key` header
- Verify the key exists in the database

### "API Error 500"
- Check server logs for errors
- Verify database connection
- Make sure all tables were created

### "Bot doesn't detect role changes"
- Ensure bot has `GuildMembers` intent enabled
- Check bot permissions in Discord
- Verify bot is in the correct guild

## 📊 Monitoring

Check these to verify everything is working:

```bash
# Check configured roles
node -e "
const db = require('better-sqlite3')('./database.sqlite');
const roles = db.prepare('SELECT * FROM discord_roles').all();
console.log('Configured roles:', roles.length);
db.close();
"

# Check user role assignments
node -e "
const db = require('better-sqlite3')('./database.sqlite');
const assignments = db.prepare('SELECT COUNT(*) as count FROM user_discord_roles').get();
console.log('User role assignments:', assignments.count);
db.close();
"
```

## 🎯 Common Use Cases

### Server Boost Rewards
1. Get your server's booster role ID
2. Configure it with generous rewards
3. Bot auto-detects when users boost
4. They receive rewards immediately!

### VIP Memberships
1. Create VIP roles in Discord
2. Configure different reward tiers
3. Give roles when users subscribe/donate
4. Auto-grant dashboard resources

### Event Rewards
1. Configure temporary event roles
2. Give roles to event participants
3. They receive dashboard rewards
4. Remove roles when event ends

## 📝 Notes

- **Multiple roles stack** - Users with multiple configured roles get combined rewards
- **Role removal** - When a role is removed, rewards are NOT taken away (one-time grant)
- **Manual sync** - Users can run `!syncmyroles` to manually trigger sync
- **Database-driven** - All configs stored in database, no server restart needed

## 🆘 Need Help?

1. Check the full documentation in `BOTAPI.md`
2. Verify database tables exist
3. Test API endpoints with curl/Postman
4. Check Discord bot logs
5. Review server console for errors

---

**✅ System is ready to use! Just set up your Discord bot and you're good to go!**
