# Discord Bot API Integration Guide

Complete guide to connect your Discord bot with Helium Dashboard and Pterodactyl Panel.

---

## Table of Contents
1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Quick Setup](#quick-setup)
4. [Power Control Setup](#power-control-setup)
5. [30+ Bot Commands](#30-bot-commands)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [Error Handling](#error-handling)
8. [Security Best Practices](#security-best-practices)

---

## Overview

This bot system connects three components:
- **Discord Bot** - User interface in Discord
- **Helium Dashboard** - Resource management and user data
- **Pterodactyl Panel** - Server hosting and control

Users interact with the bot → Bot calls Dashboard API → Dashboard communicates with Pterodactyl

---

## How It Works

### Architecture Flow

```
Discord User → Discord Bot → Dashboard API → Pterodactyl Panel
     ↑                              ↓
     └──────── Response ────────────┘
```

**Step by Step:**

1. **User runs command** in Discord: `!myserver start`
2. **Bot authenticates** with Dashboard API using API key
3. **Dashboard validates** request and checks permissions
4. **Dashboard communicates** with Pterodactyl (Application + Client API)
5. **Response flows back** through the chain to user

### Key Components

**Dashboard API Keys:**
- Created in Admin Panel → API Keys
- Format: `hlm_...`
- Controls bot access to dashboard features
- Permissions: `*` for full access or specific scopes

**Pterodactyl Application Key:**
- Created in Pterodactyl admin area
- Format: `ptla_...`
- Used for: user management, server creation, resource allocation
- Already configured in settings.json

**Pterodactyl Client Key (Optional for Power Control):**
- Created in Pterodactyl account settings
- Format: `ptlc_...`
- Used for: server power control (start/stop/restart/kill)
- Two ways to use: Global in settings.json OR per-request

---

## Quick Setup

### Step 1: Create Dashboard API Key

1. Login to Helium dashboard as admin
2. Go to **Admin Panel** → **API Keys**
3. Click **Create API Key**
4. Name: `Discord Bot`
5. Permissions: Select `*` (full access)
6. Copy the generated key (starts with `hlm_`)

### Step 2: Install Bot Dependencies

```bash
npm install discord.js axios dotenv
```

### Step 3: Create .env File

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here

# Dashboard API Configuration
API_URL=https://dash.example.com
API_KEY=hlm_your_dashboard_api_key_here

# Pterodactyl Power Control (Optional - for server start/stop/restart)
PTERO_KEY=ptlc_your_pterodactyl_client_key_here
```

**Configuration Explained:**
- `DISCORD_TOKEN` - Your Discord bot token from Discord Developer Portal
- `API_URL` - Your Helium dashboard URL (e.g., https://dash.example.com or http://localhost:19133)
- `API_KEY` - Dashboard API key created in Admin Panel (starts with `hlm_`)
- `PTERO_KEY` - Pterodactyl client key for power control (starts with `ptlc_`) - Optional

### Step 4: Basic Bot Structure

```javascript
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// API client for dashboard
const api = axios.create({
  baseURL: process.env.API_URL,
  headers: { 
    'Authorization': `Bearer ${process.env.API_KEY}`,
    'Content-Type': 'application/json'
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  // Handle commands here
});

client.login(process.env.DISCORD_TOKEN);
```

**Note:** All credentials are stored in `.env` file for security. Never commit `.env` to Git!

### Step 5: Enable Message Content Intent

**Important!** In Discord Developer Portal:
- Go to your bot application
- Bot section → Privileged Gateway Intents
- Enable **MESSAGE CONTENT INTENT**

---

## Power Control Setup

Power control allows starting/stopping/restarting servers from Discord bot.

### Create Pterodactyl Client Key

1. Login to Pterodactyl Panel
2. Click your profile → **Account Settings**
3. Go to **API Credentials** tab
4. Click **Create API Key**
5. Description: `Discord Bot Power Control`
6. Click Create and copy the key (starts with `ptlc_`)
7. Add to your bot's `.env` file as `PTERO_KEY`

### Bot Configuration

Your `.env` file should now have:
```env
DISCORD_TOKEN=your_bot_token
API_URL=https://dash.example.com
API_KEY=hlm_your_dashboard_key
PTERO_KEY=ptlc_your_pterodactyl_key
```

### Using Power Control in Bot

**Method 1: Using Environment Variable (Recommended for Bots)**

```javascript
// Pass the ptero key from environment
await api.post(`/api/dashboard/servers/${serverId}/power`, {
  action: 'start',
  pteroKey: process.env.PTERO_KEY
});
```

**Method 2: Dashboard Global Key (Alternative)**

Alternatively, you can configure the key globally in dashboard `settings.json`:
```json
{
  "pterodactyl": {
    "clientKey": "ptlc_..."
  }
}
```

Then in bot (no pteroKey needed):
```javascript
await api.post(`/api/dashboard/servers/${serverId}/power`, { action: 'start' });
```

**Recommended Approach:** Use Method 1 (environment variable) for bots to keep all credentials in `.env` file.

---

## 30+ Bot Commands

Below are 30+ commands you can implement in your Discord bot. Examples show the basic logic, not full code.

---

### 🔵 User Information Commands

#### 1. !userinfo / !profile / !me
Shows user's dashboard profile including coins, package, and resources.

```javascript
// Fetches user data from dashboard
GET /api/dashboard/users/{discordId}
// Returns: coins, package, extraResources, isAdmin
```

**Example Response:**
```
📊 Your Dashboard Profile
Package: Premium
Coins: 🪙 1,500
Extra Resources:
  RAM: 2048 MB | Disk: 10240 MB | CPU: 200%
```

#### 2. !coins / !balance
Check coin balance quickly.

```javascript
GET /api/dashboard/users/{discordId}
// Display only coins field
```

**Example:** `🪙 You have 1,500 coins!`

#### 3. !resources
View available extra resources.

```javascript
GET /api/dashboard/users/{discordId}
// Display extraResources: ram, disk, cpu, servers
```

#### 4. !package / !plan
Show current package/plan.

```javascript
GET /api/dashboard/users/{discordId}
// Display packageName field
```

---

### 🔵 Server Management Commands

#### 5. !servers / !myservers
List all user's servers with status and resources.

```javascript
GET /api/dashboard/servers?discordId={userId}
// Returns array of servers with limits and status
```

**Example Response:**
```
🖥️ Your Servers (3)
1. Minecraft Server - 🟢 Active
   RAM: 2048 MB | Disk: 5120 MB | CPU: 100%
2. Discord Bot - 🟢 Active
   RAM: 512 MB | Disk: 2048 MB | CPU: 50%
```

#### 6. !server <name>
Get detailed info about specific server.

```javascript
// Search user's servers by name
GET /api/dashboard/servers?discordId={userId}
// Find matching server and display full details
```

#### 7. !serverid <id>
Get server info by ID.

```javascript
GET /api/dashboard/servers/{serverId}
```

#### 8. !serverstatus
Quick status check for all servers.

```javascript
GET /api/dashboard/servers?discordId={userId}
// Display only name and status for each
```

---

### 🔵 Server Power Control

#### 9. !start [server_name]
Start your server.

```javascript
POST /api/dashboard/servers/{serverId}/power
Body: { 
  "action": "start",
  "pteroKey": process.env.PTERO_KEY  // Pass from .env
}
```

**Example:** `!start` or `!start Minecraft`

#### 10. !stop [server_name]
Stop server gracefully.

```javascript
POST /api/dashboard/servers/{serverId}/power
Body: { 
  "action": "stop",
  "pteroKey": process.env.PTERO_KEY
}
```

#### 11. !restart [server_name]
Restart server.

```javascript
POST /api/dashboard/servers/{serverId}/power
Body: { 
  "action": "restart",
  "pteroKey": process.env.PTERO_KEY
}
```

#### 12. !kill [server_name]
Force kill server (emergency).

```javascript
POST /api/dashboard/servers/{serverId}/power
Body: { 
  "action": "kill",
  "pteroKey": process.env.PTERO_KEY
}
```

#### 13. !myserver <action> [name]
All-in-one server control command.

**Examples:**
- `!myserver start` - Start first server
- `!myserver stop Minecraft` - Stop specific server
- `!myserver restart` - Restart first server
- `!myserver status` - Check server status

---

### 🔵 Dashboard Statistics

#### 14. !stats / !statistics
View dashboard-wide statistics.

```javascript
GET /api/dashboard/stats
// Returns: totalUsers, totalServers, timestamp
```

**Example:**
```
📊 Dashboard Statistics
Total Users: 1,247
Total Servers: 3,891
Updated: Just now
```

#### 15. !health / !status
Check dashboard and Pterodactyl health.

```javascript
GET /api/dashboard/health
// Returns: dashboard status, pterodactyl status
```

#### 16. !ping
Bot response time check.

```javascript
// Calculate bot latency
// Show API response time
```

---

### 🔵 Shop & Economy Commands

#### 17. !shop / !store
Display available resources for purchase.

```javascript
GET /api/dashboard/settings
// Show coins.store configuration with prices
```

**Example:**
```
🛒 Resource Shop
RAM: 500 coins per 1024 MB
Disk: 250 coins per 5120 MB
CPU: 500 coins per 100%
Servers: 100 coins per 2 slots
```

#### 18. !buy <resource> <amount>
Purchase resources with coins.

```javascript
POST /api/dashboard/users/{userId}/resources
// Deduct coins, add resources
```

**Example:** `!buy ram 1024` - Buy 1GB RAM

#### 19. !prices
Quick price check.

```javascript
GET /api/dashboard/settings
// Display store prices only
```

---

### 🔵 Package Management

#### 20. !packages / !plans
List available packages.

```javascript
GET /api/dashboard/packages
// Display all packages with resources
```

**Example:**
```
📦 Available Packages
Default: 3GB RAM, 10GB Disk, 1 Server
Premium: 8GB RAM, 20GB Disk, 3 Servers
```

#### 21. !mypackage
Show your current package details.

```javascript
GET /api/dashboard/users/{userId}
GET /api/dashboard/packages
// Combine to show package details
```

---

### 🔵 Admin Commands (Require Admin Permission)

#### 22. !givecoins <@user> <amount>
Give coins to a user.

```javascript
POST /api/dashboard/users/{targetId}/coins
Body: { "coins": amount, "action": "add" }
```

**Example:** `!givecoins @user 100`

#### 23. !takecoins <@user> <amount>
Remove coins from user.

```javascript
POST /api/dashboard/users/{targetId}/coins
Body: { "coins": amount, "action": "subtract" }
```

#### 24. !setcoins <@user> <amount>
Set exact coin amount.

```javascript
POST /api/dashboard/users/{targetId}/coins
Body: { "coins": amount, "action": "set" }
```

#### 25. !addram <@user> <amount>
Give extra RAM to user.

```javascript
POST /api/dashboard/users/{targetId}/resources
Body: { "ram": amount }
```

**Example:** `!addram @user 1024`

#### 26. !adddisk <@user> <amount>
Give extra disk space.

```javascript
POST /api/dashboard/users/{targetId}/resources
Body: { "disk": amount }
```

#### 27. !addcpu <@user> <amount>
Give extra CPU.

```javascript
POST /api/dashboard/users/{targetId}/resources
Body: { "cpu": amount }
```

#### 28. !setresources <@user> ram:X disk:Y cpu:Z
Set multiple resources at once.

```javascript
POST /api/dashboard/users/{targetId}/resources
Body: { "ram": X, "disk": Y, "cpu": Z }
```

**Example:** `!setresources @user ram:2048 disk:10240 cpu:200`

#### 29. !setpackage <@user> <package_name>
Change user's package.

```javascript
POST /api/dashboard/users/{targetId}/package
Body: { "packageName": "premium" }
```

**Example:** `!setpackage @user premium`

#### 30. !resetpackage <@user>
Reset user to default package.

```javascript
POST /api/dashboard/users/{targetId}/package
Body: { "packageName": null }
```

#### 31. !power <server_id> <action>
Admin power control for any server.

```javascript
POST /api/dashboard/servers/{serverId}/power
Body: { 
  "action": "start/stop/restart/kill",
  "pteroKey": process.env.PTERO_KEY  // From .env
}
```

**Example:** `!power 1 start`

#### 32. !deleteserver <server_id>
Delete a server (admin only).

```javascript
DELETE /api/dashboard/servers/{serverId}
```

#### 33. !userinfo <@user>
View another user's dashboard info.

```javascript
GET /api/dashboard/users/{targetId}
```

#### 34. !userservers <@user>
List servers owned by specific user.

```javascript
GET /api/dashboard/servers?discordId={targetId}
```

---

### 🔵 Utility Commands

#### 35. !help
Show all available commands with descriptions.

```javascript
// Display command list based on user permissions
// Show admin commands only if user has admin role
```

#### 36. !invite
Get bot invite link.

```javascript
// Generate OAuth2 URL with required permissions
```

#### 37. !support
Show support server link.

```javascript
// Display your support Discord server invite
```

---

## API Endpoints Reference

### User Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard/users/:discordId` | GET | Get user information |
| `/api/dashboard/users/:discordId/coins` | POST | Update coins (add/subtract/set) |
| `/api/dashboard/users/:discordId/resources` | POST | Update extra resources |
| `/api/dashboard/users/:discordId/package` | POST | Change package |

### Server Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard/servers` | GET | List all servers (filter by discordId) |
| `/api/dashboard/servers/:id` | GET | Get specific server details |
| `/api/dashboard/servers/:id/power` | POST | Power control (start/stop/restart/kill) |
| `/api/dashboard/servers/:id` | DELETE | Delete server |

### Dashboard Info

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard/health` | GET | Health check |
| `/api/dashboard/stats` | GET | Dashboard statistics |
| `/api/dashboard/settings` | GET | Dashboard settings |
| `/api/dashboard/packages` | GET | Available packages |

---

## Error Handling

### Common Errors

**401 Unauthorized:**
```json
{ "error": "Unauthorized", "message": "Invalid or disabled API key" }
```
→ Check Dashboard API key in .env

**403 Forbidden:**
```json
{ "error": "Forbidden", "message": "API key does not have required permissions" }
```
→ Update API key permissions in dashboard

**404 Not Found:**
```json
{ "error": "Not Found", "message": "User not found in database" }
```
→ User needs to login to dashboard first

**501 Not Configured (Power Control):**
```json
{ "error": "Not Configured", "message": "Power control requires client API key..." }
```
→ Add clientKey to settings.json OR pass pteroKey in request

### Error Handling Pattern

```javascript
try {
  const response = await api.get(`/api/dashboard/users/${userId}`);
  // Handle success
} catch (error) {
  if (error.response) {
    // API returned error
    switch (error.response.status) {
      case 404:
        message.reply('User not found. Have you logged into the dashboard?');
        break;
      case 401:
        message.reply('Bot API authentication failed. Contact admin.');
        break;
      default:
        message.reply('An error occurred: ' + error.response.data.message);
    }
  } else {
    // Network error
    message.reply('Cannot connect to dashboard. Is it running?');
  }
}
```

---

## Security Best Practices

### 1. Environment Variables

**✅ Good - All credentials in .env:**
```env
DISCORD_TOKEN=your_bot_token
API_URL=https://dash.example.com
API_KEY=hlm_your_dashboard_key
PTERO_KEY=ptlc_your_pterodactyl_key
```

**Usage in code:**
```javascript
require('dotenv').config();

const api = axios.create({
  baseURL: process.env.API_URL,
  headers: { 'Authorization': `Bearer ${process.env.API_KEY}` }
});
```

**❌ Bad - Never hardcode:**
```javascript
const apiKey = "hlm_actual_key_here";  // Don't do this!
const pteroKey = "ptlc_key_here";      // Don't do this!
```

**Important:** Add `.env` to `.gitignore` to prevent committing secrets!

### 2. Permission Checks
```javascript
// Always check permissions for admin commands
if (!message.member.permissions.has('Administrator')) {
  return message.reply('❌ Admin only!');
}
```

### 3. Input Validation
```javascript
// Validate all user input
const amount = parseInt(args[1]);
if (isNaN(amount) || amount < 1 || amount > 999999) {
  return message.reply('Invalid amount!');
}
```

### 4. Rate Limiting
```javascript
// Implement cooldowns
const cooldowns = new Map();
if (cooldowns.has(userId)) {
  return message.reply('Slow down! Wait a moment.');
}
cooldowns.set(userId, Date.now() + 3000);
```

### 5. Never Expose Sensitive Data
```javascript
// ❌ Bad - Exposes keys
console.log('Using key:', pteroKey);

// ✅ Good - Safe logging
console.log('Using key from:', keySource);
```

---

## Advanced Features

### Multiple Server Selection

Let users select from their servers:

```javascript
const servers = await api.get(`/api/dashboard/servers?discordId=${userId}`);
if (servers.data.data.data.length > 1) {
  // Show list, let user pick by number or name
  // Use Discord reactions or buttons for selection
}
```

### Auto-Complete Server Names

```javascript
const serverQuery = args.slice(1).join(' ').toLowerCase();
const server = servers.find(s => 
  s.attributes.name.toLowerCase().includes(serverQuery)
);
```

### Embed Formatting

Use rich embeds for better UX:

```javascript
const { EmbedBuilder } = require('discord.js');

const embed = new EmbedBuilder()
  .setColor('#00ff00')
  .setTitle('✅ Success')
  .setDescription('Server started successfully!')
  .addFields(
    { name: 'Server', value: 'Minecraft Server', inline: true },
    { name: 'Action', value: 'Start', inline: true }
  )
  .setTimestamp();

message.reply({ embeds: [embed] });
```

### Command Aliases

Support multiple command names:

```javascript
case 'userinfo':
case 'profile':
case 'me':
case 'stats':
  await handleUserInfo(message);
  break;
```

### Confirmation Prompts

For destructive actions:

```javascript
message.reply('⚠️ Delete server? Reply with "yes" to confirm.');
// Wait for confirmation message
// Only proceed if confirmed
```

---

## Troubleshooting

### Bot Not Responding
1. Check Message Content Intent is enabled
2. Verify bot has "Send Messages" permission
3. Check console for errors

### API Errors
1. Test API health: `GET /api/dashboard/health`
2. Verify Dashboard API key is valid
3. Check dashboard is running on correct port

### Power Control Not Working
1. Verify Pterodactyl client key is configured
2. Test with: `POST /api/dashboard/servers/1/power`
3. Check Wings daemon is running on node

### User Not Found
- User must login to dashboard at least once
- Discord ID must be correctly linked
- Check user exists: `GET /api/dashboard/users/{discordId}`

---

## Complete Command List Summary

**User Commands (17):**
1. !userinfo - Profile information
2. !coins - Check balance
3. !resources - View resources
4. !package - Current package
5. !servers - List servers
6. !server <name> - Server details
7. !serverid <id> - Get by ID
8. !serverstatus - Quick status
9. !start - Start server
10. !stop - Stop server
11. !restart - Restart server
12. !kill - Force kill
13. !myserver - All-in-one control
14. !stats - Dashboard stats
15. !health - System health
16. !shop - View store
17. !buy - Purchase resources

**Admin Commands (20):**
18. !givecoins - Give coins
19. !takecoins - Remove coins
20. !setcoins - Set coins
21. !addram - Add RAM
22. !adddisk - Add disk
23. !addcpu - Add CPU
24. !setresources - Set multiple
25. !setpackage - Change package
26. !resetpackage - Reset package
27. !power - Control any server
28. !deleteserver - Delete server
29. !userinfo <@user> - View user
30. !userservers <@user> - User's servers
31. !packages - List packages
32. !prices - View prices
33. !mypackage - Package details

**Utility Commands (4):**
34. !help - Command list
35. !invite - Bot invite
36. !support - Support server
37. !ping - Check latency

**Total: 37 Commands**

---

## Getting Started Checklist

- [ ] Create Dashboard API key (Admin Panel → API Keys)
- [ ] Install dependencies (`npm install discord.js axios dotenv`)
- [ ] Create .env file with tokens
- [ ] Enable Message Content Intent in Discord Portal
- [ ] Test bot login and API connection
- [ ] (Optional) Add Pterodactyl client key for power control
- [ ] Implement commands from the list above
- [ ] Add error handling
- [ ] Test with real users
- [ ] Deploy to production

---

## Need Help?

**Common Issues:**
- Bot offline: Check Discord token
- API errors: Verify Dashboard API key
- Power control fails: Add client key to settings.json
- User not found: User must login to dashboard first

**Testing:**
1. Test API: `curl http://localhost:19133/api/dashboard/health`
2. Test bot: Send `!ping` in Discord
3. Test auth: Try `!userinfo` command

---

**Happy coding! 🚀**

For questions or issues, check the console logs and error messages for detailed information.
