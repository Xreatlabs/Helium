-- API Keys Table Migration
-- Run this migration to create the api_keys table for dashboard API access

CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  permissions TEXT NOT NULL,
  created_by TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  last_used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_api_keys_enabled ON api_keys(enabled);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_by ON api_keys(created_by);
