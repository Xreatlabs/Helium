/**
 * Bun configuration for Helium
 * This configures Bun to run the Express app properly
 */

export default {
  // Use the server.js as the entry point
  entry: "./server.js",
  
  // Development settings
  development: {
    // Enable hot reloading
    hot: true,
  },
  
  // Server configuration
  server: {
    // Port configuration - will be overridden by settings.json
    port: process.env.PORT || 3000,
    
    // Host configuration
    hostname: "0.0.0.0",
  },
  
  // Environment variables
  env: {
    NODE_ENV: process.env.NODE_ENV || "development",
  },
  
  // Module resolution
  resolve: {
    // Allow importing .js files as modules
    extensions: [".js", ".json"],
  },
  
  // External dependencies that should not be bundled
  external: [
    "express",
    "express-session", 
    "express-ws",
    "ejs",
    "keyv",
    "@keyv/sqlite",
    "node-fetch",
    "axios",
    "chalk",
    "cron",
    "discord.js",
    "javascript-obfuscator",
    "node-cache",
    "sqlite3",
    "uuid",
    "valid-url",
    "vue",
    "warn"
  ]
};
