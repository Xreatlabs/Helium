# Server Renewal System

The Server Renewal System is a comprehensive feature in Helium that allows server expiration, coin-based renewals, and automatic suspension/deletion of expired servers.

## Features

- **Automatic Expiration**: Servers automatically expire after a configured period
- **Coin-Based Renewal**: Users can renew servers using coins
- **Grace Period**: Servers aren't immediately suspended after expiration
- **Auto-Suspension**: Expired servers are automatically suspended after the grace period
- **Auto-Deletion**: Optionally delete servers after being suspended for a set period
- **Webhook Integration**: Trigger webhook events for renewals and suspensions
- **Admin Controls**: Admins can manually set/reset server expiration dates
- **Visual Indicators**: Color-coded expiration status in the UI

## Configuration

Add the following configuration to your `settings.json` under `api.client.allow`:

```json
{
  "api": {
    "client": {
      "allow": {
        "renewsuspendsystem": {
          "_comment": "Server renewal system - servers expire and can be renewed with coins",
          "enabled": true,
          "renewalperiod": 30,
          "_renewalperiod_note": "Days a server lasts before requiring renewal",
          "renewalcost": 100,
          "_renewalcost_note": "Coins required to renew a server for the renewal period",
          "graceperiod": 3,
          "_graceperiod_note": "Days after expiration before auto-suspension",
          "autosuspend": true,
          "_autosuspend_note": "Automatically suspend servers after grace period expires",
          "deletionperiod": 7,
          "_deletionperiod_note": "Days after suspension before server is deleted (0 to disable auto-deletion)"
        }
      }
    }
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable the entire renewal system |
| `renewalperiod` | number | `30` | Number of days a server lasts before expiring |
| `renewalcost` | number | `100` | Coins required to renew a server |
| `graceperiod` | number | `3` | Days after expiration before suspension |
| `autosuspend` | boolean | `true` | Automatically suspend expired servers |
| `deletionperiod` | number | `7` | Days after suspension before deletion (0 = disabled) |

## How It Works

### 1. Server Creation
When a user creates a new server, an expiration date is automatically set:
- Expiration = Current Time + Renewal Period

The expiration is stored in the database as: `server-expiry-{serverId}`

### 2. Expiration States

Servers go through several states:

1. **Active** (> 3 days until expiry)
   - Green badge: "Expires in X days"
   - Server operates normally

2. **Expiring Soon** (≤ 3 days until expiry)
   - Yellow badge: "Expires in X days"
   - User should renew soon

3. **Expired - Grace Period** (< 0 days, within grace period)
   - Orange badge: "Expired X days ago (grace period)"
   - Server still running but needs renewal urgently

4. **Suspended** (expired beyond grace period)
   - Red badge: "Suspended - Expired X days ago"
   - Server is suspended and offline
   - Can be renewed to unsuspend

### 3. Renewal Process

Users can renew servers by:
1. Clicking the "Renew" button on the servers page
2. Cost: Configured renewal cost in coins
3. Extension: Adds renewal period to the current expiration (or from now if already expired)

#### API Endpoint: `POST /renew`
```javascript
// Request Body
{
  "serverid": "123"
}

// Response
// Redirects to /dashboard?err=RENEWED
// Or /dashboard?err=INSUFFICIENT_COINS
```

### 4. Automatic Suspension (Cron Job)

A cron job runs every hour to check for expired servers:

- **Location**: `scripts/renewal-cron.js`
- **Schedule**: Every hour (0 * * * *)
- **Actions**:
  - Suspend servers past grace period (if `autosuspend` is enabled)
  - Delete suspended servers past deletion period (if `deletionperiod` > 0)
  - Track servers expiring soon for potential notifications

The cron job automatically starts when Helium starts (if renewal system is enabled).

### 5. Webhook Events

The system triggers the following webhook events:

#### `server.renewed`
Triggered when a user renews a server.
```javascript
{
  serverId: "123",
  serverName: "My Server",
  userId: "456",
  username: "User#1234",
  coinsSpent: 100,
  newExpiry: "2024-02-01T00:00:00.000Z",
  renewalDays: 30
}
```

#### `server.suspended`
Triggered when a server is auto-suspended.
```javascript
{
  serverId: "123",
  reason: "Server expired and grace period ended",
  automatic: true
}
```

#### `server.deleted`
Triggered when a server is auto-deleted.
```javascript
{
  serverId: "123",
  reason: "Server auto-deleted after suspension period",
  automatic: true
}
```

## User Interface

### Servers Page

Each server card displays:
- **Expiration Badge**: Color-coded status indicator
- **Renew Button**: Displays cost in coins
- **Visual Status**:
  - 🟢 Green: Active (> 3 days)
  - 🟡 Yellow: Expiring soon (≤ 3 days)
  - 🟠 Orange: Expired (grace period)
  - 🔴 Red: Suspended

### Success Messages

After renewal:
```
✅ Server Renewed!
Your server has been successfully renewed and will remain active for another 30 days.
```

### Error Messages

Insufficient coins:
```
❌ Insufficient Coins
You don't have enough coins to renew this server. You need 100 coins.
```

## Admin Controls

### Manual Expiry Management

Admins can manually set or remove server expiration dates.

#### API Endpoint: `POST /admin/server/expiry`

```javascript
// Set expiry to X days from now
{
  "serverId": "123",
  "expiryDays": 30
}

// Remove expiry (server never expires)
{
  "serverId": "123",
  "expiryDays": null
}

// Response
{
  "success": true,
  "message": "Expiration set to 30 days from now",
  "expiryDate": "2024-02-01T00:00:00.000Z"
}
```

### Admin Actions

Admins can:
1. Set custom expiration periods for specific servers
2. Remove expiration (server never expires)
3. Extend expiration without charging coins
4. View all server expiration dates

## Database Schema

The system uses the existing Keyv database with the following keys:

- `server-expiry-{serverId}`: Timestamp of when server expires
- `server-suspended-{serverId}`: Boolean flag indicating if server is suspended

## Installation & Setup

1. **Configuration**: Add renewal settings to `settings.json`
2. **Restart**: Restart Helium to load the new configuration
3. **Cron Job**: Automatically starts with Helium
4. **Existing Servers**: Set expiration manually via admin API or wait for next server creation

## Migration for Existing Servers

If you're enabling the renewal system on an existing Helium installation:

### Option 1: Set Default Expiration for All Servers
Run this script to set expiration for all existing servers:

```javascript
const settings = require('./settings.json');
const Keyv = require('keyv').default;
const { KeyvSqlite } = require('@keyv/sqlite');

const sqliteStore = new KeyvSqlite({
  uri: settings.database,
  busyTimeout: 10000
});

const db = new Keyv({
  store: sqliteStore,
  namespace: 'helium'
});

async function setExpirationForAllServers() {
  const renewalPeriod = settings.api.client.allow.renewsuspendsystem.renewalperiod;
  const expiryDate = Date.now() + (renewalPeriod * 24 * 60 * 60 * 1000);
  
  // Get all server IDs from your Pterodactyl panel
  // For each server:
  await db.set(`server-expiry-{serverId}`, expiryDate);
  
  console.log('Set expiration for all servers');
}

setExpirationForAllServers().then(() => process.exit());
```

### Option 2: Gradually Phase In
- New servers automatically get expiration dates
- Existing servers without expiration dates are treated as permanent
- Manually set expiration for existing servers as needed

## Troubleshooting

### Cron Job Not Running
- Check console logs for "Renewal Cron: Job started"
- Verify `renewsuspendsystem.enabled` is `true`
- Check for errors in console

### Servers Not Auto-Suspending
- Verify `autosuspend` is `true`
- Check cron job is running
- Verify Pterodactyl API key has suspend permissions
- Check console logs for suspension errors

### Renewal Button Not Showing
- Verify `renewsuspendsystem.enabled` is `true`
- Check that coins system is enabled
- Clear browser cache and reload

### Server Won't Renew
- Check user has enough coins
- Verify server belongs to user
- Check console logs for errors

## Best Practices

1. **Grace Period**: Set a reasonable grace period (3-7 days) to give users time
2. **Renewal Cost**: Balance between encouraging activity and being affordable
3. **Notifications**: Set up Discord webhooks to notify about expiring servers
4. **Communication**: Inform users about the renewal system clearly
5. **Admin Overrides**: Use admin controls to help users in special circumstances

## Future Enhancements

Potential features for future versions:
- Email notifications for expiring servers
- Auto-renewal option (opt-in, charges coins automatically)
- Different renewal costs per server type/package
- Bulk renewal discounts
- Renewal history tracking
- Grace period warnings in the UI

## Support

For issues or questions:
1. Check console logs for errors
2. Verify configuration is correct
3. Check database for expiration entries
4. Review webhook logs for integration issues

## Credits

Developed for Helium 1.0.0 (Cascade Ridge) by the Helium team.
