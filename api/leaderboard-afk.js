const settings = require("../settings.json");

module.exports.load = async function (app, db) {
  // AFK Leaderboard endpoint - returns top users by AFK time
  app.get("/api/leaderboard/afk", async (req, res) => {
    if (!req.session || !req.session.pterodactyl) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      // Get all users from the database
      const usersList = await db.get("users") || [];
      
      // Fetch AFK time and user data for all users
      const leaderboardData = [];
      
      for (const userId of usersList) {
        const afkTime = await db.get("afk-time-" + userId) || 0;
        const userData = await db.get("users-" + userId);
        
        if (userData && afkTime > 0) {
          leaderboardData.push({
            userId: userId,
            username: userData.username || "Unknown",
            global_name: userData.global_name || userData.username || "Unknown User",
            avatar: userData.avatar || null,
            afkTime: parseFloat(afkTime.toFixed(2)), // Total minutes
            afkHours: parseFloat((afkTime / 60).toFixed(2))
          });
        }
      }
      
      // Sort by AFK time in descending order
      leaderboardData.sort((a, b) => b.afkTime - a.afkTime);
      
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
      console.error("AFK Leaderboard error:", error);
      return res.status(500).json({ error: "Failed to fetch AFK leaderboard" });
    }
  });
};
