# Helium

![GitHub commit](https://img.shields.io/github/last-commit/xreatlabs/helium) ![GitHub Release](https://img.shields.io/github/v/release/xreatlabs/helium)

Helium is a modern, high-performance client dashboard for Pterodactyl Panel. Built with Express.js and featuring Discord OAuth2 authentication, it provides users with an intuitive interface to manage their game servers, earn rewards through AFK time, and access premium features.

## ✨ Features

### 🔐 Authentication & User Management
- **Discord OAuth2 Authentication** - Secure login with Discord accounts
- **Admin Dashboard** - Comprehensive admin tools for user and server management
- **Dark Mode** - Full dark mode support with user preferences and system detection
- **Account Switcher** - Switch between multiple linked accounts seamlessly

### 🎮 Server Management
- **Server Management** - Create, edit, and delete Pterodactyl servers
- **Resource Management** - Manage CPU, RAM, disk, and server limits
- **Server Renewal System** - Automatic server suspension with renewal reminders and grace periods
- **Auto-Renewal** - Set servers to automatically renew with available coins

### 💰 Economy System
- **AFK Rewards System** - Earn coins by accumulating AFK time with WebSocket connection
- **Resource Store** - Purchase additional resources with earned coins
- **Coin Transfer System** - Transfer coins between users with configurable tax rates
- **AFK Leaderboard** - Compete with other users for top AFK time
- **Linkvertise Integration** - Monetize with Linkvertise coin rewards
- **Redemption Codes** - Create and manage promo codes for resources and coins

### 🎁 Discord Role Rewards (NEW!)
- **Automatic Role Rewards** - Grant resources and coins when users receive Discord roles
- **Server Boost Rewards** - Perfect for rewarding server boosters automatically
- **Multiple Role Support** - Stack multiple role rewards for VIP tiers
- **Admin Configuration UI** - Easy role management at `/discord-roles`
- **Bot Integration** - Complete Discord bot examples included

### 🛠️ Advanced Systems
- **Database Backup System** - Automatic daily backups with manual backup support
- **Health Monitoring** - Real-time system health checks (panel, database, disk, memory)
- **Maintenance Mode** - Beautiful maintenance page with admin bypass
- **Discord Webhooks** - Real-time event notifications to Discord channels
- **API System** - RESTful API with key-based authentication and rate limiting

### 🎨 User Experience
- **Responsive Design** - Mobile-friendly interface with Tailwind CSS
- **Social Media Links** - Configurable social links with 13+ service icons
- **Announcement System** - Display important announcements with multiple styles
- **Settings Categorization** - Organized admin settings with sidebar navigation
- **Real-time Updates** - Live server status and resource updates

### 🚀 Performance & Reliability
- **Multi-worker Clustering** - Improved performance with 8 worker processes
- **Enhanced Pterodactyl Client** - Automatic retry, rate limiting, and caching
- **Better-SQLite3** - Fast, reliable database with session persistence
- **WebSocket Support** - Real-time communication for AFK rewards

## Quick Start

### Prerequisites

- Node.js 16+ or Bun runtime
- Pterodactyl Panel with API access
- Discord OAuth2 application

### Installation

#### Automatic Installation (Recommended)

```bash
# Clone the repository
git clone https://github.com/xreatlabs/helium
cd helium

# Run the installation script
chmod +x install
./install
```

The installation script will:
- Check system requirements
- Install dependencies
- Copy example settings
- Run database migrations
- Create necessary directories
- Prompt for basic configuration

#### Manual Installation

```bash
# Clone the repository
git clone https://github.com/xreatlabs/helium
cd helium

# Install dependencies
npm install

# Copy example settings
cp settings.example.json settings.json

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

## 📚 Core Systems

### Discord Role Rewards System

Automatically grant resources and coins when users receive Discord roles. Perfect for server boost rewards!

**Setup:**
1. Configure roles at `/discord-roles` in admin panel
2. Add role ID, name, and rewards (coins, RAM, disk, CPU, servers)
3. Set up Discord bot to sync roles using provided examples
4. Users automatically receive rewards when they get roles

**Bot Integration:**
```javascript
// When user gets a role
await api.post('/api/dashboard/roles/sync', {
  discordId: userId,
  roles: [roleId1, roleId2],
  action: 'add'
});
```

See [DISCORD_ROLE_SETUP.md](DISCORD_ROLE_SETUP.md) for complete setup guide and bot examples.

### Backup System

Automatic and manual database backups with verification.

**Features:**
- Automatic daily backups at configurable time
- Manual backup creation
- Backup restoration with safety backup
- Download backups
- Automatic cleanup (keeps last N backups)
- Includes database and settings.json

**Configuration:**
```json
{
  "backup": {
    "enabled": true,
    "automatic": true,
    "schedule": "daily",
    "time": "03:00",
    "maxBackups": 10,
    "path": "./backups"
  }
}
```

Access backup management at `/settings` → Backups tab.

### Health Monitoring System

Real-time system health monitoring with thresholds and alerts.

**Monitors:**
- ✅ Pterodactyl Panel connectivity
- ✅ Database connectivity
- ✅ Disk space usage
- ✅ Memory usage

**Features:**
- Configurable warning and critical thresholds
- Optional Discord webhook alerts
- Real-time status dashboard
- Auto-refresh every 60 seconds

**Configuration:**
```json
{
  "healthMonitoring": {
    "enabled": true,
    "checkInterval": 60,
    "thresholds": {
      "diskSpaceWarning": 80,
      "diskSpaceCritical": 90,
      "memoryWarning": 80,
      "memoryCritical": 90
    },
    "alerts": {
      "webhook": true,
      "webhookUrl": "discord_webhook_url"
    }
  }
}
```

Access health dashboard at `/settings` → Health Monitoring.

### Maintenance Mode

Display a beautiful maintenance page while performing updates.

**Features:**
- Animated maintenance page with auto-refresh
- Admin bypass (admins can still access dashboard)
- Configurable title and message
- API endpoints excluded from maintenance check
- Easy toggle in admin settings

**Enable:**
```json
{
  "maintenance": {
    "enabled": true,
    "message": "We're performing scheduled maintenance.",
    "title": "Maintenance Mode"
  }
}
```

Or toggle at `/settings` → General Settings → Maintenance Mode.

## 💻 Core Systems

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

**Configuration:**
```json
{
  "coins": {
    "enabled": true,
    "transfer": {
      "enabled": true,
      "tax": {
        "enabled": true,
        "percentage": 5
      }
    },
    "store": {
      "enabled": true,
      "ram": { "cost": 500, "per": 1024 },
      "disk": { "cost": 250, "per": 5120 },
      "cpu": { "cost": 500, "per": 100 },
      "servers": { "cost": 100, "per": 2 }
    }
  }
}
```

**Tax System:**
- Configurable tax on coin transfers between users
- Tax percentage (0-100%)
- Helps manage economy inflation

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
./install           # Run installation script
```

### Environment Setup

Helium supports both Node.js and Bun runtimes:

**With Node.js:**
```bash
node --version  # v16+ required
npm install
npm start
```

**With Bun (Faster):**
```bash
bun --version  # v1.0+ recommended
bun install
bun run start:bun
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
│   ├── admin.js      # Admin API endpoints
│   ├── backup.js     # Backup management API
│   ├── dashboard-api.js  # Dashboard/Bot API
│   └── servers.js    # Server management API
├── assets/           # Static assets (CSS, images, JS)
├── bot-examples/     # Discord bot integration examples
├── lib/              # Core libraries and utilities
│   ├── PteroClient.js    # Enhanced Pterodactyl client
│   └── healthCheck.js    # System health monitoring
├── managers/         # Business logic managers
│   └── BackupManager.js  # Backup system manager
├── middleware/       # Express middleware
├── migrations/       # Database migrations
│   ├── 001_initial.sql
│   ├── 002_webhooks.sql
│   └── 003_discord_roles.sql
├── scripts/          # Utility scripts
├── views/            # EJS templates
│   ├── admin/        # Admin panel views
│   │   ├── discord-roles.ejs
│   │   └── settings-full.ejs
│   ├── coins/        # Coin-related views
│   ├── components/   # Reusable components
│   ├── errors/       # Error pages (maintenance, 404, 500)
│   ├── general/      # General pages
│   └── servers/      # Server management views
├── __tests__/        # Test files
├── app.js            # Main application file
├── server.js         # Bun runtime entry point
├── install           # Installation script
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

## 🔧 Troubleshooting

### Common Issues

**"Database error" on startup**
- Ensure `database.sqlite` has correct permissions: `chmod 644 database.sqlite`
- Run `npm run migrate` to apply pending migrations
- Check disk space availability

**"Failed to authenticate" errors**
- Verify Pterodactyl API key has correct permissions (Application API Key)
- Check panel URL is accessible from Helium server
- Ensure API key hasn't expired

**OAuth2 redirect issues**
- Verify Discord OAuth2 callback URL matches `settings.json`
- Check redirect URI in Discord Developer Portal matches exactly
- Ensure callback URL is publicly accessible

**Session lost after restart**
- Sessions are persistent in SQLite
- Check `database.sqlite` permissions
- Verify `website.secret` hasn't changed

**Discord role rewards not working**
- Configure role IDs at `/discord-roles`
- Set up Discord bot with provided examples (see `bot-examples/`)
- Verify API key is configured in bot
- Check bot has `GuildMembers` intent enabled in Discord Developer Portal

**Backup system not working**
- Enable backup system in settings: `backup.enabled: true`
- Check `backups/` directory permissions
- Verify sufficient disk space
- Enable automatic backups: `backup.automatic: true`

**Health monitoring issues**
- Verify health monitoring is enabled in settings
- Check Pterodactyl panel is accessible
- Ensure database connection is working
- Review thresholds in configuration

**Maintenance mode stuck**
- Disable in settings: `maintenance.enabled: false`
- Or edit `settings.json` manually
- Restart the application

### Debug Mode

Enable detailed logging:

```bash
NODE_ENV=development npm start
```

Check application logs:
```bash
# If using systemd
journalctl -u helium -f

# If using PM2
pm2 logs helium

# If running directly
# Check console output
```

### Database Issues

**Reset database (WARNING: Deletes all data):**
```bash
rm database.sqlite
npm run migrate
```

**Backup database before reset:**
```bash
cp database.sqlite database.backup.sqlite
```

**Check database integrity:**
```bash
npm run migrate
# Will show any migration errors
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

## 📖 Documentation

- **[BOTAPI.md](BOTAPI.md)** - Complete API documentation for bot integration
- **[DISCORD_ROLE_SETUP.md](DISCORD_ROLE_SETUP.md)** - Discord role rewards setup guide
- **[UPGRADE_GUIDE.md](UPGRADE_GUIDE.md)** - Version upgrade instructions
- **[linkvertise-docs.md](linkvertise-docs.md)** - Linkvertise integration guide
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and changes

## 🤝 Support

- **GitHub Issues:** Report bugs and request features
- **Documentation:** Check the documentation files for detailed guides
- **Community:** Join discussions in GitHub Discussions
- **Updates:** Watch the repository for new releases

## 🎯 Roadmap

- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Plugin system for extensions
- [ ] Mobile app (React Native)
- [ ] Advanced ticket system
- [ ] Payment gateway integration
- [ ] Server statistics and graphs
- [ ] Advanced user permissions

## 📊 Requirements

- **Node.js:** v16.0.0 or higher (v20+ recommended)
- **OR Bun:** v1.0.0 or higher (faster alternative)
- **Pterodactyl Panel:** v1.0+
- **Discord Application:** For OAuth2 authentication
- **Operating System:** Linux (Ubuntu 20.04+, Debian 11+, CentOS 8+)
- **Database:** SQLite (included)
- **Memory:** 512 MB minimum, 1 GB recommended
- **Disk:** 1 GB minimum free space

## 🔄 Version

**Helium 1.0.0 - Cascade Ridge**

### Recent Updates (v1.0.0)
- ✅ Discord role-based automatic rewards system
- ✅ Database backup system with automatic scheduling
- ✅ Health monitoring with real-time status
- ✅ Maintenance mode with beautiful UI
- ✅ Coin transfer tax system
- ✅ Enhanced admin settings with categorization
- ✅ Fixed checkbox persistence in settings
- ✅ Improved error handling and logging

---

Built with ❤️ for the Pterodactyl community by [Matt James](https://github.com/xreatlabs)
