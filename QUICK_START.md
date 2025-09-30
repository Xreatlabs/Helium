# Quick Start Guide - Discord Webhooks & Enhancements

## 5-Minute Setup

### 1. Install & Migrate (2 minutes)
```bash
npm install
npm run migrate
```

### 2. Create Discord Webhook (1 minute)
1. Open Discord → Your Server → Server Settings → Integrations → Webhooks
2. Click "New Webhook"
3. Name it and copy the webhook URL
4. Click "Save Changes"

### 3. Configure in Helium (2 minutes)
1. Start Helium: `npm start`
2. Login as admin
3. Navigate to `/webhooks`
4. Click "Create Webhook"
5. Fill in:
   - Name: "Server Notifications"
   - Webhook URL: (paste from Discord)
   - Event Types: Select events you want
   - Enabled: ✓
6. Click "Create"
7. Click "Test" to verify

Done! You'll now receive Discord notifications for selected events.

## Common Tasks

### View All Webhooks
```bash
# Via UI
Navigate to /webhooks

# Via API
curl http://localhost:3000/api/webhooks -H "Cookie: your-session"
```

### Create Webhook Programmatically
```bash
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session" \
  -d '{
    "name": "Alerts",
    "webhook_url": "https://discord.com/api/webhooks/xxx/yyy",
    "event_types": ["server.created", "server.deleted"],
    "enabled": true
  }'
```

### Disable a Webhook
```bash
curl -X PUT http://localhost:3000/api/webhooks/1 \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session" \
  -d '{"enabled": false}'
```

### Test a Webhook
```bash
# Via UI
Click "Test" button on webhook row

# Via API
curl -X POST http://localhost:3000/api/webhooks/1/test \
  -H "Cookie: your-session"
```

## Event Examples

### Server Created
Automatically triggered when user creates server via `/create`

### Server Deleted
Automatically triggered when user deletes server via `/delete`

### Server Modified
Automatically triggered when user modifies server via `/modify`

### Custom Event (Manual)
```javascript
const { triggerEvent } = require('./lib/integrations');

await triggerEvent('coins.added', {
  userId: '123456',
  username: 'User#1234',
  coins: 100,
});
```

## PteroClient Quick Use

```javascript
const PteroClient = require('./lib/PteroClient');
const settings = require('./settings.json');

const client = new PteroClient(
  settings.pterodactyl.domain,
  settings.pterodactyl.key
);

// Check connection
const health = await client.healthCheck();
console.log(health.status); // 'healthy'

// Get server
const server = await client.getServer(123);

// List servers
const servers = await client.listServers();

// Update server
await client.updateServerBuild(123, {
  limits: { memory: 2048, disk: 10240, cpu: 200 }
});
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test
npm test discordWebhook
```

## Troubleshooting

### "Webhook not sending"
- ✓ Check webhook is enabled (toggle in UI)
- ✓ Verify Discord URL is correct
- ✓ Click "Test" to check connectivity

### "Database error"
- ✓ Run migration: `npm run migrate`
- ✓ Check database.sqlite exists
- ✓ Verify file permissions

### "Can't access /webhooks"
- ✓ Login as admin (root_admin = true)
- ✓ Check `/admin` works first
- ✓ Verify pages.json includes webhooks route

## Event Types Reference

| Event | When | Auto-Triggered |
|-------|------|----------------|
| `server.created` | Server created | ✓ |
| `server.deleted` | Server deleted | ✓ |
| `server.modified` | Server modified | ✓ |
| `server.suspended` | Server suspended | Manual |
| `user.registered` | User signs up | Manual |
| `coins.added` | Coins added | Manual |
| `coins.spent` | Coins spent | Manual |
| `resource.purchased` | Resource bought | Manual |
| `admin.action` | Admin action | Manual |

## File Locations

| What | Where |
|------|-------|
| Webhook UI | `/webhooks` |
| API Routes | `api/webhooks.js` |
| Event System | `lib/eventSystem.js` |
| PteroClient | `lib/PteroClient.js` |
| Migration | `migrations/001_discord_webhooks.sql` |
| Tests | `__tests__/` |

## Tips

1. **Use `*` event type** for all events in one webhook
2. **Create separate webhooks** for different Discord channels
3. **Test webhooks** before relying on them
4. **Check console logs** if webhooks fail
5. **Use PteroClient cache** to reduce API calls

## Need Help?

- Read `IMPLEMENTATION_SUMMARY.md` for details
- Check `CHANGELOG.md` for features
- Review `README.md` for full docs
- Look at test files for examples

---

**Ready to go!** Your webhook system is now active. 🚀
