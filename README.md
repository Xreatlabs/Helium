# Helium

![GitHub commit](https://img.shields.io/github/last-commit/xreatlabs/helium) ![GitHub Release](https://img.shields.io/github/v/release/xreatlabs/helium)

Helium is a modern, high-performance client dashboard for Pterodactyl Panel. Built with Express.js and featuring Discord OAuth2 authentication, it provides users with an intuitive interface to manage their game servers, earn rewards through AFK time, and access premium features.

## Features

- **Discord OAuth2 Authentication** - Secure login with Discord accounts
- **Server Management** - Create, edit, and delete Pterodactyl servers
- **Resource Management** - Manage CPU, RAM, disk, and server limits
- **AFK Rewards System** - Earn coins by accumulating AFK time
- **Resource Store** - Purchase additional resources with earned coins
- **AFK Leaderboard** - Compete with other users for top AFK time
- **Admin Dashboard** - Comprehensive admin tools for user and server management
- **Discord Webhooks** - Real-time event notifications to Discord channels
- **Server Renewal System** - Automatic server suspension with grace periods
- **Dark Mode** - Full dark mode support with user preferences
- **Linkvertise Integration** - Monetize with Linkvertise coin rewards
- **Multi-worker Clustering** - Improved performance with cluster mode

## Quick Start

### Prerequisites

- Node.js 16+ or Bun runtime
- Pterodactyl Panel with API access
- Discord OAuth2 application

### Installation

```bash
# Clone the repository
git clone https://github.com/xreatlabs/helium
cd helium

# Run initial setup (creates settings.json)
npm run setup

# Install dependencies
npm install

# Run database migrations
npm run migrate

# Configure your settings
nano settings.json

# Start the application
npm start
```

### Configuration

Edit `settings.json` with your Pterodactyl and Discord credentials:

```json
{
  "pterodactyl": {
    "domain": "https://panel.example.com",
    "key": "your_pterodactyl_api_key"
  },
  "discord": {
    "id": "your_discord_client_id",
    "secret": "your_discord_client_secret",
    "callbackpath": "http://localhost:3000/callback",
    "prompt": false
  },
  "website": {
    "port": 3000,
    "secret": "random_secret_string"
  }
}
```

### First Run

After configuration:

1. Start the application with `npm start`
2. Access the dashboard at `http://localhost:3000`
3. Log in with Discord OAuth2
4. Configure admin users via the admin panel

## Updating Helium

Your `settings.json` and `database.sqlite` are preserved during updates:

```bash
# Pull latest changes
git pull origin master

# Check for new configuration options
diff settings.json settings.example.json

# Install dependencies and run migrations
npm install
npm run migrate

# Restart the application
npm start
```

See [UPGRADE_GUIDE.md](UPGRADE_GUIDE.md) for detailed version-specific instructions.

## NGINX Reverse Proxy

Recommended NGINX configuration with SSL:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_session_cache shared:SSL:10m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # WebSocket support
    location /ws {
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_pass http://localhost:3000/ws;
    }

    # Main application
    location / {
        proxy_pass http://localhost:3000/;
        proxy_buffering off;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
    }
}
```

## Core Systems

### AFK Rewards System

Users earn coins by keeping the AFK page open. Configure in `settings.json`:

```json
{
  "api": {
    "afk": {
      "enabled": true,
      "every": 60,
      "coins": 1
    }
  }
}
```

- `every`: Seconds between coin awards
- `coins`: Amount of coins per interval

### Resource Store

Users can purchase server resources with earned coins:

- Additional RAM
- Extra disk space
- More CPU allocation
- Additional server slots

Configure pricing in `settings.json` under `api.client.coins.store`.

### Server Renewal System

Automatically manages server lifecycles with renewal reminders:

```json
{
  "api": {
    "client": {
      "allow": {
        "renewsuspendsystem": {
          "enabled": true,
          "renewTime": 2592000000,
          "graceperiod": 3
        }
      }
    }
  }
}
```

- Sends renewal notifications before expiration
- Grace period before suspension
- Automatic server suspension after grace period
- Users can renew through the dashboard

### Discord Webhook System

Real-time notifications for server events. Configure webhooks through the admin panel at `/webhooks`.

**Supported Events:**
- Server creation, modification, deletion
- User registration and login
- Coin transactions
- Resource purchases
- Admin actions

**API Endpoints:**
- `GET /api/webhooks` - List all webhooks
- `POST /api/webhooks` - Create new webhook
- `PUT /api/webhooks/:id` - Update webhook
- `DELETE /api/webhooks/:id` - Delete webhook
- `POST /api/webhooks/:id/test` - Test webhook

### Linkvertise Integration

Monetize your dashboard with Linkvertise coin rewards. See [linkvertise-docs.md](linkvertise-docs.md) for setup instructions.

## API Reference

### Helium API v2

All API endpoints require authentication.

#### Get User Information

```
GET /api/v2/userinfo?id={userId}

Response:
{
  "status": "success",
  "package": {...},
  "extra": {...},
  "userinfo": {...},
  "coins": number | null
}
```

#### Set User Coins

```
POST /api/v2/setcoins
Body: { "id": "userId", "coins": 100 }

Response: { "status": "success" }
```

#### Set User Plan

```
POST /api/v2/setplan
Body: { "id": "userId", "package": "premium" }

Response: { "status": "success" }
```

#### Set User Resources

```
POST /api/v2/setresources
Body: {
  "id": "userId",
  "ram": 2048,
  "disk": 10240,
  "cpu": 200,
  "servers": 5
}

Response: { "status": "success" }
```

### Leaderboard API

#### Get AFK Leaderboard

```
GET /api/leaderboard/afk

Response:
{
  "success": true,
  "leaderboard": [
    {
      "userId": "123",
      "username": "User",
      "global_name": "Display Name",
      "avatar": "hash",
      "afkTime": 1234.56,
      "afkHours": 20.58,
      "rank": 1
    }
  ],
  "total": 50
}
```

## Development

### Available Scripts

```bash
npm start           # Start with nodemon
npm run start:bun   # Start with Bun runtime
npm run dev         # Start with Bun hot reload
npm run build       # Build Tailwind CSS
npm run build:watch # Build Tailwind CSS in watch mode
npm test            # Run test suite
npm run migrate     # Run database migrations
npm run setup       # Initial setup wizard
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test __tests__/PteroClient.test.js
```

### Database Migrations

Migrations are located in the `migrations/` directory and run automatically with `npm run migrate`.

Current migrations:
- Initial database schema
- Discord webhooks table
- AFK time tracking
- Server renewal system

### Project Structure

```
helium/
├── api/              # API route handlers
├── assets/           # Static assets (CSS, images)
├── lib/              # Core libraries and utilities
├── managers/         # Business logic managers
├── middleware/       # Express middleware
├── migrations/       # Database migrations
├── scripts/          # Utility scripts
├── views/            # EJS templates
│   ├── admin/        # Admin panel views
│   ├── coins/        # Coin-related views
│   ├── components/   # Reusable components
│   ├── general/      # General pages
│   └── servers/      # Server management views
├── __tests__/        # Test files
├── app.js            # Main application file
├── server.js         # Bun runtime entry point
└── settings.json     # Configuration file
```

## Pterodactyl API Client

Helium includes an enhanced Pterodactyl API client with:

- Automatic retry with exponential backoff
- Rate limit handling with `Retry-After` support
- Response caching (configurable TTL)
- Built-in health checks
- Full API coverage

```javascript
const PteroClient = require('./lib/PteroClient');

const client = new PteroClient(
  'https://panel.example.com',
  'api-key',
  {
    maxRetries: 3,
    retryDelay: 1000,
    cacheTTL: 60
  }
);

// Check panel health
const health = await client.healthCheck();

// Get server with caching
const server = await client.getServer(123);

// Update server resources
await client.updateServerBuild(123, {
  limits: {
    memory: 2048,
    disk: 10240,
    cpu: 200
  }
});
```

## Security

### Best Practices

- Change the default `website.secret` in `settings.json`
- Use strong Pterodactyl API keys with minimal required permissions
- Configure Discord OAuth2 with proper redirect URIs
- Run behind NGINX with SSL/TLS
- Regularly update dependencies
- Enable rate limiting for production deployments
- Review webhook events before enabling

### Admin Access

Admins are determined by:
1. Pterodactyl panel `root_admin` status (priority)
2. Database `admin-{userId}` flag (fallback)

Grant admin access through the admin panel at `/admin`.

## Performance

### Cluster Mode

Helium runs with 8 worker processes by default for improved performance. Adjust in `app.js`:

```javascript
const numCPUs = 8; // Change as needed
```

### Caching

- Pterodactyl API responses cached for 60 seconds (configurable)
- Session data stored in SQLite with better-sqlite3
- Static assets should be cached by NGINX

### Rate Limiting

Configure per-endpoint rate limits in `settings.json`:

```json
{
  "api": {
    "client": {
      "ratelimits": {
        "/api/some-endpoint": 5
      }
    }
  }
}
```

## Troubleshooting

### Common Issues

**"Database error" on startup**
- Ensure `database.sqlite` has correct permissions
- Run `npm run migrate` to apply migrations

**"Failed to authenticate" errors**
- Verify Pterodactyl API key has correct permissions
- Check panel URL is accessible from Helium server

**OAuth2 redirect issues**
- Verify Discord OAuth2 callback URL matches `settings.json`
- Check redirect URI in Discord Developer Portal

**Session lost after restart**
- Sessions are persistent in SQLite
- Check `database.sqlite` permissions

### Debug Mode

Enable detailed logging:

```bash
NODE_ENV=development npm start
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## License

See [LICENSE](LICENSE) file for details.

## Credits

- Built on the foundation of Heliactyl
- Maintained by Matt James and contributors
- Powered by Pterodactyl Panel

## Support

- GitHub Issues: Report bugs and request features
- Documentation: Check the `/docs` directory for guides
- Discord: Join our community server (if available)

---

**Helium 1.0.0 - Cascade Ridge**

Built with ❤️ for the Pterodactyl community
