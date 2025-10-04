const settings = require("../settings.json");

module.exports.load = async function (app, db) {
  // Leaderboard endpoint - returns top users by coins
  app.get("/api/leaderboard", async (req, res) => {
    if (!req.session || !req.session.pterodactyl) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      // Get all users from the database
      const usersList = await db.get("users") || [];
      
      // Fetch coins and user data for all users
      const leaderboardData = [];
      
      for (const userId of usersList) {
        const coins = await db.get("coins-" + userId) || 0;
        const userData = await db.get("users-" + userId);
        
        if (userData && coins > 0) {
          leaderboardData.push({
            userId: userId,
            username: userData.username || "Unknown",
            global_name: userData.global_name || userData.username || "Unknown User",
            avatar: userData.avatar || null,
            coins: parseFloat(coins.toFixed(2))
          });
        }
      }
      
      // Sort by coins in descending order
      leaderboardData.sort((a, b) => b.coins - a.coins);
      
      // Take top 20
      const topUsers = leaderboardData.slice(0, 20);
      
      // Add rank
      topUsers.forEach((user, index) => {
        user.rank = index + 1;
      });
      
      return res.json({
        success: true,
        leaderboard: topUsers,
        total: leaderboardData.length
      });
    } catch (error) {
      console.error("Leaderboard error:", error);
      return res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });
};
