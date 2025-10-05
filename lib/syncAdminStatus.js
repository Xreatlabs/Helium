/**
 * Sync admin status between Pterodactyl panel and Helium dashboard
 * This ensures that if panel admin status changes, dashboard admin status is updated accordingly
 * 
 * @param {Object} pterodactylUser - The pterodactyl user object with attributes
 * @param {string} discordUserId - The Discord user ID
 * @param {Object} db - Database instance
 * @returns {Promise<boolean>} - Returns true if user is admin, false otherwise
 */
async function syncAdminStatus(pterodactylUser, discordUserId, db) {
  if (!pterodactylUser || pterodactylUser.root_admin === undefined || !discordUserId || !db) {
    console.error('[syncAdminStatus] Missing required parameters', {
      hasPterodactylUser: !!pterodactylUser,
      hasRootAdminProperty: pterodactylUser ? pterodactylUser.root_admin !== undefined : false,
      hasDiscordUserId: !!discordUserId,
      hasDb: !!db
    });
    return false;
  }
  
  const isRootAdmin = pterodactylUser.root_admin === true;
  await db.set(`admin-${discordUserId}`, isRootAdmin ? 1 : 0);
  
  return isRootAdmin;
}

module.exports = syncAdminStatus;
