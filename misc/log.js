const settings = require('../settings.json')
const fetch = require('node-fetch')

/**
 * Log an action to a Discord webhook.
 * @param {string} action 
 * @param {string} message 
 */
module.exports = (action, message) => {
    if (!settings.logging.status) return
    if (!settings.logging.actions.user[action] && !settings.logging.actions.admin[action]) return

    const webhookId = settings.logging.webhookId
    const webhookToken = settings.logging.webhookToken
    
    if (!webhookId || !webhookToken) {
        console.error('[Logging] Webhook ID or Token not configured')
        return
    }

    const webhookUrl = `https://discord.com/api/webhooks/${webhookId}/${webhookToken}`

    fetch(webhookUrl, {
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            embeds: [
                {
                    color: hexToDecimal('#FFFFFF'),
                    title: `Event: \`${action}\``,
                    description: message,
                    author: {
                        name: 'Helium Logging'
                    },
                    thumbnail: {
                        url: 'https://atqr.pages.dev/favicon.png'
                    }
                }
            ]
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

function hexToDecimal(hex) {
    return parseInt(hex.replace("#", ""), 16)
}