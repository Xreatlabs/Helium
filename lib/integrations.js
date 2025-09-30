/**
 * Integration helpers for triggering events in existing code
 * Import this module and use triggerEvent where needed
 * @module integrations
 */

const { triggerEvent } = require('./eventSystem');

/**
 * Wrap server creation to trigger webhook events
 */
async function onServerCreated(serverData, userData) {
  await triggerEvent('server.created', {
    serverId: serverData.id,
    serverName: serverData.name,
    userId: userData.id,
    username: userData.username,
    ram: serverData.limits?.memory,
    disk: serverData.limits?.disk,
    cpu: serverData.limits?.cpu,
  });
}

/**
 * Wrap server deletion to trigger webhook events
 */
async function onServerDeleted(serverData, userData) {
  await triggerEvent('server.deleted', {
    serverId: serverData.id,
    serverName: serverData.name,
    userId: userData.id,
    username: userData.username,
  });
}

/**
 * Wrap server modification to trigger webhook events
 */
async function onServerModified(serverData, userData) {
  await triggerEvent('server.modified', {
    serverId: serverData.id,
    serverName: serverData.name,
    userId: userData.id,
    username: userData.username,
    ram: serverData.limits?.memory,
    disk: serverData.limits?.disk,
    cpu: serverData.limits?.cpu,
  });
}

/**
 * Wrap user registration to trigger webhook events
 */
async function onUserRegistered(userData) {
  await triggerEvent('user.registered', {
    userId: userData.id,
    username: userData.username,
  });
}

/**
 * Wrap coin transactions to trigger webhook events
 */
async function onCoinsAdded(userId, username, amount) {
  await triggerEvent('coins.added', {
    userId,
    username,
    coins: amount,
  });
}

async function onCoinsSpent(userId, username, amount, reason) {
  await triggerEvent('coins.spent', {
    userId,
    username,
    coins: amount,
    description: `Spent ${amount} coins on ${reason}`,
  });
}

/**
 * Wrap resource purchases to trigger webhook events
 */
async function onResourcePurchased(userId, username, resourceType, amount) {
  await triggerEvent('resource.purchased', {
    userId,
    username,
    description: `Purchased ${amount} ${resourceType}`,
    fields: [
      { name: 'Resource', value: resourceType, inline: true },
      { name: 'Amount', value: amount.toString(), inline: true },
    ],
  });
}

/**
 * Wrap admin actions to trigger webhook events
 */
async function onAdminAction(adminUser, action, targetUser, details) {
  await triggerEvent('admin.action', {
    admin: adminUser,
    userId: targetUser,
    description: `${adminUser} performed action: ${action}`,
    fields: details,
  });
}

module.exports = {
  onServerCreated,
  onServerDeleted,
  onServerModified,
  onUserRegistered,
  onCoinsAdded,
  onCoinsSpent,
  onResourcePurchased,
  onAdminAction,
  triggerEvent,
};
