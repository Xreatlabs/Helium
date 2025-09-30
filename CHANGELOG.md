# Changelog

## [1.1.0] - 2025-09-30

### Added - Discord Webhook System
- **Database Schema**: New `discord_webhooks` table to store webhook configurations
  - Support for multiple webhooks per event type
  - Enable/disable webhooks individually
  - Server-specific webhook filtering
- **CRUD API Endpoints**: Full REST API for webhook management at `/api/webhooks`
  - `GET /api/webhooks` - List all webhooks
  - `GET /api/webhooks/:id` - Get single webhook
  - `POST /api/webhooks` - Create new webhook
  - `PUT /api/webhooks/:id` - Update webhook
  - `DELETE /api/webhooks/:id` - Delete webhook
  - `POST /api/webhooks/:id/test` - Send test notification
  - `POST /api/ptero/webhook` - Receive Pterodactyl panel events
- **Event System**: Comprehensive event triggering system with support for:
  - Server events (created, deleted, modified, suspended, unsuspended)
  - User events (registered, login)
  - Coin events (added, spent)
  - Resource events (purchased)
  - Admin actions
- **Discord Utilities**: 
  - Smart webhook sender with retry logic and 429 rate limit handling
  - Exponential backoff for failed requests
  - Beautiful Discord embeds with color coding per event type

### Added - Pterodactyl API Enhancements
- **PteroClient Class**: Professional API client with:
  - Automatic retry with exponential backoff
  - Rate limit detection and handling via `Retry-After` header
  - Smart caching with configurable TTL (default 60s)
  - Health check endpoint
  - Methods: `getServer()`, `listServers()`, `getUser()`, `listUsers()`, `updateServerBuild()`, `suspendServer()`, `unsuspendServer()`
  - Rate limit tracking and reporting
  - Cache management utilities

### Added - Admin UI Improvements
- **Webhook Management Page** (`/webhooks`):
  - Modern Vue 3 + Tailwind UI
  - List all webhooks with status indicators
  - Create/Edit modal with form validation
  - Enable/disable webhooks with toggle switches
  - Test webhook functionality
  - Event type multi-select with all available events
  - Responsive grid layout with soft shadows and rounded corners
- **Dark Mode Toggle**:
  - Persistent dark/light theme using localStorage
  - Tailwind's `darkMode: 'class'` configuration
  - Smooth transitions between themes
  - Available on webhook management page
- **Design Enhancements**:
  - Clean, modern styling with Tailwind CSS
  - Responsive design for all screen sizes
  - Toast notifications for user feedback
  - Loading states and error handling

### Added - General Optimizations
- **Security Improvements**:
  - Environment variable support via `.env.example`
  - Webhook URL validation (must be Discord webhook URL)
  - Event type validation
  - Admin-only access to webhook management
- **Code Quality**:
  - Comprehensive JSDoc documentation
  - Error handling throughout
  - Logging for debugging
- **Testing**:
  - Jest test suite for `sendDiscordWebhook`
  - Jest tests for `PteroClient.healthCheck()` and other methods
  - Test configuration with coverage reporting
- **Database**:
  - Migration script for easy setup (`npm run migrate`)
  - SQLite3 integration
- **Dependencies**:
  - Added `sqlite3` for direct database access
  - Added `vue` for admin UI components
  - Added `jest` for testing

### Changed
- **Server Events**: Integrated webhook triggers into:
  - Server creation (`/create`)
  - Server deletion (`/delete`)
  - Server modification (`/modify`)
- **Configuration**:
  - Updated `tailwind.config.js` with dark mode support
  - Updated `package.json` with new scripts and dependencies
  - Added `pages.json` route for `/webhooks`

### Documentation
- **README Updates**:
  - Added Discord Webhook System section
  - Added Pterodactyl API Client documentation
  - Environment variables documentation
  - Database migration instructions
  - API endpoint examples with curl
  - Testing instructions
- **Code Examples**:
  - Curl examples for all webhook API endpoints
  - Integration examples for event triggers
  - Configuration examples

### Technical Details
- **Event Types Supported**:
  - `*` (all events)
  - `server.created`
  - `server.deleted`
  - `server.modified`
  - `server.suspended`
  - `server.unsuspended`
  - `user.registered`
  - `user.login`
  - `coins.added`
  - `coins.spent`
  - `resource.purchased`
  - `admin.action`

### Migration Guide
1. Install new dependencies: `npm install`
2. Run database migration: `npm run migrate`
3. Configure Discord webhooks in admin panel at `/webhooks`
4. (Optional) Set up Pterodactyl panel webhook to send events to `/api/ptero/webhook`
5. (Optional) Copy `.env.example` to `.env` and configure environment variables

### Breaking Changes
None - All changes are backward compatible.

### Known Issues
None

---

## [1.0.0] - Previous Release
- Initial Helium 1.0 (Cascade Ridge) release
