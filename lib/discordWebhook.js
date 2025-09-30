/**
 * Discord Webhook Utility
 * Handles sending Discord webhook messages with retry logic and rate limit handling
 * @module discordWebhook
 */

const axios = require('axios');

/**
 * Send a Discord webhook with retry logic and 429 handling
 * @param {string} webhookUrl - Discord webhook URL
 * @param {Object} payload - Webhook payload
 * @param {number} retryCount - Current retry attempt
 * @returns {Promise<boolean>} Success status
 */
async function sendDiscordWebhook(webhookUrl, payload, retryCount = 0) {
  const maxRetries = 3;
  const baseDelay = 1000;

  try {
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.status === 204 || response.status === 200;
  } catch (error) {
    // Handle rate limiting (429)
    if (error.response && error.response.status === 429) {
      const retryAfter = error.response.data?.retry_after 
        ? error.response.data.retry_after * 1000 
        : baseDelay * Math.pow(2, retryCount);

      if (retryCount < maxRetries) {
        console.log(`Discord webhook rate limited. Retrying after ${retryAfter}ms...`);
        await sleep(retryAfter);
        return sendDiscordWebhook(webhookUrl, payload, retryCount + 1);
      }
      
      console.error('Discord webhook failed: Rate limit exceeded, max retries reached');
      return false;
    }

    // Handle other errors with exponential backoff
    if (retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount);
      console.log(`Discord webhook failed. Retrying after ${delay}ms... (${retryCount + 1}/${maxRetries})`);
      await sleep(delay);
      return sendDiscordWebhook(webhookUrl, payload, retryCount + 1);
    }

    console.error('Discord webhook failed after max retries:', error.message);
    return false;
  }
}

/**
 * Create a Discord embed message
 * @param {Object} options - Embed options
 * @returns {Object} Discord embed object
 */
function createEmbed(options = {}) {
  const embed = {
    title: options.title || 'Notification',
    description: options.description || '',
    color: options.color || 0x5865F2, // Discord blurple
    timestamp: new Date().toISOString(),
  };

  if (options.fields) {
    embed.fields = options.fields;
  }

  if (options.footer) {
    embed.footer = options.footer;
  }

  if (options.author) {
    embed.author = options.author;
  }

  if (options.thumbnail) {
    embed.thumbnail = { url: options.thumbnail };
  }

  if (options.image) {
    embed.image = { url: options.image };
  }

  return embed;
}

/**
 * Send a simple notification
 * @param {string} webhookUrl - Discord webhook URL
 * @param {string} title - Notification title
 * @param {string} description - Notification description
 * @param {number} color - Embed color
 * @returns {Promise<boolean>} Success status
 */
async function sendNotification(webhookUrl, title, description, color = 0x5865F2) {
  const embed = createEmbed({ title, description, color });
  return sendDiscordWebhook(webhookUrl, { embeds: [embed] });
}

/**
 * Sleep helper
 * @private
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  sendDiscordWebhook,
  createEmbed,
  sendNotification,
};
