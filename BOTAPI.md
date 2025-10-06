# Discord Bot API Integration Guide

Complete guide to connect your Discord bot with the Helium dashboard API system.

---

## Table of Contents
1. [Quick Setup](#quick-setup)
2. [Creating Your First API Key](#creating-your-first-api-key)
3. [Discord.js Bot Setup](#discordjs-bot-setup)
4. [Command Examples](#command-examples)
5. [API Endpoints Reference](#api-endpoints-reference)
6. [Error Handling](#error-handling)
7. [Security Best Practices](#security-best-practices)

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

### Step 2: Install Required Packages

```bash
npm install discord.js axios dotenv
```

### Step 3: Create Environment File

Create `.env` file in your bot directory:

```env
DISCORD_TOKEN=your_discord_bot_token_here
API_KEY=hlm_your_api_key_here
API_URL=http://localhost:3000
```

---

## Discord.js Bot Setup

### Basic Bot Structure

Create `bot.js`:

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

// Test API connection
async function testAPIConnection() {
  try {
    const response = await api.get('/api/dashboard/health');
    console.log('✓ API connection successful!');
    console.log(`  Dashboard: ${response.data.data.dashboard}`);
    console.log(`  Pterodactyl: ${response.data.data.pterodactyl}`);
  } catch (error) {
    console.error('✗ API connection failed!');
    console.error(`  Error: ${error.message}`);
  }
}

// Message handler
client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Your commands will go here
  handleCommands(message);
});

// Command handler function
async function handleCommands(message) {
  const prefix = '!';
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Commands will be added here
  switch (command) {
    case 'ping':
      message.reply('Pong! 🏓');
      break;
    
    case 'help':
      showHelpMenu(message);
      break;

    // Add more commands here
  }
}

// Help menu
function showHelpMenu(message) {
  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('🤖 Bot Commands')
    .setDescription('Available dashboard commands:')
    .addFields(
      { name: '!ping', value: 'Test bot response' },
      { name: '!userinfo', value: 'Get your dashboard info' },
      { name: '!servers', value: 'List your servers' },
      { name: '!coins', value: 'Check your coin balance' },
      { name: '!stats', value: 'View dashboard statistics' }
    )
    .setFooter({ text: 'Admin commands available for administrators' });

  message.reply({ embeds: [embed] });
}

// Login to Discord
client.login(process.env.DISCORD_TOKEN);

// Export for use in other files
module.exports = { client, api };
```

---

## Command Examples

### 1. User Information Command

```javascript
case 'userinfo':
  try {
    const response = await api.get(`/api/dashboard/users/${message.author.id}`);
    const data = response.data.data;

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('📊 Your Dashboard Info')
      .addFields(
        { name: 'Package', value: data.packageName || 'Default', inline: true },
        { name: 'Coins', value: `${data.coins}`, inline: true },
        { name: 'Admin', value: data.isAdmin ? 'Yes' : 'No', inline: true },
        { name: 'Extra RAM', value: `${data.extraResources.ram} MB`, inline: true },
        { name: 'Extra Disk', value: `${data.extraResources.disk} MB`, inline: true },
        { name: 'Extra CPU', value: `${data.extraResources.cpu}%`, inline: true },
        { name: 'Extra Servers', value: `${data.extraResources.servers}`, inline: true }
      );

    message.reply({ embeds: [embed] });
  } catch (error) {
    handleAPIError(message, error, 'fetch your information');
  }
  break;
```

### 2. List User Servers Command

```javascript
case 'servers':
  try {
    const response = await api.get(`/api/dashboard/servers?discordId=${message.author.id}`);
    const servers = response.data.data.data;

    if (servers.length === 0) {
      return message.reply('You don\'t have any servers yet!');
    }

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('🖥️ Your Servers')
      .setDescription(`You have ${servers.length} server(s)`);

    servers.forEach((server, index) => {
      const limits = server.attributes.limits;
      embed.addFields({
        name: `${index + 1}. ${server.attributes.name}`,
        value: `**RAM:** ${limits.memory} MB | **Disk:** ${limits.disk} MB | **CPU:** ${limits.cpu}%\n**ID:** ${server.attributes.id}`,
        inline: false
      });
    });

    message.reply({ embeds: [embed] });
  } catch (error) {
    handleAPIError(message, error, 'fetch your servers');
  }
  break;
```

### 3. Check Coins Command

```javascript
case 'coins':
  try {
    const response = await api.get(`/api/dashboard/users/${message.author.id}`);
    const coins = response.data.data.coins;

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🪙 Your Coins')
      .setDescription(`You have **${coins}** coins!`);

    message.reply({ embeds: [embed] });
  } catch (error) {
    handleAPIError(message, error, 'fetch your coins');
  }
  break;
```

### 4. Admin: Give Coins Command

```javascript
case 'givecoins':
  // Check if user has admin permissions in your Discord server
  if (!message.member.permissions.has('Administrator')) {
    return message.reply('❌ You need administrator permissions!');
  }

  // Parse arguments: !givecoins @user 100
  const targetUser = message.mentions.users.first();
  const amount = parseInt(args[1]);

  if (!targetUser || !amount) {
    return message.reply('Usage: `!givecoins @user <amount>`');
  }

  if (amount < 1 || amount > 999999) {
    return message.reply('Amount must be between 1 and 999999');
  }

  try {
    await api.post(`/api/dashboard/users/${targetUser.id}/coins`, {
      coins: amount,
      action: 'add'
    });

    message.reply(`✅ Successfully gave ${amount} coins to ${targetUser.tag}!`);
  } catch (error) {
    handleAPIError(message, error, 'give coins');
  }
  break;
```

### 5. Admin: Update User Resources Command

```javascript
case 'setresources':
  // Check if user has admin permissions
  if (!message.member.permissions.has('Administrator')) {
    return message.reply('❌ You need administrator permissions!');
  }

  // Parse arguments: !setresources @user ram:1024 disk:5120 cpu:100 servers:2
  const user = message.mentions.users.first();
  if (!user) {
    return message.reply('Usage: `!setresources @user ram:1024 disk:5120 cpu:100 servers:2`');
  }

  // Parse resource values
  const resources = {};
  args.forEach(arg => {
    const [key, value] = arg.split(':');
    if (['ram', 'disk', 'cpu', 'servers'].includes(key)) {
      resources[key] = parseInt(value);
    }
  });

  if (Object.keys(resources).length === 0) {
    return message.reply('Please specify at least one resource! Example: `ram:1024`');
  }

  try {
    await api.post(`/api/dashboard/users/${user.id}/resources`, resources);

    const resourceStr = Object.entries(resources)
      .map(([key, val]) => `${key}: ${val}`)
      .join(', ');

    message.reply(`✅ Updated resources for ${user.tag}: ${resourceStr}`);
  } catch (error) {
    handleAPIError(message, error, 'update resources');
  }
  break;
```

### 6. Admin: Server Control Command

```javascript
case 'server':
  // Check if user has admin permissions
  if (!message.member.permissions.has('Administrator')) {
    return message.reply('❌ You need administrator permissions!');
  }

  // Parse arguments: !server <id> <action>
  const serverId = args[0];
  const action = args[1]; // start, stop, restart, kill

  if (!serverId || !action) {
    return message.reply('Usage: `!server <server_id> <start|stop|restart|kill>`');
  }

  if (!['start', 'stop', 'restart', 'kill'].includes(action)) {
    return message.reply('Invalid action! Use: start, stop, restart, or kill');
  }

  try {
    await api.post(`/api/dashboard/servers/${serverId}/power`, { action });
    message.reply(`✅ Server ${serverId}: ${action} command sent!`);
  } catch (error) {
    handleAPIError(message, error, `${action} the server`);
  }
  break;
```

### 7. Dashboard Statistics Command

```javascript
case 'stats':
  try {
    const response = await api.get('/api/dashboard/stats');
    const stats = response.data.data;

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('📊 Dashboard Statistics')
      .addFields(
        { name: 'Total Users', value: `${stats.totalUsers}`, inline: true },
        { name: 'Total Servers', value: `${stats.totalServers}`, inline: true }
      )
      .setFooter({ text: `Updated: ${new Date(stats.timestamp).toLocaleString()}` });

    message.reply({ embeds: [embed] });
  } catch (error) {
    handleAPIError(message, error, 'fetch statistics');
  }
  break;
```

### 8. Admin: Change User Package Command

```javascript
case 'setpackage':
  // Check if user has admin permissions
  if (!message.member.permissions.has('Administrator')) {
    return message.reply('❌ You need administrator permissions!');
  }

  // Parse arguments: !setpackage @user premium
  const packageUser = message.mentions.users.first();
  const packageName = args[1];

  if (!packageUser) {
    return message.reply('Usage: `!setpackage @user <package_name>`');
  }

  try {
    // First, get available packages
    const packagesResponse = await api.get('/api/dashboard/packages');
    const availablePackages = Object.keys(packagesResponse.data.data.packages);

    if (packageName && !availablePackages.includes(packageName)) {
      return message.reply(`Invalid package! Available: ${availablePackages.join(', ')}`);
    }

    await api.post(`/api/dashboard/users/${packageUser.id}/package`, {
      packageName: packageName || null
    });

    const msg = packageName 
      ? `✅ Set ${packageUser.tag}'s package to: ${packageName}`
      : `✅ Reset ${packageUser.tag}'s package to default`;

    message.reply(msg);
  } catch (error) {
    handleAPIError(message, error, 'update package');
  }
  break;
```

---

## Error Handling

Add this error handler function to your bot:

```javascript
function handleAPIError(message, error, action) {
  console.error(`API Error while trying to ${action}:`, error.response?.data || error.message);

  let errorMsg = `❌ Failed to ${action}.`;

  if (error.response) {
    // API returned an error
    switch (error.response.status) {
      case 401:
        errorMsg += '\n**Error:** Invalid API key. Contact bot administrator.';
        break;
      case 403:
        errorMsg += '\n**Error:** Insufficient permissions.';
        break;
      case 404:
        errorMsg += '\n**Error:** User or resource not found.';
        break;
      case 500:
        errorMsg += '\n**Error:** Server error. Try again later.';
        break;
      default:
        errorMsg += `\n**Error:** ${error.response.data.message || 'Unknown error'}`;
    }
  } else if (error.request) {
    // Request made but no response
    errorMsg += '\n**Error:** Cannot connect to dashboard API. Check if dashboard is running.';
  } else {
    // Something else happened
    errorMsg += `\n**Error:** ${error.message}`;
  }

  message.reply(errorMsg);
}
```

---

## API Endpoints Reference

### User Management

| Endpoint | Method | Permission | Description |
|----------|--------|-----------|-------------|
| `/api/dashboard/users/:discordId` | GET | `users.read`, `*` | Get user information |
| `/api/dashboard/users/:discordId/resources` | POST | `users.write`, `*` | Update extra resources |
| `/api/dashboard/users/:discordId/coins` | POST | `users.write`, `*` | Update coins |
| `/api/dashboard/users/:discordId/package` | POST | `users.write`, `*` | Update package/plan |

### Server Management

| Endpoint | Method | Permission | Description |
|----------|--------|-----------|-------------|
| `/api/dashboard/servers` | GET | `servers.read`, `*` | List all servers (filter by discordId) |
| `/api/dashboard/servers/:serverId` | GET | `servers.read`, `*` | Get server details |
| `/api/dashboard/servers/:serverId/power` | POST | `servers.control`, `*` | Send power action (start/stop/restart/kill) |
| `/api/dashboard/servers/:serverId` | DELETE | `servers.delete`, `*` | Delete server |

### Dashboard Information

| Endpoint | Method | Permission | Description |
|----------|--------|-----------|-------------|
| `/api/dashboard/settings` | GET | `settings.read`, `*` | Get dashboard settings |
| `/api/dashboard/packages` | GET | `settings.read`, `*` | Get available packages |
| `/api/dashboard/stats` | GET | `stats.read`, `*` | Get statistics |
| `/api/dashboard/health` | GET | Any | Health check |

---

## Request/Response Examples

### Get User Info

**Request:**
```javascript
const response = await api.get('/api/dashboard/users/123456789012345678');
```

**Response:**
```json
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

### Update Coins

**Request:**
```javascript
await api.post('/api/dashboard/users/123456789012345678/coins', {
  coins: 50,
  action: 'add'  // 'add', 'subtract', or 'set'
});
```

**Response:**
```json
{
  "success": true,
  "message": "Coins updated successfully",
  "data": {
    "coins": 150
  }
}
```

### Control Server

**Request:**
```javascript
await api.post('/api/dashboard/servers/1/power', {
  action: 'restart'  // 'start', 'stop', 'restart', or 'kill'
});
```

**Response:**
```json
{
  "success": true,
  "message": "Power action 'restart' sent successfully"
}
```

---

## Security Best Practices

### 1. Protect Your API Key

**❌ Never do this:**
```javascript
const API_KEY = 'hlm_your_actual_key_here';  // Don't hardcode!
```

**✅ Do this instead:**
```javascript
require('dotenv').config();
const API_KEY = process.env.API_KEY;
```

### 2. Add .env to .gitignore

Create/update `.gitignore`:
```
node_modules/
.env
config.json
```

### 3. Validate User Input

```javascript
// Always validate before making API calls
if (!targetUser || !amount || isNaN(amount)) {
  return message.reply('Invalid input!');
}

if (amount < 1 || amount > 999999) {
  return message.reply('Amount out of range!');
}
```

### 4. Implement Permission Checks

```javascript
// Check Discord permissions
if (!message.member.permissions.has('Administrator')) {
  return message.reply('You need administrator permissions!');
}

// Or check against a whitelist
const ADMIN_IDS = ['123456789012345678', '987654321098765432'];
if (!ADMIN_IDS.includes(message.author.id)) {
  return message.reply('You are not authorized!');
}
```

### 5. Use Try-Catch Blocks

```javascript
try {
  const response = await api.get('/api/dashboard/users/' + userId);
  // Handle success
} catch (error) {
  // Handle error properly
  handleAPIError(message, error, 'fetch user data');
}
```

### 6. Rate Limiting (Optional)

```javascript
const rateLimit = new Map();

function checkRateLimit(userId) {
  const now = Date.now();
  const userLimit = rateLimit.get(userId) || { count: 0, resetTime: now };

  if (now > userLimit.resetTime) {
    // Reset after 1 minute
    rateLimit.set(userId, { count: 1, resetTime: now + 60000 });
    return true;
  }

  if (userLimit.count >= 10) {
    return false; // Too many requests
  }

  userLimit.count++;
  rateLimit.set(userId, userLimit);
  return true;
}

// Use in commands
if (!checkRateLimit(message.author.id)) {
  return message.reply('Slow down! Try again in a minute.');
}
```

---

## Troubleshooting

### Bot can't connect to API

**Check:**
1. Is the dashboard running? (`npm start` in dashboard directory)
2. Is the API URL correct in `.env`? (e.g., `http://localhost:3000`)
3. Is the API key valid? Check in dashboard admin panel

**Test connection:**
```javascript
async function testConnection() {
  try {
    const response = await api.get('/api/dashboard/health');
    console.log('✓ Connected:', response.data);
  } catch (error) {
    console.error('✗ Connection failed:', error.message);
  }
}
```

### 401 Unauthorized Error

**Cause:** Invalid or missing API key

**Fix:**
1. Check if API key is correct in `.env`
2. Verify API key exists in dashboard (Admin → API Keys)
3. Make sure key is enabled (not disabled)

### 403 Forbidden Error

**Cause:** API key doesn't have required permissions

**Fix:**
1. Go to dashboard Admin → API Keys
2. Check the permissions for your API key
3. Add missing permissions or create new key with `*` (full access)

### 404 Not Found Error

**Cause:** User or server doesn't exist

**Fix:**
1. Verify the Discord ID is correct
2. Check if user has logged into dashboard at least once
3. Verify server ID exists in Pterodactyl

---

## Full Example Bot

Here's a complete working bot with all commands:

```javascript
// bot.js
require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const api = axios.create({
  baseURL: process.env.API_URL,
  headers: {
    'Authorization': `Bearer ${process.env.API_KEY}`,
    'Content-Type': 'application/json'
  }
});

client.once('ready', () => {
  console.log(`✓ Bot: ${client.user.tag}`);
  testAPIConnection();
});

async function testAPIConnection() {
  try {
    const { data } = await api.get('/api/dashboard/health');
    console.log(`✓ API: ${data.data.dashboard}`);
  } catch (error) {
    console.error('✗ API connection failed:', error.message);
  }
}

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  switch (command) {
    case 'userinfo':
      await getUserInfo(message);
      break;
    case 'servers':
      await getServers(message);
      break;
    case 'coins':
      await getCoins(message);
      break;
    case 'stats':
      await getStats(message);
      break;
    case 'givecoins':
      await giveCoins(message, args);
      break;
    case 'help':
      showHelp(message);
      break;
  }
});

async function getUserInfo(message) {
  try {
    const { data } = await api.get(`/api/dashboard/users/${message.author.id}`);
    const user = data.data;

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('📊 Your Dashboard Info')
      .addFields(
        { name: 'Package', value: user.packageName || 'Default', inline: true },
        { name: 'Coins', value: `${user.coins}`, inline: true },
        { name: 'Extra RAM', value: `${user.extraResources.ram} MB`, inline: true },
        { name: 'Extra Disk', value: `${user.extraResources.disk} MB`, inline: true }
      );

    message.reply({ embeds: [embed] });
  } catch (error) {
    handleError(message, error, 'fetch your info');
  }
}

async function getServers(message) {
  try {
    const { data } = await api.get(`/api/dashboard/servers?discordId=${message.author.id}`);
    const servers = data.data.data;

    if (servers.length === 0) {
      return message.reply('You don\'t have any servers!');
    }

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`🖥️ Your Servers (${servers.length})`)
      .setDescription(servers.map((s, i) => 
        `${i + 1}. **${s.attributes.name}** (ID: ${s.attributes.id})`
      ).join('\n'));

    message.reply({ embeds: [embed] });
  } catch (error) {
    handleError(message, error, 'fetch servers');
  }
}

async function getCoins(message) {
  try {
    const { data } = await api.get(`/api/dashboard/users/${message.author.id}`);
    message.reply(`🪙 You have **${data.data.coins}** coins!`);
  } catch (error) {
    handleError(message, error, 'fetch coins');
  }
}

async function getStats(message) {
  try {
    const { data } = await api.get('/api/dashboard/stats');
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('📊 Dashboard Statistics')
      .addFields(
        { name: 'Total Users', value: `${data.data.totalUsers}`, inline: true },
        { name: 'Total Servers', value: `${data.data.totalServers}`, inline: true }
      );

    message.reply({ embeds: [embed] });
  } catch (error) {
    handleError(message, error, 'fetch stats');
  }
}

async function giveCoins(message, args) {
  if (!message.member.permissions.has('Administrator')) {
    return message.reply('❌ Admin only!');
  }

  const user = message.mentions.users.first();
  const amount = parseInt(args[1]);

  if (!user || !amount || amount < 1) {
    return message.reply('Usage: `!givecoins @user <amount>`');
  }

  try {
    await api.post(`/api/dashboard/users/${user.id}/coins`, {
      coins: amount,
      action: 'add'
    });

    message.reply(`✅ Gave ${amount} coins to ${user.tag}!`);
  } catch (error) {
    handleError(message, error, 'give coins');
  }
}

function showHelp(message) {
  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('🤖 Bot Commands')
    .addFields(
      { name: '!userinfo', value: 'Your dashboard info' },
      { name: '!servers', value: 'List your servers' },
      { name: '!coins', value: 'Check coin balance' },
      { name: '!stats', value: 'Dashboard statistics' },
      { name: '!givecoins @user <amount>', value: 'Give coins (Admin)' }
    );

  message.reply({ embeds: [embed] });
}

function handleError(message, error, action) {
  console.error(`Error while ${action}:`, error.response?.data || error.message);
  
  let msg = `❌ Failed to ${action}. `;
  if (error.response?.status === 404) {
    msg += 'User not found. Have you logged into the dashboard?';
  } else if (error.response?.status === 401) {
    msg += 'Invalid API key. Contact bot admin.';
  } else {
    msg += 'Try again later.';
  }
  
  message.reply(msg);
}

client.login(process.env.DISCORD_TOKEN);
```

---

## Running Your Bot

1. Create the files:
   - `bot.js` (main bot file)
   - `.env` (environment variables)
   - `package.json` (if not exists: `npm init -y`)

2. Install dependencies:
   ```bash
   npm install discord.js axios dotenv
   ```

3. Start the bot:
   ```bash
   node bot.js
   ```

4. Test in Discord:
   ```
   !help
   !userinfo
   !coins
   ```

---

## Permission Reference

When creating an API key, you can select these permissions:

- `*` - **Full Access** (all endpoints)
- `users.read` - Read user information
- `users.write` - Modify users (coins, resources, packages)
- `servers.read` - Read server information  
- `servers.control` - Start/stop/restart servers
- `servers.delete` - Delete servers
- `settings.read` - Read dashboard settings
- `stats.read` - Read statistics

**Recommendation:** Use `*` for your bot to have full access, or combine specific permissions like `users.read`, `users.write`, `servers.read`, `servers.control`, `stats.read` for most bot functionality.

---

## Need Help?

1. Check dashboard is running on the correct port
2. Verify API key in dashboard admin panel
3. Check `.env` file has correct values
4. Look at console logs for error details
5. Test API health: `curl -H "Authorization: Bearer YOUR_KEY" http://localhost:3000/api/dashboard/health`

**Common Issues:**
- **ECONNREFUSED**: Dashboard not running
- **401 Unauthorized**: Wrong API key
- **403 Forbidden**: Missing permissions
- **404 Not Found**: User hasn't logged in to dashboard yet

---

**Happy coding! 🚀**
