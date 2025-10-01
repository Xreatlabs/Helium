/**
 * Admin Check Utility
 * Provides database-based admin status checking
 */

/**
 * Check if a user is admin based on database storage
 * @param {string} discordId - Discord user ID
 * @param {Object} db - Database instance
 * @returns {Promise<boolean>} - True if user is admin
 */
async function isUserAdmin(discordId, db) {
  try {
    const adminStatus = await db.get(`admin-${discordId}`);
    return adminStatus === 1;
  } catch (error) {
    console.error('[AdminCheck] Error checking admin status:', error);
    return false;
  }
}

/**
 * Set admin status for a user in the database
 * @param {string} discordId - Discord user ID
 * @param {boolean} isAdmin - Admin status
 * @param {Object} db - Database instance
 * @returns {Promise<void>}
 */
async function setUserAdmin(discordId, isAdmin, db) {
  try {
    await db.set(`admin-${discordId}`, isAdmin ? 1 : 0);
  } catch (error) {
    console.error('[AdminCheck] Error setting admin status:', error);
  }
}

/**
 * Middleware to check admin status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 * @returns {Promise<void>}
 */
async function requireAdmin(req, res, next) {
  try {
    if (!req.session || !req.session.userinfo || !req.session.userinfo.id) {
      return res.redirect('/login');
    }

    const isAdmin = await isUserAdmin(req.session.userinfo.id, req.app.locals.db);
    
    if (!isAdmin) {
      return res.status(403).send('Access denied. Administrator privileges required.');
    }

    next();
  } catch (error) {
    console.error('[AdminCheck] Middleware error:', error);
    return res.status(500).send('Internal server error');
  }
}

module.exports = {
  isUserAdmin,
  setUserAdmin,
  requireAdmin
};
