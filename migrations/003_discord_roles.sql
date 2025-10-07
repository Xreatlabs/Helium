-- Discord Role Rewards System Migration
-- Run this migration to create the discord_roles table for role-based rewards

CREATE TABLE IF NOT EXISTS discord_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id TEXT NOT NULL UNIQUE,
  role_name TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  rewards_ram INTEGER DEFAULT 0,
  rewards_disk INTEGER DEFAULT 0,
  rewards_cpu INTEGER DEFAULT 0,
  rewards_servers INTEGER DEFAULT 0,
  rewards_coins INTEGER DEFAULT 0,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_roles_role_id ON discord_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_roles_guild_id ON discord_roles(guild_id);
CREATE INDEX IF NOT EXISTS idx_roles_enabled ON discord_roles(enabled);

-- Table to track user roles (for syncing)
CREATE TABLE IF NOT EXISTS user_discord_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(discord_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_discord_id ON user_discord_roles(discord_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_discord_roles(role_id);
