-- Gamification Features Migration
-- Adds Daily Login Rewards, Lottery System, and Marketplace

-- ========================================
-- Daily Login Rewards System
-- ========================================
CREATE TABLE IF NOT EXISTS daily_login_rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  login_date DATE NOT NULL,
  streak_count INTEGER DEFAULT 1,
  coins_rewarded INTEGER DEFAULT 0,
  resources_rewarded TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, login_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_login_user_id ON daily_login_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_login_date ON daily_login_rewards(login_date);

-- User streak tracking
CREATE TABLE IF NOT EXISTS user_login_streaks (
  user_id TEXT PRIMARY KEY,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_login_date DATE,
  total_logins INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- Lottery/Raffle System
-- ========================================
CREATE TABLE IF NOT EXISTS lottery_rounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_number INTEGER UNIQUE NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  ticket_cost INTEGER NOT NULL,
  max_tickets_per_user INTEGER DEFAULT 10,
  prize_pool_coins INTEGER DEFAULT 0,
  prize_pool_resources TEXT DEFAULT '{}',
  status TEXT DEFAULT 'active',
  winner_user_id TEXT,
  winning_ticket_id INTEGER,
  total_tickets_sold INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  drawn_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_lottery_status ON lottery_rounds(status);
CREATE INDEX IF NOT EXISTS idx_lottery_end_time ON lottery_rounds(end_time);

-- Lottery tickets
CREATE TABLE IF NOT EXISTS lottery_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  ticket_number INTEGER NOT NULL,
  purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (round_id) REFERENCES lottery_rounds(id),
  UNIQUE(round_id, ticket_number)
);

CREATE INDEX IF NOT EXISTS idx_lottery_tickets_round ON lottery_tickets(round_id);
CREATE INDEX IF NOT EXISTS idx_lottery_tickets_user ON lottery_tickets(user_id);

-- ========================================
-- Coin Trading Marketplace
-- ========================================
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_user_id TEXT NOT NULL,
  listing_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_amount INTEGER NOT NULL,
  price_coins INTEGER NOT NULL,
  quantity_available INTEGER DEFAULT 1,
  quantity_sold INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_marketplace_seller ON marketplace_listings(seller_user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_type ON marketplace_listings(listing_type, resource_type);

-- Marketplace transactions
CREATE TABLE IF NOT EXISTS marketplace_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER NOT NULL,
  buyer_user_id TEXT NOT NULL,
  seller_user_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_amount INTEGER NOT NULL,
  price_paid INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  marketplace_fee INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_trans_buyer ON marketplace_transactions(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_trans_seller ON marketplace_transactions(seller_user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_trans_listing ON marketplace_transactions(listing_id);

-- User marketplace stats
CREATE TABLE IF NOT EXISTS marketplace_user_stats (
  user_id TEXT PRIMARY KEY,
  total_sales INTEGER DEFAULT 0,
  total_purchases INTEGER DEFAULT 0,
  total_coins_earned INTEGER DEFAULT 0,
  total_coins_spent INTEGER DEFAULT 0,
  rating REAL DEFAULT 5.0,
  total_ratings INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
