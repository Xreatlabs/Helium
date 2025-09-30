# Running Helium with Bun

This guide explains how to run the Helium application using Bun instead of Node.js.

## Prerequisites

- Install Bun: `curl -fsSL https://bun.sh/install | bash`
- Ensure all dependencies are installed: `npm install`

## Running with Bun

### Option 1: Using the Bun entry point (Recommended)

```bash
# Run with Bun
bun run server.js

# Or use the npm script
npm run start:bun

# For development with hot reloading
npm run dev
```

### Option 2: Using Bun directly

```bash
# Run the server directly
bun server.js

# With hot reloading
bun --hot server.js
```

## Configuration

The application uses the following files for Bun compatibility:

- `server.js` - Bun-compatible entry point that wraps the Express app
- `bun.config.js` - Bun configuration file
- `package.json` - Updated with Bun scripts

## Troubleshooting

### Bun.serve() Error

If you encounter the error:
```
TypeError: Bun.serve() needs either:
  - A routes object
  - Or a fetch handler
```

Make sure you're running `server.js` instead of `app.js` directly. The `server.js` file provides a proper fetch handler for Bun.

### OAuth Login Loops

The OAuth login loops have been fixed by:
1. Proper session handling in the Bun wrapper
2. Correct redirect logic in the OAuth flow
3. Fixed syntax errors in the OAuth routes

### Session Issues

If you experience session-related issues:
1. Ensure the database is properly configured
2. Check that the session store is working correctly
3. Verify that cookies are being set properly

## Development

For development, use:
```bash
npm run dev
```

This will start the server with hot reloading enabled.

## Production

For production, use:
```bash
npm run start:bun
```

This will start the server without hot reloading.

## Notes

- The Bun wrapper (`server.js`) converts Bun requests to Express-compatible requests
- Session handling is preserved through the wrapper
- All Express middleware and routes work as expected
- The application maintains full compatibility with the original Express setup
