# Discord Bot API Integration Guide

Complete guide to connect your Discord bot with the Helium dashboard API system.

---

## Table of Contents
1. [Quick Setup](#quick-setup)
2. [Creating Your First API Key](#creating-your-first-api-key)
3. [Complete Bot Example](#complete-bot-example)
4. [Running Your Bot](#running-your-bot)
5. [Command Examples](#command-examples)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [Error Handling](#error-handling)
8. [Troubleshooting](#troubleshooting)

---

## Quick Setup

### Step 1: Create API Key in Dashboard

1. Start your Helium dashboard
2. Login as an administrator
3. Go to **Admin Panel** → **API Keys** (in the sidebar)
4. Click **"Create API Key"** button
5. Fill in the form:
   - **Key Name**: `Discord Bot` or any descriptive name
   - **Permissions**: Check `*` for full access (or select specific permissions)
6. Click **Create**
7. **IMPORTANT**: Copy the generated API key immediately! You won't see it again!

**Note:** If the API Keys section is not visible in the admin panel, run the database migration:
```bash
cd /path/to/helium
node -e "const Database = require('better-sqlite3'); const db = new Database('database.sqlite'); const sql = require('fs').readFileSync('./migrations/002_api_keys.sql', 'utf8'); db.exec(sql); console.log('Migration complete!');"
```

### Step 2: Install Required Packages

In your bot directory, run:

```bash
npm install discord.js axios dotenv
```

### Step 3: Create Environment File

Create `.env` file in your bot directory:

```env
DISCORD_TOKEN=your_discord_bot_token_here
API_KEY=hlm_your_api_key_here
API_URL=http://localhost:19133
```

Replace with your actual values:
- `DISCORD_TOKEN`: Your Discord bot token from Discord Developer Portal
- `API_KEY`: The API key you generated in Step 1
- `API_URL`: Your Helium dashboard URL (use your domain or IP if accessing externally)

---

## Complete Bot Example

Create `bot.js` file with this complete working code:

```javascript
require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Initialize API client
const api = axios.create({
  baseURL: process.env.API_URL,
  headers: {
    'Authorization': `Bearer ${process.env.API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Bot ready event
client.once('ready', () => {
  console.log(`✓ Bot logged in as ${client.user.tag}`);
  console.log(`✓ API URL: ${process.env.API_URL}`);
  testAPIConnection();
});

// Test API connection on startup
async function testAPIConnection() {
  try {
    const response = await api.get('/api/dashboard/health');
    console.log('✓ API connection successful!');
    console.log(`  Dashboard: ${response.data.data.dashboard}`);
    console.log(`  Pterodactyl: ${response.data.data.pterodactyl}`);
  } catch (error) {
    console.error('✗ API connection failed!');
    console.error(`  Error: ${error.message}`);
    console.error('  Make sure your API_KEY and API_URL are correct in .env file');
  }
}

// Message command handler
client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;
  
  // Check if message starts with prefix
  const prefix = '!';
  if (!message.content.startsWith(prefix)) return;

  // Parse command and arguments
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Command router
  try {
    switch (command) {
      case 'help':
        await handleHelp(message);
        break;
        
      case 'ping':
        message.reply('🏓 Pong!');
        break;
        
      case 'userinfo':
      case 'profile':
      case 'me':
        await handleUserInfo(message);
        break;
        
      case 'servers':
      case 'myservers':
        await handleServers(message);
        break;
        
      case 'coins':
      case 'balance':
        await handleCoins(message);
        break;
        
      case 'stats':
        await handleStats(message);
        break;
        
      // Admin commands
      case 'givecoins':
        await handleGiveCoins(message, args);
        break;
        
      case 'setresources':
        await handleSetResources(message, args);
        break;
        
      case 'setpackage':
        await handleSetPackage(message, args);
        break;
        
      default:
        message.reply(`Unknown command. Use \`${prefix}help\` to see available commands.`);
    }
  } catch (error) {
    console.error(`Error executing command ${command}:`, error);
    message.reply('❌ An error occurred while executing that command.');
  }
});

// ==================== COMMAND HANDLERS ====================

async function handleHelp(message) {
  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('🤖 Dashboard Bot Commands')
    .setDescription('Available commands for interacting with the dashboard:')
    .addFields(
      { name: '**User Commands**', value: '\u200b', inline: false },
      { name: '!userinfo', value: 'View your dashboard profile', inline: true },
      { name: '!servers', value: 'List your servers', inline: true },
      { name: '!coins', value: 'Check your coin balance', inline: true },
      { name: '!stats', value: 'View dashboard statistics', inline: true },
      { name: '!help', value: 'Show this help menu', inline: true },
      { name: '!ping', value: 'Check bot responsiveness', inline: true },
      { name: '\u200b', value: '\u200b', inline: false },
      { name: '**Admin Commands**', value: '\u200b', inline: false },
      { name: '!givecoins @user <amount>', value: 'Give coins to a user', inline: false },
      { name: '!setresources @user <type>:<value>', value: 'Update user resources\nExample: `!setresources @user ram:1024 disk:5120`', inline: false },
      { name: '!setpackage @user <package>', value: 'Change user package', inline: false }
    )
    .setFooter({ text: 'Admin commands require administrator permissions' })
    .setTimestamp();

  message.reply({ embeds: [embed] });
}

async function handleUserInfo(message) {
  try {
    const response = await api.get(`/api/dashboard/users/${message.author.id}`);
    const data = response.data.data;

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('📊 Your Dashboard Profile')
      .setThumbnail(message.author.displayAvatarURL())
      .addFields(
        { name: 'Package', value: data.packageName || 'default', inline: true },
        { name: 'Coins', value: `🪙 ${data.coins.toLocaleString()}`, inline: true },
        { name: 'Admin', value: data.isAdmin ? '✅ Yes' : '❌ No', inline: true },
        { name: '\u200b', value: '\u200b', inline: false },
        { name: '**Extra Resources**', value: '\u200b', inline: false },
        { name: 'RAM', value: `${data.extraResources.ram} MB`, inline: true },
        { name: 'Disk', value: `${data.extraResources.disk} MB`, inline: true },
        { name: 'CPU', value: `${data.extraResources.cpu}%`, inline: true },
        { name: 'Servers', value: `${data.extraResources.servers}`, inline: true }
      )
      .setFooter({ text: `User ID: ${message.author.id}` })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  } catch (error) {
    await handleAPIError(message, error, 'fetch your profile');
  }
}

async function handleServers(message) {
  try {
    const response = await api.get(`/api/dashboard/servers?discordId=${message.author.id}`);
    const servers = response.data.data.data;

    if (servers.length === 0) {
      return message.reply('📭 You don\'t have any servers yet!');
    }

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('🖥️ Your Servers')
      .setDescription(`You have ${servers.length} server(s)`);

    servers.forEach((server, index) => {
      const limits = server.attributes.limits;
      const status = server.attributes.suspended ? '🔴 Suspended' : '🟢 Active';
      
      embed.addFields({
        name: `${index + 1}. ${server.attributes.name}`,
        value: 
          `**Status:** ${status}\n` +
          `**RAM:** ${limits.memory} MB | **Disk:** ${limits.disk} MB | **CPU:** ${limits.cpu}%\n` +
          `**ID:** \`${server.attributes.identifier}\``,
        inline: false
      });
    });

    embed.setFooter({ text: `Total: ${servers.length} server(s)` });
    embed.setTimestamp();

    message.reply({ embeds: [embed] });
  } catch (error) {
    await handleAPIError(message, error, 'fetch your servers');
  }
}

async function handleCoins(message) {
  try {
    const response = await api.get(`/api/dashboard/users/${message.author.id}`);
    const coins = response.data.data.coins;

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🪙 Your Coins')
      .setDescription(`You have **${coins.toLocaleString()}** coins!`)
      .setThumbnail(message.author.displayAvatarURL())
      .setTimestamp();

    message.reply({ embeds: [embed] });
  } catch (error) {
    await handleAPIError(message, error, 'fetch your coins');
  }
}

async function handleStats(message) {
  try {
    const response = await api.get('/api/dashboard/stats');
    const stats = response.data.data;

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('📊 Dashboard Statistics')
      .addFields(
        { name: 'Total Users', value: stats.totalUsers.toString(), inline: true },
        { name: 'Total Servers', value: stats.totalServers.toString(), inline: true }
      )
      .setFooter({ text: `Updated: ${new Date(stats.timestamp).toLocaleString()}` })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  } catch (error) {
    await handleAPIError(message, error, 'fetch statistics');
  }
}

// ==================== ADMIN COMMANDS ====================

async function handleGiveCoins(message, args) {
  // Check admin permissions
  if (!message.member.permissions.has('Administrator')) {
    return message.reply('❌ You need administrator permissions to use this command!');
  }

  // Parse arguments
  const targetUser = message.mentions.users.first();
  const amount = parseInt(args[1]);

  if (!targetUser || !amount || isNaN(amount)) {
    return message.reply('❌ Usage: `!givecoins @user <amount>`\nExample: `!givecoins @user 100`');
  }

  if (amount < 1 || amount > 999999) {
    return message.reply('❌ Amount must be between 1 and 999999');
  }

  try {
    await api.post(`/api/dashboard/users/${targetUser.id}/coins`, {
      coins: amount,
      action: 'add'
    });

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ Coins Given')
      .setDescription(`Successfully gave **${amount}** coins to ${targetUser.tag}!`)
      .setTimestamp();

    message.reply({ embeds: [embed] });
  } catch (error) {
    await handleAPIError(message, error, 'give coins');
  }
}

async function handleSetResources(message, args) {
  // Check admin permissions
  if (!message.member.permissions.has('Administrator')) {
    return message.reply('❌ You need administrator permissions to use this command!');
  }

  // Parse arguments
  const targetUser = message.mentions.users.first();
  if (!targetUser) {
    return message.reply(
      '❌ Usage: `!setresources @user <type>:<value> ...`\n' +
      'Example: `!setresources @user ram:1024 disk:5120 cpu:100 servers:2`\n' +
      'Types: ram, disk, cpu, servers'
    );
  }

  // Parse resource values
  const resources = {};
  args.forEach(arg => {
    const [key, value] = arg.split(':');
    if (['ram', 'disk', 'cpu', 'servers'].includes(key)) {
      const numValue = parseInt(value);
      if (!isNaN(numValue)) {
        resources[key] = numValue;
      }
    }
  });

  if (Object.keys(resources).length === 0) {
    return message.reply('❌ Please specify at least one valid resource!\nExample: `ram:1024`');
  }

  try {
    await api.post(`/api/dashboard/users/${targetUser.id}/resources`, resources);

    const resourceStr = Object.entries(resources)
      .map(([key, val]) => `**${key}:** ${val}`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ Resources Updated')
      .setDescription(`Updated resources for ${targetUser.tag}:\n${resourceStr}`)
      .setTimestamp();

    message.reply({ embeds: [embed] });
  } catch (error) {
    await handleAPIError(message, error, 'update resources');
  }
}

async function handleSetPackage(message, args) {
  // Check admin permissions
  if (!message.member.permissions.has('Administrator')) {
    return message.reply('❌ You need administrator permissions to use this command!');
  }

  // Parse arguments
  const targetUser = message.mentions.users.first();
  const packageName = args[1];

  if (!targetUser) {
    return message.reply('❌ Usage: `!setpackage @user <package_name>`\nExample: `!setpackage @user premium`');
  }

  try {
    // Get available packages
    const packagesResponse = await api.get('/api/dashboard/packages');
    const availablePackages = Object.keys(packagesResponse.data.data.packages);

    if (packageName && !availablePackages.includes(packageName)) {
      return message.reply(
        `❌ Invalid package! Available packages:\n${availablePackages.map(p => `\`${p}\``).join(', ')}`
      );
    }

    await api.post(`/api/dashboard/users/${targetUser.id}/package`, {
      packageName: packageName || null
    });

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ Package Updated')
      .setDescription(
        packageName 
          ? `Set ${targetUser.tag}'s package to: **${packageName}**`
          : `Reset ${targetUser.tag}'s package to default`
      )
      .setTimestamp();

    message.reply({ embeds: [embed] });
  } catch (error) {
    await handleAPIError(message, error, 'update package');
  }
}

// ==================== ERROR HANDLER ====================

async function handleAPIError(message, error, action) {
  console.error(`API Error while trying to ${action}:`, error.response?.data || error.message);

  let errorMsg = `❌ Failed to ${action}.`;
  let errorDetails = '';

  if (error.response) {
    // API returned an error
    switch (error.response.status) {
      case 401:
        errorDetails = '**Error:** Invalid API key. Contact bot administrator.';
        break;
      case 403:
        errorDetails = '**Error:** Insufficient permissions.';
        break;
      case 404:
        errorDetails = '**Error:** User or resource not found. Have you logged into the dashboard at least once?';
        break;
      case 500:
        errorDetails = '**Error:** Server error. Try again later.';
        break;
      default:
        errorDetails = `**Error:** ${error.response.data.message || 'Unknown error'}`;
    }
  } else if (error.request) {
    // Request made but no response
    errorDetails = '**Error:** Cannot connect to dashboard API. Is the dashboard running?';
  } else {
    // Something else happened
    errorDetails = `**Error:** ${error.message}`;
  }

  const embed = new EmbedBuilder()
    .setColor('#ff0000')
    .setTitle(errorMsg)
    .setDescription(errorDetails)
    .setTimestamp();

  message.reply({ embeds: [embed] });
}

// Login to Discord
client.login(process.env.DISCORD_TOKEN);

console.log('Starting Discord bot...');
```

---

## Running Your Bot

### Step 1: Create Required Files

Create a new folder for your bot and add these files:

**Directory structure:**
```
my-dashboard-bot/
├── .env
├── bot.js
├── package.json
└── node_modules/
```

**Create `package.json`:**
```bash
npm init -y
```

**Install dependencies:**
```bash
npm install discord.js axios dotenv
```

### Step 2: Configure Environment

Edit `.env` file:
```env
DISCORD_TOKEN=YOUR_BOT_TOKEN_HERE
API_KEY=hlm_YOUR_API_KEY_HERE
API_URL=http://localhost:19133
```

**Getting your Discord bot token:**
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or select existing one
3. Go to "Bot" section
4. Click "Reset Token" to get your token
5. Copy the token to your `.env` file

**Bot invite link:**
Create an invite link with these permissions:
- Send Messages
- Embed Links
- Read Message History
- Use External Emojis

Invite URL format:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_BOT_CLIENT_ID&permissions=51200&scope=bot
```

### Step 3: Enable Message Content Intent

**IMPORTANT:** In Discord Developer Portal:
1. Go to your application
2. Click "Bot" section
3. Scroll down to "Privileged Gateway Intents"
4. Enable "MESSAGE CONTENT INTENT"
5. Save changes

Without this, your bot won't be able to read message content!

### Step 4: Run Your Bot

```bash
node bot.js
```

You should see:
```
Starting Discord bot...
✓ Bot logged in as YourBot#1234
✓ API URL: http://localhost:19133
✓ API connection successful!
  Dashboard: online
  Pterodactyl: online
```

### Step 5: Test Commands

In your Discord server, try:
```
!help
!userinfo
!coins
!servers
!stats
```

---

## Command Examples

### User Commands

#### Check Your Profile
```
!userinfo
!profile
!me
```
Shows your coins, package, resources, and admin status.

#### List Your Servers
```
!servers
!myservers
```
Displays all your servers with their status and resources.

#### Check Coin Balance
```
!coins
!balance
```
Shows your current coin balance.

#### Dashboard Statistics
```
!stats
```
Displays total users and servers on the dashboard.

### Admin Commands

#### Give Coins to User
```
!givecoins @username 100
```
Adds 100 coins to the mentioned user.

#### Update User Resources
```
!setresources @username ram:1024 disk:5120
!setresources @username cpu:100 servers:2
!setresources @username ram:2048 disk:10240 cpu:200 servers:3
```
Updates extra resources for a user.

#### Change User Package
```
!setpackage @username premium
!setpackage @username default
```
Changes the user's package/plan.

---

## API Endpoints Reference

### User Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard/users/:discordId` | GET | Get user information |
| `/api/dashboard/users/:discordId/resources` | POST | Update extra resources |
| `/api/dashboard/users/:discordId/coins` | POST | Update coins |
| `/api/dashboard/users/:discordId/package` | POST | Update package |

### Server Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard/servers?discordId=:id` | GET | Get user's servers |
| `/api/dashboard/servers` | GET | Get all servers |
| `/api/dashboard/servers/:id` | GET | Get server details |
| `/api/dashboard/servers/:id` | DELETE | Delete server |

### Dashboard Information

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard/settings` | GET | Get dashboard settings |
| `/api/dashboard/packages` | GET | Get available packages |
| `/api/dashboard/stats` | GET | Get statistics |
| `/api/dashboard/health` | GET | Health check |

### Request/Response Examples

**Get User Info:**
```javascript
const response = await api.get('/api/dashboard/users/123456789012345678');
// Response:
{
  "success": true,
  "data": {
    "discordId": "123456789012345678",
    "pterodactylId": 1,
    "packageName": "default",
    "coins": 100,
    "extraResources": {
      "ram": 1024,
      "disk": 5120,
      "cpu": 100,
      "servers": 2
    },
    "isAdmin": false,
    "pterodactylUser": { /* ... */ }
  }
}
```

**Update Coins:**
```javascript
await api.post('/api/dashboard/users/123456789012345678/coins', {
  coins: 50,
  action: 'add'  // 'add', 'subtract', or 'set'
});
// Response:
{
  "success": true,
  "message": "Coins updated successfully",
  "data": {
    "coins": 150
  }
}
```

**Get User Servers:**
```javascript
const response = await api.get('/api/dashboard/servers?discordId=123456789012345678');
// Response:
{
  "success": true,
  "data": {
    "object": "list",
    "data": [
      {
        "object": "server",
        "attributes": {
          "id": 1,
          "name": "My Server",
          "limits": {
            "memory": 1024,
            "disk": 5120,
            "cpu": 100
          }
          // ... more server data
        }
      }
    ]
  }
}
```

---

## Error Handling

### Common Error Responses

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or disabled API key"
}
```
**Solution:** Check your API key is correct and enabled in dashboard.

**403 Forbidden:**
```json
{
  "error": "Forbidden",
  "message": "API key does not have required permissions"
}
```
**Solution:** Update API key permissions in dashboard admin panel.

**404 Not Found:**
```json
{
  "error": "Not Found",
  "message": "User not found in database"
}
```
**Solution:** User needs to login to dashboard at least once.

### Error Handling in Code

```javascript
try {
  const response = await api.get('/api/dashboard/users/' + userId);
  // Handle success
  console.log(response.data);
} catch (error) {
  if (error.response) {
    // API returned an error
    console.error('Status:', error.response.status);
    console.error('Message:', error.response.data.message);
  } else if (error.request) {
    // No response received
    console.error('Dashboard API not responding');
  } else {
    // Other error
    console.error('Error:', error.message);
  }
}
```

---

## Troubleshooting

### Bot Not Responding

**Check 1: Message Content Intent**
- Go to Discord Developer Portal → Bot → Privileged Gateway Intents
- Enable "MESSAGE CONTENT INTENT"

**Check 2: Bot Permissions**
- Ensure bot has "Send Messages" and "Embed Links" permissions in your server

**Check 3: Bot is Online**
- Check console for "Bot logged in" message
- Make sure bot appears online in Discord

### API Connection Failed

**Error: `ECONNREFUSED`**
- Dashboard is not running
- Start dashboard: `npm start` or `node app.js`

**Error: `401 Unauthorized`**
- API key is incorrect or disabled
- Check `.env` file has correct API key
- Verify key is enabled in dashboard admin panel

**Error: `404 Not Found`**
- User hasn't logged into dashboard yet
- Each user must login at least once to be in database

### Commands Not Working

**Commands don't respond:**
1. Check Message Content Intent is enabled
2. Verify command prefix (`!` by default)
3. Check bot has permissions in channel

**Admin commands not working:**
1. User needs Discord Administrator permission
2. Check error messages in console

### Dashboard Not Accessible Externally

If using external domain/IP:
1. Update `API_URL` in `.env` to your external URL
2. Ensure port 19133 (or your custom port) is open
3. Check firewall settings

---

## Advanced Features

### Custom Prefix

Change the prefix in `bot.js`:
```javascript
const prefix = '!';  // Change to your preferred prefix
```

### Rate Limiting

Add rate limiting to prevent spam:
```javascript
const cooldowns = new Map();

function checkCooldown(userId, commandName, cooldownTime = 3000) {
  if (cooldowns.has(userId)) {
    const cooldownEnd = cooldowns.get(userId);
    if (Date.now() < cooldownEnd) {
      const timeLeft = ((cooldownEnd - Date.now()) / 1000).toFixed(1);
      return { limited: true, timeLeft };
    }
  }
  
  cooldowns.set(userId, Date.now() + cooldownTime);
  setTimeout(() => cooldowns.delete(userId), cooldownTime);
  
  return { limited: false };
}

// Use in commands:
const cooldown = checkCooldown(message.author.id, 'userinfo');
if (cooldown.limited) {
  return message.reply(`⏱️ Please wait ${cooldown.timeLeft} seconds before using this command again.`);
}
```

### Slash Commands

To use slash commands instead of prefix commands, see [Discord.js Slash Commands Guide](https://discordjs.guide/interactions/slash-commands.html).

---

## Security Best Practices

### 1. Never Share Your API Key
- Keep API key in `.env` file
- Add `.env` to `.gitignore`
- Never commit API keys to Git

### 2. Validate User Input
```javascript
// Always validate before API calls
if (!targetUser || !amount || isNaN(amount)) {
  return message.reply('Invalid input!');
}

if (amount < 1 || amount > 999999) {
  return message.reply('Amount out of range!');
}
```

### 3. Check Permissions
```javascript
// Always verify admin permissions for admin commands
if (!message.member.permissions.has('Administrator')) {
  return message.reply('Insufficient permissions!');
}
```

### 4. Use Environment Variables
```javascript
// ✅ Good
const apiKey = process.env.API_KEY;

// ❌ Bad
const apiKey = 'hlm_actual_key_here';
```

### 5. Handle Errors Gracefully
```javascript
try {
  // API call
} catch (error) {
  // Don't expose sensitive error details to users
  console.error('Error:', error);  // Log for debugging
  message.reply('An error occurred.');  // Generic user message
}
```

---

## Additional Resources

- [Discord.js Documentation](https://discord.js.org/)
- [Discord Developer Portal](https://discord.com/developers/applications)
- [Axios Documentation](https://axios-http.com/)
- Helium Dashboard: Your dashboard URL

---

## Need Help?

**Common Issues:**
- Bot offline: Check bot token and Message Content Intent
- API errors: Verify API key and dashboard is running
- Commands not working: Check permissions and prefix

**Testing:**
Run the test script included with Helium:
```bash
node test-bot-api.js
```

---

**Happy coding! 🚀**
