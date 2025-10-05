const fetch = require('node-fetch')
const fs = require('fs')
const path = require('path')

// Function to get fresh settings (no caching)
function getSettings() {
    const settingsPath = path.join(__dirname, '../settings.json')
    const data = fs.readFileSync(settingsPath, 'utf8')
    return JSON.parse(data)
}

/**
 * Color scheme for different action categories
 */
const ACTION_COLORS = {
    // User actions - Blue/Cyan tones
    'signup': 0x5865F2,              // Discord Blurple
    'create server': 0x57F287,       // Green
    'created server': 0x57F287,      // Green
    'modify server': 0xFEE75C,       // Yellow
    'buy ram': 0x3498DB,             // Blue
    'buy cpu': 0x9B59B6,             // Purple
    'buy disk': 0xE67E22,            // Orange
    'buy servers': 0x1ABC9C,         // Turquoise
    'gifted coins': 0xF1C40F,        // Gold
    'resources purchased': 0x3498DB, // Blue
    'server renewed': 0x2ECC71,      // Green
    'auto-renewal enabled': 0x2ECC71,// Green
    'auto-renewal disabled': 0x95A5A6,// Gray
    'code redeemed': 0xF1C40F,       // Gold
    
    // Admin actions - Red/Orange tones
    'set coins': 0xE74C3C,           // Red
    'add coins': 0xE67E22,           // Orange
    'set resources': 0xF39C12,       // Dark Orange
    'set plan': 0x9B59B6,            // Purple
    'create coupon': 0x2ECC71,       // Emerald
    'revoke coupon': 0xE74C3C,       // Red
    'remove account': 0xC0392B,      // Dark Red
    'view ip': 0x95A5A6,             // Gray
    'code created': 0x2ECC71,        // Emerald
    'code deleted': 0xE74C3C,        // Red
    'remove server expiry': 0x3498DB,// Blue
    'set server expiry': 0xF39C12,   // Orange
    
    // Default
    'default': 0x5865F2              // Discord Blurple
}

/**
 * Get emoji for action type
 */
function getActionEmoji(action) {
    const emojiMap = {
        'signup': '📝',
        'create server': '🚀',
        'created server': '🚀',
        'modify server': '⚙️',
        'buy ram': '💾',
        'buy cpu': '⚡',
        'buy disk': '💿',
        'buy servers': '🖥️',
        'gifted coins': '🎁',
        'resources purchased': '🛒',
        'server renewed': '🔄',
        'auto-renewal enabled': '✅',
        'auto-renewal disabled': '❌',
        'code redeemed': '🎫',
        'set coins': '💰',
        'add coins': '➕',
        'set resources': '📊',
        'set plan': '📋',
        'create coupon': '🎟️',
        'revoke coupon': '🚫',
        'remove account': '🗑️',
        'view ip': '🔍',
        'code created': '🎟️',
        'code deleted': '🗑️',
        'remove server expiry': '♾️',
        'set server expiry': '⏰'
    }
    return emojiMap[action.toLowerCase()] || '📌'
}

/**
 * Determine if action is admin action
 */
function isAdminAction(action, settings) {
    return settings.logging.actions.admin && settings.logging.actions.admin[action]
}

/**
 * Parse message to extract username if present
 */
function extractUsername(message) {
    const match = message.match(/^([^#\s]+)#(\d+)/)
    return match ? match[1] : null
}

/**
 * Log an action to a Discord webhook with enhanced embeds.
 * @param {string} action 
 * @param {string} message 
 * @param {Object} metadata - Optional metadata for enhanced display
 */
module.exports = (action, message, metadata = {}) => {
    // Reload settings on every call to avoid caching issues
    const settings = getSettings()
    
    console.log(`[Logging] Called with action: "${action}"`)
    
    if (!settings.logging.status) {
        console.log('[Logging] Logging is disabled in settings')
        return
    }
    
    // Normalize action name to lowercase for comparison
    const normalizedAction = action.toLowerCase()
    const userActions = Object.keys(settings.logging.actions.user).reduce((acc, key) => {
        acc[key.toLowerCase()] = settings.logging.actions.user[key]
        return acc
    }, {})
    const adminActions = Object.keys(settings.logging.actions.admin).reduce((acc, key) => {
        acc[key.toLowerCase()] = settings.logging.actions.admin[key]
        return acc
    }, {})
    
    if (!userActions[normalizedAction] && !adminActions[normalizedAction]) {
        console.log(`[Logging] Action "${action}" is not enabled in settings`)
        console.log(`[Logging] Available user actions: ${Object.keys(userActions).join(', ')}`)
        console.log(`[Logging] Available admin actions: ${Object.keys(adminActions).join(', ')}`)
        return
    }

    const webhookId = settings.logging.webhookId
    const webhookToken = settings.logging.webhookToken
    
    if (!webhookId || !webhookToken) {
        console.error('[Logging] Webhook ID or Token not configured')
        return
    }

    const webhookUrl = `https://discord.com/api/webhooks/${webhookId}/${webhookToken}`
    
    // Get action details
    const emoji = getActionEmoji(action)
    const color = ACTION_COLORS[action.toLowerCase()] || ACTION_COLORS.default
    const isAdmin = isAdminAction(action, settings)
    const username = extractUsername(message)
    
    // Build the embed
    const embed = {
        color: color,
        author: {
            name: isAdmin ? '🛡️ Admin Action' : '👤 User Action',
            icon_url: 'https://atqr.pages.dev/favicon.png'
        },
        title: `${emoji} ${action.charAt(0).toUpperCase() + action.slice(1)}`,
        description: message,
        fields: [],
        footer: {
            text: `${settings.name || 'Helium'} Logging System`,
            icon_url: 'https://atqr.pages.dev/favicon.png'
        },
        timestamp: new Date().toISOString()
    }
    
    // Add metadata fields if provided
    if (metadata.userId) {
        embed.fields.push({
            name: '🆔 User ID',
            value: `\`${metadata.userId}\``,
            inline: true
        })
    }
    
    if (metadata.amount !== undefined) {
        embed.fields.push({
            name: '💰 Amount',
            value: `\`${metadata.amount}\``,
            inline: true
        })
    }
    
    if (metadata.resourceType) {
        embed.fields.push({
            name: '📦 Resource Type',
            value: `\`${metadata.resourceType}\``,
            inline: true
        })
    }
    
    if (metadata.serverName) {
        embed.fields.push({
            name: '🖥️ Server',
            value: `\`${metadata.serverName}\``,
            inline: false
        })
    }
    
    // Add action type field
    embed.fields.push({
        name: '📍 Action Type',
        value: isAdmin ? '`Admin`' : '`User`',
        inline: true
    })

    fetch(webhookUrl, {
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            embeds: [embed]
        })
    })
    .then(response => {
        if (!response.ok) {
            console.error(`[Logging] Webhook failed with status ${response.status}: ${response.statusText}`)
        }
    })
    .catch(error => {
        console.error('[Logging] Failed to send webhook:', error.message)
    })
}