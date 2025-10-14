-- Node Limits and Server Capacity Management
-- Allows admins to set server limits per node and track current usage

CREATE TABLE IF NOT EXISTS node_limits (
  node_id INTEGER PRIMARY KEY,
  node_name TEXT,
  location_name TEXT,
  server_limit INTEGER DEFAULT 0,
  current_servers INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_node_limits_enabled ON node_limits(enabled);
CREATE INDEX IF NOT EXISTS idx_node_limits_location ON node_limits(location_name);

-- Log node limit changes
CREATE TABLE IF NOT EXISTS node_limit_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  node_id INTEGER NOT NULL,
  old_limit INTEGER,
  new_limit INTEGER,
  changed_by TEXT,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (node_id) REFERENCES node_limits(node_id)
);

CREATE INDEX IF NOT EXISTS idx_node_history_node ON node_limit_history(node_id);
CREATE INDEX IF NOT EXISTS idx_node_history_date ON node_limit_history(changed_at);
