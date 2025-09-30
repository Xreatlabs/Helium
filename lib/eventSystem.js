/**
 * Event System for triggering webhooks
 * @module eventSystem
 */

const sqlite3 = require('sqlite3').verbose();
const { sendDiscordWebhook, createEmbed } = require('./discordWebhook');
const settings = require('../settings.json');

/**
 * Get database connection
 * @private
 */
function getDb() {
  const dbPath = settings.database.replace('sqlite://', '');
  return new sqlite3.Database(dbPath);
}

/**
 * Trigger an event and send to all matching webhooks
 * @param {string} eventType - Type of event (e.g., 'server.created', 'user.registered')
 * @param {Object} metadata - Event metadata
 * @returns {Promise<void>}
 */
async function triggerEvent(eventType, metadata = {}) {
  return new Promise((resolve, reject) => {
    const db = getDb();

    const query = `
      SELECT * FROM discord_webhooks 
      WHERE enabled = 1
    `;

    db.all(query, async (err, webhooks) => {
      if (err) {
        console.error('Error fetching webhooks:', err);
        db.close();
        return reject(err);
      }

      // Filter webhooks that match this event type
      const matchingWebhooks = webhooks.filter(webhook => {
        try {
          const eventTypes = JSON.parse(webhook.event_types);
          return eventTypes.includes(eventType) || eventTypes.includes('*');
        } catch (error) {
          console.error('Error parsing event_types for webhook:', webhook.id, error);
          return false;
        }
      });

      // Send to all matching webhooks
      const promises = matchingWebhooks.map(webhook => {
        return sendEventWebhook(webhook, eventType, metadata);
      });

      await Promise.allSettled(promises);
      db.close();
      resolve();
    });
  });
}

/**
 * Send webhook for a specific event
 * @private
 */
async function sendEventWebhook(webhook, eventType, metadata) {
  const embed = formatEventEmbed(eventType, metadata);
  
  const payload = {
    username: 'Helium Notifications',
    embeds: [embed],
  };

  return sendDiscordWebhook(webhook.webhook_url, payload);
}

/**
 * Format event data into Discord embed
 * @private
 */
function formatEventEmbed(eventType, metadata) {
  const embedColors = {
    'server.created': 0x57F287, // Green
    'server.deleted': 0xED4245, // Red
    'server.modified': 0xFEE75C, // Yellow
    'server.suspended': 0xEB459E, // Pink
    'server.unsuspended': 0x57F287, // Green
    'user.registered': 0x5865F2, // Blurple
    'user.login': 0x3BA55D, // Green
    'coins.added': 0xFEE75C, // Yellow
    'coins.spent': 0xED4245, // Red
    'resource.purchased': 0x5865F2, // Blurple
    'admin.action': 0xEB459E, // Pink
  };

  const color = embedColors[eventType] || 0x5865F2;

  const embed = createEmbed({
    title: formatEventTitle(eventType),
    description: formatEventDescription(eventType, metadata),
    color: color,
    fields: formatEventFields(eventType, metadata),
    footer: {
      text: `Helium • ${eventType}`,
    },
  });

  return embed;
}

/**
 * Format event title
 * @private
 */
function formatEventTitle(eventType) {
  const titles = {
    'server.created': '🚀 Server Created',
    'server.deleted': '🗑️ Server Deleted',
    'server.modified': '⚙️ Server Modified',
    'server.suspended': '⏸️ Server Suspended',
    'server.unsuspended': '▶️ Server Unsuspended',
    'user.registered': '👤 New User Registered',
    'user.login': '🔐 User Login',
    'coins.added': '💰 Coins Added',
    'coins.spent': '💸 Coins Spent',
    'resource.purchased': '🛒 Resource Purchased',
    'admin.action': '🔧 Admin Action',
  };

  return titles[eventType] || '📢 Event Notification';
}

/**
 * Format event description
 * @private
 */
function formatEventDescription(eventType, metadata) {
  if (metadata.description) {
    return metadata.description;
  }

  const descriptions = {
    'server.created': `A new server **${metadata.serverName || 'Unknown'}** has been created.`,
    'server.deleted': `Server **${metadata.serverName || 'Unknown'}** has been deleted.`,
    'server.modified': `Server **${metadata.serverName || 'Unknown'}** has been modified.`,
    'server.suspended': `Server **${metadata.serverName || 'Unknown'}** has been suspended.`,
    'server.unsuspended': `Server **${metadata.serverName || 'Unknown'}** has been unsuspended.`,
    'user.registered': `New user **${metadata.username || 'Unknown'}** has registered.`,
    'user.login': `User **${metadata.username || 'Unknown'}** has logged in.`,
    'coins.added': `Coins have been added to **${metadata.username || 'Unknown'}**.`,
    'coins.spent': `**${metadata.username || 'Unknown'}** spent coins.`,
    'resource.purchased': `**${metadata.username || 'Unknown'}** purchased resources.`,
    'admin.action': `Admin action performed by **${metadata.admin || 'Unknown'}**.`,
  };

  return descriptions[eventType] || 'An event has occurred.';
}

/**
 * Format event fields
 * @private
 */
function formatEventFields(eventType, metadata) {
  const fields = [];

  if (metadata.userId) {
    fields.push({
      name: 'User ID',
      value: metadata.userId,
      inline: true,
    });
  }

  if (metadata.username) {
    fields.push({
      name: 'Username',
      value: metadata.username,
      inline: true,
    });
  }

  if (metadata.serverId) {
    fields.push({
      name: 'Server ID',
      value: metadata.serverId.toString(),
      inline: true,
    });
  }

  if (metadata.serverName) {
    fields.push({
      name: 'Server Name',
      value: metadata.serverName,
      inline: true,
    });
  }

  if (metadata.coins !== undefined) {
    fields.push({
      name: 'Coins',
      value: metadata.coins.toString(),
      inline: true,
    });
  }

  if (metadata.ram !== undefined) {
    fields.push({
      name: 'RAM',
      value: `${metadata.ram} MB`,
      inline: true,
    });
  }

  if (metadata.disk !== undefined) {
    fields.push({
      name: 'Disk',
      value: `${metadata.disk} MB`,
      inline: true,
    });
  }

  if (metadata.cpu !== undefined) {
    fields.push({
      name: 'CPU',
      value: `${metadata.cpu}%`,
      inline: true,
    });
  }

  // Add custom fields
  if (metadata.fields && Array.isArray(metadata.fields)) {
    fields.push(...metadata.fields);
  }

  return fields.length > 0 ? fields : undefined;
}

module.exports = {
  triggerEvent,
};
