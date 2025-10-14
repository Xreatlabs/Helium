/**
 * Gamification Features API
 * Handles Daily Login Rewards, Lottery System, and Marketplace
 */

const Database = require('better-sqlite3');
const fs = require('fs');

module.exports.load = async function (app, db) {
  const settings = JSON.parse(fs.readFileSync('./settings.json').toString());

  // Helper function to check if user is authenticated
  function isAuthenticated(req, res) {
    if (!req.session.userinfo || !req.session.userinfo.id) {
      return false;
    }
    return true;
  }

  // ========================================
  // DAILY LOGIN REWARDS
  // ========================================

  /**
   * GET /api/gamification/daily-reward
   * Check and claim daily login reward
   */
  app.get('/api/gamification/daily-reward', async (req, res) => {
    if (!isAuthenticated(req, res)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!settings.api?.client?.coins?.dailyRewards?.enabled) {
      return res.status(503).json({ success: false, error: 'Daily rewards are disabled' });
    }

    const userId = req.session.userinfo.id;
    const today = new Date().toISOString().split('T')[0];

    try {
      const sqlite = new Database('./database.sqlite');

      // Get user's streak info
      let streakInfo = sqlite.prepare('SELECT * FROM user_login_streaks WHERE user_id = ?').get(userId);

      // Check if already claimed today
      const todayReward = sqlite.prepare(
        'SELECT * FROM daily_login_rewards WHERE user_id = ? AND login_date = ?'
      ).get(userId, today);

      if (todayReward) {
        sqlite.close();
        return res.json({
          success: true,
          alreadyClaimed: true,
          canClaim: false,
          streak: streakInfo?.current_streak || 0,
          longestStreak: streakInfo?.longest_streak || 0,
          nextRewardIn: getTimeUntilMidnight()
        });
      }

      // Initialize streak info if doesn't exist
      if (!streakInfo) {
        sqlite.prepare(`
          INSERT INTO user_login_streaks (user_id, current_streak, longest_streak, last_login_date, total_logins)
          VALUES (?, 0, 0, NULL, 0)
        `).run(userId);
        streakInfo = { current_streak: 0, longest_streak: 0, last_login_date: null, total_logins: 0 };
      }

      // Calculate new streak
      let newStreak = 1;
      if (streakInfo.last_login_date) {
        const lastLogin = new Date(streakInfo.last_login_date);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastLogin.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
          // Consecutive day
          newStreak = (streakInfo.current_streak || 0) + 1;
        }
      }

      const longestStreak = Math.max(newStreak, streakInfo.longest_streak || 0);

      // Calculate rewards
      const config = settings.api.client.coins.dailyRewards;
      let coinsReward = config.baseReward || 10;
      let resourcesReward = { ram: 0, disk: 0, cpu: 0 };

      // Add streak bonus
      if (config.streakBonus?.enabled && newStreak > 1) {
        const maxStreak = config.streakBonus.maxStreak || 30;
        const streakDays = Math.min(newStreak, maxStreak);
        coinsReward += (streakDays - 1) * (config.streakBonus.bonusPerDay || 5);
      }

      // Check for milestone rewards
      let isMilestone = false;
      if (config.milestoneRewards?.enabled && config.milestoneRewards.milestones) {
        const milestone = config.milestoneRewards.milestones[newStreak];
        if (milestone) {
          isMilestone = true;
          coinsReward += milestone.coins || 0;
          resourcesReward.ram = milestone.ram || 0;
          resourcesReward.disk = milestone.disk || 0;
          resourcesReward.cpu = milestone.cpu || 0;
        }
      }

      // Update database
      const updateStmt = sqlite.prepare(`
        INSERT OR REPLACE INTO user_login_streaks 
        (user_id, current_streak, longest_streak, last_login_date, total_logins, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      updateStmt.run(userId, newStreak, longestStreak, today, (streakInfo.total_logins || 0) + 1);

      // Record today's reward
      sqlite.prepare(`
        INSERT INTO daily_login_rewards (user_id, login_date, streak_count, coins_rewarded, resources_rewarded)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, today, newStreak, coinsReward, JSON.stringify(resourcesReward));

      // Give coins
      const currentCoins = await db.get('coins-' + userId) || 0;
      await db.set('coins-' + userId, currentCoins + coinsReward);

      // Give resources if any
      if (resourcesReward.ram > 0 || resourcesReward.disk > 0 || resourcesReward.cpu > 0) {
        const currentExtra = await db.get('extra-' + userId) || { ram: 0, disk: 0, cpu: 0, servers: 0 };
        await db.set('extra-' + userId, {
          ram: (currentExtra.ram || 0) + resourcesReward.ram,
          disk: (currentExtra.disk || 0) + resourcesReward.disk,
          cpu: (currentExtra.cpu || 0) + resourcesReward.cpu,
          servers: currentExtra.servers || 0
        });
      }

      sqlite.close();

      res.json({
        success: true,
        alreadyClaimed: false,
        canClaim: true,
        claimed: true,
        rewards: {
          coins: coinsReward,
          resources: resourcesReward
        },
        streak: newStreak,
        longestStreak: longestStreak,
        isMilestone: isMilestone,
        nextRewardIn: getTimeUntilMidnight()
      });

    } catch (error) {
      console.error('Daily reward error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /**
   * GET /api/gamification/daily-reward/status
   * Get daily reward status without claiming
   */
  app.get('/api/gamification/daily-reward/status', async (req, res) => {
    if (!isAuthenticated(req, res)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!settings.api?.client?.coins?.dailyRewards?.enabled) {
      return res.status(503).json({ success: false, error: 'Daily rewards are disabled' });
    }

    const userId = req.session.userinfo.id;
    const today = new Date().toISOString().split('T')[0];

    try {
      const sqlite = new Database('./database.sqlite');

      const streakInfo = sqlite.prepare('SELECT * FROM user_login_streaks WHERE user_id = ?').get(userId);
      const todayReward = sqlite.prepare(
        'SELECT * FROM daily_login_rewards WHERE user_id = ? AND login_date = ?'
      ).get(userId, today);

      sqlite.close();

      res.json({
        success: true,
        canClaim: !todayReward,
        alreadyClaimed: !!todayReward,
        streak: streakInfo?.current_streak || 0,
        longestStreak: streakInfo?.longest_streak || 0,
        totalLogins: streakInfo?.total_logins || 0,
        nextRewardIn: getTimeUntilMidnight()
      });

    } catch (error) {
      console.error('Daily reward status error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // ========================================
  // LOTTERY SYSTEM
  // ========================================

  /**
   * GET /api/gamification/lottery/current
   * Get current lottery round info
   */
  app.get('/api/gamification/lottery/current', async (req, res) => {
    if (!isAuthenticated(req, res)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!settings.api?.client?.coins?.lottery?.enabled) {
      return res.status(503).json({ success: false, error: 'Lottery is disabled' });
    }

    try {
      const sqlite = new Database('./database.sqlite');
      const userId = req.session.userinfo.id;

      // Get active round
      let round = sqlite.prepare("SELECT * FROM lottery_rounds WHERE status = 'active' ORDER BY id DESC LIMIT 1").get();

      // Create new round if none exists and autoStart is enabled
      if (!round && settings.api.client.coins.lottery.autoStart) {
        round = await createNewLotteryRound(sqlite, settings);
      }

      if (!round) {
        sqlite.close();
        return res.json({ success: true, hasActiveRound: false });
      }

      // Get user's tickets
      const userTickets = sqlite.prepare(
        'SELECT * FROM lottery_tickets WHERE round_id = ? AND user_id = ?'
      ).all(round.id, userId);

      // Get total tickets
      const totalTickets = sqlite.prepare(
        'SELECT COUNT(*) as count FROM lottery_tickets WHERE round_id = ?'
      ).get(round.id);

      sqlite.close();

      res.json({
        success: true,
        hasActiveRound: true,
        round: {
          id: round.id,
          roundNumber: round.round_number,
          startTime: round.start_time,
          endTime: round.end_time,
          ticketCost: round.ticket_cost,
          maxTicketsPerUser: round.max_tickets_per_user,
          prizePoolCoins: round.prize_pool_coins,
          prizePoolResources: JSON.parse(round.prize_pool_resources || '{}'),
          totalTicketsSold: totalTickets.count,
          timeRemaining: new Date(round.end_time) - new Date()
        },
        userTickets: userTickets.map(t => t.ticket_number),
        userTicketCount: userTickets.length
      });

    } catch (error) {
      console.error('Lottery current error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /**
   * POST /api/gamification/lottery/buy-ticket
   * Buy lottery tickets
   */
  app.post('/api/gamification/lottery/buy-ticket', async (req, res) => {
    if (!isAuthenticated(req, res)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!settings.api?.client?.coins?.lottery?.enabled) {
      return res.status(503).json({ success: false, error: 'Lottery is disabled' });
    }

    const userId = req.session.userinfo.id;
    const { quantity = 1 } = req.body;

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ success: false, error: 'Invalid quantity' });
    }

    try {
      const sqlite = new Database('./database.sqlite');

      // Get active round
      const round = sqlite.prepare("SELECT * FROM lottery_rounds WHERE status = 'active' ORDER BY id DESC LIMIT 1").get();

      if (!round) {
        sqlite.close();
        return res.status(404).json({ success: false, error: 'No active lottery round' });
      }

      // Check if round has ended
      if (new Date(round.end_time) < new Date()) {
        sqlite.close();
        return res.status(400).json({ success: false, error: 'Lottery round has ended' });
      }

      // Check user's current tickets
      const userTickets = sqlite.prepare(
        'SELECT COUNT(*) as count FROM lottery_tickets WHERE round_id = ? AND user_id = ?'
      ).get(round.id, userId);

      const maxTickets = round.max_tickets_per_user;
      if (userTickets.count + quantity > maxTickets) {
        sqlite.close();
        return res.status(400).json({ 
          success: false, 
          error: `Maximum ${maxTickets} tickets per user. You have ${userTickets.count}` 
        });
      }

      // Check user has enough coins
      const userCoins = await db.get('coins-' + userId) || 0;
      const totalCost = round.ticket_cost * quantity;

      if (userCoins < totalCost) {
        sqlite.close();
        return res.status(400).json({ success: false, error: 'Insufficient coins' });
      }

      // Deduct coins
      await db.set('coins-' + userId, userCoins - totalCost);

      // Get current max ticket number
      const maxTicket = sqlite.prepare(
        'SELECT MAX(ticket_number) as max FROM lottery_tickets WHERE round_id = ?'
      ).get(round.id);

      let nextTicketNumber = (maxTicket.max || 0) + 1;

      // Insert tickets
      const insertStmt = sqlite.prepare(`
        INSERT INTO lottery_tickets (round_id, user_id, ticket_number)
        VALUES (?, ?, ?)
      `);

      const ticketNumbers = [];
      for (let i = 0; i < quantity; i++) {
        insertStmt.run(round.id, userId, nextTicketNumber);
        ticketNumbers.push(nextTicketNumber);
        nextTicketNumber++;
      }

      // Update round prize pool and ticket count
      const prizeIncrease = Math.floor(totalCost * (settings.api.client.coins.lottery.prizeDistribution.coinsPercentage / 100));
      sqlite.prepare(`
        UPDATE lottery_rounds 
        SET prize_pool_coins = prize_pool_coins + ?, total_tickets_sold = total_tickets_sold + ?
        WHERE id = ?
      `).run(prizeIncrease, quantity, round.id);

      sqlite.close();

      res.json({
        success: true,
        ticketNumbers: ticketNumbers,
        totalCost: totalCost,
        remainingCoins: userCoins - totalCost
      });

    } catch (error) {
      console.error('Lottery buy ticket error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /**
   * GET /api/gamification/lottery/history
   * Get past lottery rounds
   */
  app.get('/api/gamification/lottery/history', async (req, res) => {
    if (!isAuthenticated(req, res)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!settings.api?.client?.coins?.lottery?.enabled) {
      return res.status(503).json({ success: false, error: 'Lottery is disabled' });
    }

    try {
      const sqlite = new Database('./database.sqlite');

      const history = sqlite.prepare(`
        SELECT * FROM lottery_rounds 
        WHERE status = 'completed' 
        ORDER BY drawn_at DESC 
        LIMIT 20
      `).all();

      sqlite.close();

      res.json({
        success: true,
        history: history.map(r => ({
          roundNumber: r.round_number,
          drawnAt: r.drawn_at,
          winnerUserId: r.winner_user_id,
          winningTicket: r.winning_ticket_id,
          prizeCoins: r.prize_pool_coins,
          totalTickets: r.total_tickets_sold
        }))
      });

    } catch (error) {
      console.error('Lottery history error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // ========================================
  // MARKETPLACE
  // ========================================

  /**
   * GET /api/gamification/marketplace/listings
   * Get active marketplace listings
   */
  app.get('/api/gamification/marketplace/listings', async (req, res) => {
    if (!isAuthenticated(req, res)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!settings.api?.client?.coins?.marketplace?.enabled) {
      return res.status(503).json({ success: false, error: 'Marketplace is disabled' });
    }

    const { type, sort = 'newest' } = req.query;

    try {
      const sqlite = new Database('./database.sqlite');

      let query = `
        SELECT l.*, 
        (SELECT COUNT(*) FROM marketplace_transactions WHERE listing_id = l.id) as sales_count
        FROM marketplace_listings l
        WHERE l.status = 'active' AND l.quantity_available > 0
      `;

      if (type && type !== 'all') {
        query += ` AND l.resource_type = '${type}'`;
      }

      // Sort options
      switch (sort) {
        case 'price_low':
          query += ' ORDER BY l.price_coins ASC';
          break;
        case 'price_high':
          query += ' ORDER BY l.price_coins DESC';
          break;
        case 'oldest':
          query += ' ORDER BY l.created_at ASC';
          break;
        default:
          query += ' ORDER BY l.created_at DESC';
      }

      const listings = sqlite.prepare(query).all();
      sqlite.close();

      res.json({
        success: true,
        listings: listings.map(l => ({
          id: l.id,
          sellerUserId: l.seller_user_id,
          resourceType: l.resource_type,
          resourceAmount: l.resource_amount,
          priceCoins: l.price_coins,
          quantityAvailable: l.quantity_available,
          quantitySold: l.quantity_sold,
          createdAt: l.created_at,
          expiresAt: l.expires_at
        }))
      });

    } catch (error) {
      console.error('Marketplace listings error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /**
   * POST /api/gamification/marketplace/create-listing
   * Create a new marketplace listing
   */
  app.post('/api/gamification/marketplace/create-listing', async (req, res) => {
    if (!isAuthenticated(req, res)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!settings.api?.client?.coins?.marketplace?.enabled) {
      return res.status(503).json({ success: false, error: 'Marketplace is disabled' });
    }

    const userId = req.session.userinfo.id;
    const { resourceType, resourceAmount, priceCoins, quantity = 1 } = req.body;

    // Validation
    if (!resourceType || !resourceAmount || !priceCoins) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    if (!['ram', 'disk', 'cpu'].includes(resourceType)) {
      return res.status(400).json({ success: false, error: 'Invalid resource type' });
    }

    const config = settings.api.client.coins.marketplace;

    // Check if resource is allowed
    if (!config.allowedResources[resourceType]) {
      return res.status(400).json({ success: false, error: 'This resource type cannot be traded' });
    }

    // Check price range
    if (priceCoins < config.minPrice) {
      return res.status(400).json({ success: false, error: `Minimum price is ${config.minPrice} coins` });
    }

    try {
      const sqlite = new Database('./database.sqlite');

      // Check user's active listings count
      const activeCount = sqlite.prepare(
        "SELECT COUNT(*) as count FROM marketplace_listings WHERE seller_user_id = ? AND status = 'active'"
      ).get(userId);

      if (activeCount.count >= config.maxActiveListings) {
        sqlite.close();
        return res.status(400).json({ 
          success: false, 
          error: `Maximum ${config.maxActiveListings} active listings allowed` 
        });
      }

      // Check user has the resources
      const userExtra = await db.get('extra-' + userId) || { ram: 0, disk: 0, cpu: 0, servers: 0 };
      const totalAmount = resourceAmount * quantity;

      if (userExtra[resourceType] < totalAmount) {
        sqlite.close();
        return res.status(400).json({ success: false, error: 'Insufficient resources' });
      }

      // Deduct resources from user
      userExtra[resourceType] -= totalAmount;
      await db.set('extra-' + userId, userExtra);

      // Create listing
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + config.listingDuration);

      const result = sqlite.prepare(`
        INSERT INTO marketplace_listings 
        (seller_user_id, listing_type, resource_type, resource_amount, price_coins, quantity_available, expires_at)
        VALUES (?, 'sell', ?, ?, ?, ?, ?)
      `).run(userId, resourceType, resourceAmount, priceCoins, quantity, expiresAt.toISOString());

      sqlite.close();

      res.json({
        success: true,
        listingId: result.lastInsertRowid,
        message: 'Listing created successfully'
      });

    } catch (error) {
      console.error('Marketplace create listing error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /**
   * POST /api/gamification/marketplace/buy/:listingId
   * Purchase from a marketplace listing
   */
  app.post('/api/gamification/marketplace/buy/:listingId', async (req, res) => {
    if (!isAuthenticated(req, res)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!settings.api?.client?.coins?.marketplace?.enabled) {
      return res.status(503).json({ success: false, error: 'Marketplace is disabled' });
    }

    const userId = req.session.userinfo.id;
    const listingId = parseInt(req.params.listingId);
    const { quantity = 1 } = req.body;

    try {
      const sqlite = new Database('./database.sqlite');

      // Get listing
      const listing = sqlite.prepare("SELECT * FROM marketplace_listings WHERE id = ? AND status = 'active'").get(listingId);

      if (!listing) {
        sqlite.close();
        return res.status(404).json({ success: false, error: 'Listing not found' });
      }

      if (listing.seller_user_id === userId) {
        sqlite.close();
        return res.status(400).json({ success: false, error: 'Cannot buy your own listing' });
      }

      if (listing.quantity_available < quantity) {
        sqlite.close();
        return res.status(400).json({ success: false, error: 'Not enough quantity available' });
      }

      const totalPrice = listing.price_coins * quantity;
      const userCoins = await db.get('coins-' + userId) || 0;

      if (userCoins < totalPrice) {
        sqlite.close();
        return res.status(400).json({ success: false, error: 'Insufficient coins' });
      }

      // Calculate fee
      const config = settings.api.client.coins.marketplace;
      const fee = Math.floor(totalPrice * (config.tradingFee / 100));
      const sellerReceives = totalPrice - fee;

      // Deduct coins from buyer
      await db.set('coins-' + userId, userCoins - totalPrice);

      // Give coins to seller
      const sellerCoins = await db.get('coins-' + listing.seller_user_id) || 0;
      await db.set('coins-' + listing.seller_user_id, sellerCoins + sellerReceives);

      // Give resources to buyer
      const buyerExtra = await db.get('extra-' + userId) || { ram: 0, disk: 0, cpu: 0, servers: 0 };
      buyerExtra[listing.resource_type] = (buyerExtra[listing.resource_type] || 0) + (listing.resource_amount * quantity);
      await db.set('extra-' + userId, buyerExtra);

      // Update listing
      const newQuantity = listing.quantity_available - quantity;
      const newStatus = newQuantity === 0 ? 'sold' : 'active';

      sqlite.prepare(`
        UPDATE marketplace_listings 
        SET quantity_available = ?, quantity_sold = quantity_sold + ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newQuantity, quantity, newStatus, listingId);

      // Record transaction
      sqlite.prepare(`
        INSERT INTO marketplace_transactions 
        (listing_id, buyer_user_id, seller_user_id, resource_type, resource_amount, price_paid, quantity, marketplace_fee)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(listingId, userId, listing.seller_user_id, listing.resource_type, listing.resource_amount, totalPrice, quantity, fee);

      // Update stats
      updateMarketplaceStats(sqlite, userId, listing.seller_user_id, totalPrice);

      sqlite.close();

      res.json({
        success: true,
        message: 'Purchase successful',
        totalPaid: totalPrice,
        resourcesReceived: listing.resource_amount * quantity,
        remainingCoins: userCoins - totalPrice
      });

    } catch (error) {
      console.error('Marketplace buy error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /**
   * DELETE /api/gamification/marketplace/cancel/:listingId
   * Cancel own listing and refund resources
   */
  app.delete('/api/gamification/marketplace/cancel/:listingId', async (req, res) => {
    if (!isAuthenticated(req, res)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!settings.api?.client?.coins?.marketplace?.enabled) {
      return res.status(503).json({ success: false, error: 'Marketplace is disabled' });
    }

    const userId = req.session.userinfo.id;
    const listingId = parseInt(req.params.listingId);

    try {
      const sqlite = new Database('./database.sqlite');

      const listing = sqlite.prepare("SELECT * FROM marketplace_listings WHERE id = ? AND status = 'active'").get(listingId);

      if (!listing) {
        sqlite.close();
        return res.status(404).json({ success: false, error: 'Listing not found' });
      }

      if (listing.seller_user_id !== userId) {
        sqlite.close();
        return res.status(403).json({ success: false, error: 'Not your listing' });
      }

      // Refund resources
      const userExtra = await db.get('extra-' + userId) || { ram: 0, disk: 0, cpu: 0, servers: 0 };
      const refundAmount = listing.resource_amount * listing.quantity_available;
      userExtra[listing.resource_type] = (userExtra[listing.resource_type] || 0) + refundAmount;
      await db.set('extra-' + userId, userExtra);

      // Cancel listing
      sqlite.prepare("UPDATE marketplace_listings SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(listingId);

      sqlite.close();

      res.json({
        success: true,
        message: 'Listing cancelled and resources refunded',
        refundedAmount: refundAmount
      });

    } catch (error) {
      console.error('Marketplace cancel error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /**
   * GET /api/gamification/marketplace/my-listings
   * Get user's own listings
   */
  app.get('/api/gamification/marketplace/my-listings', async (req, res) => {
    if (!isAuthenticated(req, res)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!settings.api?.client?.coins?.marketplace?.enabled) {
      return res.status(503).json({ success: false, error: 'Marketplace is disabled' });
    }

    const userId = req.session.userinfo.id;

    try {
      const sqlite = new Database('./database.sqlite');

      const listings = sqlite.prepare(`
        SELECT * FROM marketplace_listings 
        WHERE seller_user_id = ? 
        ORDER BY created_at DESC
      `).all(userId);

      sqlite.close();

      res.json({
        success: true,
        listings: listings
      });

    } catch (error) {
      console.error('My listings error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // ========================================
  // HELPER FUNCTIONS
  // ========================================

  function getTimeUntilMidnight() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow - now;
  }

  async function createNewLotteryRound(sqlite, settings) {
    const config = settings.api.client.coins.lottery;
    
    // Get last round number
    const lastRound = sqlite.prepare('SELECT MAX(round_number) as max FROM lottery_rounds').get();
    const newRoundNumber = (lastRound.max || 0) + 1;

    const startTime = new Date();
    const endTime = new Date();
    endTime.setDate(endTime.getDate() + (config.roundDuration || 7));

    const result = sqlite.prepare(`
      INSERT INTO lottery_rounds 
      (round_number, start_time, end_time, ticket_cost, max_tickets_per_user, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `).run(newRoundNumber, startTime.toISOString(), endTime.toISOString(), config.ticketCost, config.maxTicketsPerUser);

    return sqlite.prepare('SELECT * FROM lottery_rounds WHERE id = ?').get(result.lastInsertRowid);
  }

  function updateMarketplaceStats(sqlite, buyerId, sellerId, amount) {
    // Update buyer stats
    sqlite.prepare(`
      INSERT INTO marketplace_user_stats (user_id, total_purchases, total_coins_spent)
      VALUES (?, 1, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        total_purchases = total_purchases + 1,
        total_coins_spent = total_coins_spent + ?,
        updated_at = CURRENT_TIMESTAMP
    `).run(buyerId, amount, amount);

    // Update seller stats
    sqlite.prepare(`
      INSERT INTO marketplace_user_stats (user_id, total_sales, total_coins_earned)
      VALUES (?, 1, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        total_sales = total_sales + 1,
        total_coins_earned = total_coins_earned + ?,
        updated_at = CURRENT_TIMESTAMP
    `).run(sellerId, amount, amount);
  }

  console.log('[Gamification] API endpoints loaded');
};
