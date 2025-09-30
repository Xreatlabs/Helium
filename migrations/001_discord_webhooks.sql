-- Discord Webhooks Table Migration
-- Run this migration to create the discord_webhooks table

CREATE TABLE IF NOT EXISTS discord_webhooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  server_id TEXT,
  event_types TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_webhooks_enabled ON discord_webhooks(enabled);
CREATE INDEX IF NOT EXISTS idx_webhooks_server_id ON discord_webhooks(server_id);
