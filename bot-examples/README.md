# Discord Bot Examples

This directory contains example Discord bot implementations for integrating with the Helium dashboard.

## Available Examples

### `discord-role-sync.js`

Complete Discord bot that automatically syncs Discord roles with the dashboard and grants rewards.

**Features:**
- ✅ Auto-detect role changes
- ✅ Server boost detection
- ✅ User commands (!syncmyroles, !myroles)
- ✅ DM notifications
- ✅ Comprehensive logging

**Setup:**

1. Install dependencies:
   ```bash
   npm install discord.js axios
   ```

2. Get your Discord bot token from https://discord.com/developers/applications

3. Edit the script and add your bot token, or use environment variables:
   ```bash
   export DISCORD_BOT_TOKEN="your_token_here"
   export DASHBOARD_URL="http://localhost:19133"
   export API_KEY="your_api_key_here"
   export GUILD_ID="your_guild_id_here"
   ```

4. Run the bot:
   ```bash
   node discord-role-sync.js
   ```

**Commands:**
- `!syncmyroles` - Sync your current Discord roles and receive rewards
- `!myroles` - Show which of your roles have dashboard rewards

## Configuration

### API Key

Get your API key from the dashboard admin panel under API settings. This key is used to authenticate API requests from your bot to the dashboard.

### Required Bot Permissions

Your Discord bot needs these intents:
- `Guilds`
- `GuildMembers` (Privileged - must be enabled in Discord Developer Portal)
- `GuildMessages`
- `MessageContent` (Privileged - must be enabled in Discord Developer Portal)

### Discord Developer Portal Setup

1. Go to https://discord.com/developers/applications
2. Select your application
3. Go to "Bot" section
4. Enable these Privileged Gateway Intents:
   - ✅ SERVER MEMBERS INTENT
   - ✅ MESSAGE CONTENT INTENT
5. Save changes

## Integration with Existing Bots

If you already have a Discord bot, you can add role sync functionality by:

1. Installing axios: `npm install axios`
2. Adding the role sync code from `discord-role-sync.js`
3. Using the provided API key for authentication

See the example file for complete implementation details.

## API Endpoints Used

- `POST /api/dashboard/roles/sync` - Sync user roles and grant/remove rewards
- `GET /api/dashboard/roles/user/:discordId` - Get user's configured roles

## Troubleshooting

### Bot can't detect role changes
- Make sure `GuildMembers` intent is enabled
- Verify bot has permission to view members
- Check bot is in the correct guild

### API authentication errors
- Verify API key is correct
- Check `X-API-Key` header is being sent
- Ensure API key exists in dashboard database

### Rewards not granted
- Check role is configured in dashboard at `/discord-roles`
- Verify role ID matches exactly
- Ensure role configuration is enabled

## Testing

1. Configure a test role in the dashboard at `/discord-roles`
2. Give yourself that role in Discord
3. Wait a moment for the bot to detect the change
4. Check your dashboard account for the rewards
5. Or run `!syncmyroles` to manually trigger sync

## More Information

- Full setup guide: `../DISCORD_ROLE_SETUP.md`
- API documentation: `../BOTAPI.md`
- Admin UI: http://localhost:19133/discord-roles
