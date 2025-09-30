# Helium

![GitHub commit](https://img.shields.io/github/last-commit/heliactyloss/heliactyl) ![GitHub Release](https://img.shields.io/github/v/release/heliactyloss/heliactyl)

> [!NOTE]
> This version of Helium 1 is built to be clean, fast and stable. It lacks highly specific features such as Linkvertise and Stripe billing but retains all of the functionality of previous Helium releases (v11, v12, v13).

> [!WARNING]  
> Helium 1 is not compatible with `settings.json` files from v13 or earlier. You can keep the same `database.sqlite` though without having any issues.

Helium is a high-performance client area for the Pterodactyl Panel. It allows your users to create, edit and delete servers, and also earn coins which can be used to upgrade their servers.

## Get started

You can get started straight away by following these steps:

1. Clone the repo: Run `git clone https://github.com/heliactyloss/heliactyl` on your machine
2. Run setup: `npm run setup` (creates `settings.json` from template)
3. Configure `settings.json` - most are optional except the Pterodactyl and OAuth2 settings which **must** be configured
4. Install dependencies: `npm install`
5. Run database migration: `npm run migrate`
6. Start the application: `npm start`
7. Create SSL certificates for your target domain and set up the NGINX reverse proxy

### First Time Setup

```bash
# Clone repository
git clone https://github.com/heliactyloss/heliactyl
cd heliactyl

# Initial setup (creates settings.json and .env)
npm run setup

# Edit your configuration
# Edit settings.json with your Pterodactyl & Discord credentials

# Install and migrate
npm install
npm run migrate

# Start
npm start
```

### Updating Helium

Your `settings.json` and `database.sqlite` are protected and won't be overwritten:

```bash
# Pull updates
git pull origin master

# Check for new config options
diff settings.json settings.example.json

# Install new dependencies
npm install

# Run new migrations (if any)
npm run migrate

# Restart
npm start
```

**See [UPGRADE_GUIDE.md](UPGRADE_GUIDE.md) for detailed update instructions.**

## NGINX Reverse Proxy

Here's a proxy config that we recommend, however you are free to change it:

```nginx
server {
    listen 80;
    server_name <domain>;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;

    location /ws {
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_pass "http://localhost:<port>/ws";
    }

    server_name <domain>;

    ssl_certificate /etc/letsencrypt/live/<domain>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<domain>/privkey.pem;
    ssl_session_cache shared:SSL:10m;
    ssl_protocols SSLv3 TLSv1 TLSv1.1 TLSv1.2;
    ssl_ciphers  HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
      proxy_pass http://localhost:<port>/;
      proxy_buffering off;
      proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Development Tools

These commands are available:
```
npm run start - starts Helium via nodemon
npm run build - builds TailwindCSS, required for making changes to the UI
```

## Helium API v2

In v1, we've introduced the next generation of Helium's API. You can see the documentation below:

### /api/v2/userinfo

```
Method: GET
Query Parameters:
  - id (string): The user's ID

Response:
  - status (string): "success" or an error message
  - package (object): The user's package details
  - extra (object): The user's additional resources
  - userinfo (object): The user's information from the Pterodactyl panel
  - coins (number | null): The user's coin balance (if coins is enabled)
```

### /api/v2/setcoins

```
Method: POST
Request Body:
  - id (string): The user's ID
  - coins (number): The number of coins to set

Response:
  - status (string): "success" or an error message
```

### /api/v2/setplan

```
Method: POST
Request Body:
  - id (string): The user's ID
  - package (string, optional): The package name (if not provided, the user's package will be removed)

Response:
  - status (string): "success" or an error message
```

### /api/v2/setresources

```
Method: POST
Request Body:
  - id (string): The user's ID
  - ram (number): The amount of RAM to set
  - disk (number): The amount of disk space to set
  - cpu (number): The amount of CPU to set
  - servers (number): The number of servers to set

Response:
  - status (string): "success" or an error message
```

## Discord Webhook System

Helium now includes a comprehensive Discord webhook system for real-time notifications of events.

### Features

- **Event Notifications**: Get notified about server creation, deletion, modifications, user registrations, coin transactions, and more
- **Multiple Webhooks**: Configure multiple webhooks for different events
- **Smart Retry Logic**: Automatic retry with exponential backoff for failed deliveries
- **Rate Limit Handling**: Intelligent handling of Discord's rate limits
- **Beautiful Embeds**: Rich, color-coded Discord embeds for each event type
- **Admin UI**: Easy-to-use admin interface for managing webhooks

### Setup

1. **Run Database Migration**:
```bash
npm install
npm run migrate
```

2. **Access Admin Panel**:
Navigate to `/webhooks` (requires admin privileges)

3. **Create a Webhook**:
- Go to your Discord server → Server Settings → Integrations → Webhooks
- Create a new webhook and copy the URL
- In Helium admin panel, click "Create Webhook"
- Enter a name, paste the webhook URL, and select event types
- Click "Create"

### Webhook API Endpoints

#### List Webhooks
```bash
curl -X GET http://localhost:3000/api/webhooks \
  -H "Cookie: your-session-cookie"
```

#### Create Webhook
```bash
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "name": "Server Events",
    "webhook_url": "https://discord.com/api/webhooks/...",
    "event_types": ["server.created", "server.deleted", "server.modified"],
    "enabled": true
  }'
```

#### Update Webhook
```bash
curl -X PUT http://localhost:3000/api/webhooks/1 \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "enabled": false
  }'
```

#### Delete Webhook
```bash
curl -X DELETE http://localhost:3000/api/webhooks/1 \
  -H "Cookie: your-session-cookie"
```

#### Test Webhook
```bash
curl -X POST http://localhost:3000/api/webhooks/1/test \
  -H "Cookie: your-session-cookie"
```

#### Receive Pterodactyl Events
Configure your Pterodactyl panel to send webhooks to:
```
POST http://your-helium-domain.com/api/ptero/webhook
```

### Supported Event Types

- `*` - All events
- `server.created` - Server is created
- `server.deleted` - Server is deleted
- `server.modified` - Server resources are modified
- `server.suspended` - Server is suspended
- `server.unsuspended` - Server is unsuspended
- `user.registered` - New user registers
- `user.login` - User logs in
- `coins.added` - Coins added to account
- `coins.spent` - Coins spent from account
- `resource.purchased` - Resources purchased from store
- `admin.action` - Admin performs action

### Programmatic Event Triggering

You can trigger webhook events from your code:

```javascript
const { triggerEvent } = require('./lib/integrations');

// Trigger server created event
await triggerEvent('server.created', {
  serverId: 123,
  serverName: 'My Server',
  userId: '123456789',
  username: 'User#1234',
  ram: 2048,
  disk: 10240,
  cpu: 200,
});

// Trigger custom admin action
await triggerEvent('admin.action', {
  admin: 'Admin#0001',
  userId: '987654321',
  description: 'Reset user password',
  fields: [
    { name: 'Action', value: 'Password Reset', inline: true },
    { name: 'Target', value: 'User#1234', inline: true },
  ],
});
```

## Pterodactyl API Client

Helium includes an enhanced Pterodactyl API client with advanced features.

### Features

- **Automatic Retry**: Exponential backoff for failed requests
- **Rate Limiting**: Smart handling of rate limits with `Retry-After` header
- **Caching**: Short-lived cache to reduce API calls (configurable TTL)
- **Health Check**: Built-in health monitoring
- **Full Coverage**: Methods for servers, users, and more

### Usage

```javascript
const PteroClient = require('./lib/PteroClient');

// Initialize client
const client = new PteroClient(
  'https://panel.example.com',
  'your-api-key',
  {
    maxRetries: 3,
    retryDelay: 1000,
    cacheTTL: 60, // seconds
  }
);

// Health check
const health = await client.healthCheck();
console.log(health.status); // 'healthy' or 'unhealthy'

// Get server (with caching)
const server = await client.getServer(123);

// Get server (skip cache)
const freshServer = await client.getServer(123, true);

// List servers
const servers = await client.listServers({ per_page: 50 });

// Get user
const user = await client.getUser(456);

// Update server resources
await client.updateServerBuild(123, {
  limits: {
    memory: 2048,
    disk: 10240,
    cpu: 200,
  },
});

// Suspend/unsuspend server
await client.suspendServer(123);
await client.unsuspendServer(123);

// Clear cache
client.clearCache();

// Get rate limit info
const rateLimitInfo = client.getRateLimitInfo();
console.log(rateLimitInfo.remaining, rateLimitInfo.reset);
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Pterodactyl Panel
PTERODACTYL_DOMAIN=https://panel.example.com
PTERODACTYL_API_KEY=your_api_key

# Discord OAuth2
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_CALLBACK_URL=http://localhost:3000/callback

# Website
WEBSITE_PORT=3000
WEBSITE_SECRET=random_secret_string
NODE_ENV=production

# Database
DATABASE_PATH=sqlite://database.sqlite

# Optional: Caching & Rate Limiting
CACHE_TTL=60
MAX_RETRIES=3
RETRY_DELAY=1000
```

## Testing

Run the test suite:

```bash
npm test
```

Run tests with coverage:

```bash
npm test -- --coverage
```

### Test Files

- `__tests__/discordWebhook.test.js` - Discord webhook functionality
- `__tests__/PteroClient.test.js` - Pterodactyl API client

## Database Migration

The webhook system requires a database migration:

```bash
npm run migrate
```

This creates the `discord_webhooks` table with the following schema:

```sql
CREATE TABLE discord_webhooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  server_id TEXT,
  event_types TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```