# Enhanced Webhook Logging System

## Overview
The webhook logging system has been significantly enhanced to provide more visually appealing and informative Discord embeds with color coding, emojis, and structured data fields.

## Features

### 🎨 Color-Coded Embeds
Each action type has its own unique color for easy visual identification:

**User Actions** (Blue/Cyan tones):
- 📝 Signup - Discord Blurple (#5865F2)
- 🚀 Create Server - Green (#57F287)
- ⚙️ Modify Server - Yellow (#FEE75C)
- 💾 Buy RAM - Blue (#3498DB)
- ⚡ Buy CPU - Purple (#9B59B6)
- 💿 Buy Disk - Orange (#E67E22)
- 🖥️ Buy Servers - Turquoise (#1ABC9C)
- 🎁 Gifted Coins - Gold (#F1C40F)

**Admin Actions** (Red/Orange tones):
- 💰 Set Coins - Red (#E74C3C)
- ➕ Add Coins - Orange (#E67E22)
- 📊 Set Resources - Dark Orange (#F39C12)
- 📋 Set Plan - Purple (#9B59B6)
- 🎟️ Create Coupon - Emerald (#2ECC71)
- 🚫 Revoke Coupon - Red (#E74C3C)
- 🗑️ Remove Account - Dark Red (#C0392B)
- 🔍 View IP - Gray (#95A5A6)

### ✨ Enhanced Features

1. **Emoji Indicators** - Each action has a unique emoji for quick visual identification
2. **Action Type Badge** - Clear distinction between User and Admin actions
3. **Structured Fields** - Information displayed in clean, organized fields
4. **Timestamps** - ISO timestamps on all messages
5. **Footer** - Shows system name and branding
6. **Author Header** - Distinguishes between 👤 User Actions and 🛡️ Admin Actions

## Usage

### Basic Usage
```javascript
const log = require('./misc/log');

// Simple log with just action and message
log('signup', 'JohnDoe#1234 created account');
```

### Enhanced Usage with Metadata
```javascript
const log = require('./misc/log');

// Log with additional metadata for structured fields
log('buy ram', 'JohnDoe#1234 bought 2048 MB RAM from the store for 500 coins.', {
    userId: '123456789012345678',
    amount: '500 coins',
    resourceType: '2048 MB RAM'
});

// Server creation with metadata
log('create server', 'JohnDoe#1234 created a new Minecraft server', {
    userId: '123456789012345678',
    serverName: 'My Awesome Server'
});

// Admin action with metadata
log('set coins', 'AdminUser#9999 set coins for user to 1000', {
    userId: '987654321098765432',
    amount: '1000 coins'
});
```

### Metadata Fields
The following metadata fields are supported:

- `userId` (string) - Discord user ID, displayed with 🆔 emoji
- `amount` (string) - Coin amounts or quantities, displayed with 💰 emoji
- `resourceType` (string) - Type of resource purchased, displayed with 📦 emoji
- `serverName` (string) - Server name, displayed with 🖥️ emoji

## Testing

Run the test script to see all enhancement features:

```bash
node test-webhook.js
```

This will send 5 different webhook messages showcasing:
1. User signup event
2. Server creation event
3. Resource purchase event
4. Admin action event
5. Coupon creation event

## Configuration

The webhook system uses the following settings in `settings.json`:

```json
{
  "logging": {
    "status": true,
    "webhookId": "YOUR_WEBHOOK_ID",
    "webhookToken": "YOUR_WEBHOOK_TOKEN",
    "actions": {
      "user": {
        "signup": true,
        "create server": true,
        // ... other user actions
      },
      "admin": {
        "set coins": true,
        "add coins": true,
        // ... other admin actions
      }
    }
  }
}
```

## Benefits

1. **Better Visual Clarity** - Color coding makes it easy to distinguish action types at a glance
2. **Improved Organization** - Structured fields present information cleanly
3. **Enhanced Context** - Metadata provides additional context without cluttering the message
4. **Professional Appearance** - Polished Discord embeds enhance your dashboard's professionalism
5. **Easy Troubleshooting** - Timestamps and structured data help with debugging and auditing

## Backwards Compatibility

The enhanced logging system is fully backwards compatible. Existing log calls will continue to work without any changes:

```javascript
// Old style - still works!
log('signup', 'User created account');

// New style - with enhancements!
log('signup', 'User created account', { userId: '123456789' });
```

## Error Handling

The system includes robust error handling:
- Validates webhook configuration before sending
- Logs errors to console with status codes
- Gracefully handles network failures
- Shows specific error messages for debugging

Check console logs for error messages if webhooks aren't appearing in Discord.
