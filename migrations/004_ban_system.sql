-- Ban System Migration
-- Run this migration to create the banned_users table

CREATE TABLE IF NOT EXISTS banned_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  username TEXT,
  discriminator TEXT,
  banned_by TEXT NOT NULL,
  banned_by_username TEXT,
  reason TEXT,
  banned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  permanent INTEGER DEFAULT 1,
  metadata TEXT
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_banned_user_id ON banned_users(user_id);
CREATE INDEX IF NOT EXISTS idx_banned_expires ON banned_users(expires_at);
CREATE INDEX IF NOT EXISTS idx_banned_permanent ON banned_users(permanent);

-- Log table for ban history
CREATE TABLE IF NOT EXISTS ban_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  reason TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_ban_history_user ON ban_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ban_history_action ON ban_history(action);
