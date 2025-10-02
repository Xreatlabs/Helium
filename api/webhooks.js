/**
 * Discord Webhooks API
 * CRUD endpoints for webhook management
 * @module webhooks
 */

const sqlite3 = require('sqlite3').verbose();
const settings = require('../settings.json');
const { sendNotification } = require('../lib/discordWebhook');
const { triggerEvent } = require('../lib/eventSystem');
const validUrl = require('valid-url');
const fetch = require('node-fetch');
const appModule = require('../app.js');
const dbGlobal = appModule && appModule.db;

/**
 * Get database connection
 * @private
 */
function getDb() {
  const dbPath = settings.database.replace('sqlite://', '');
  return new sqlite3.Database(dbPath);
}

/**
 * Check if user is admin
 * @private
 */
async function isAdmin(req) {
  // Trust session flag first if present
  if (req.session && req.session.pterodactyl && req.session.pterodactyl.root_admin === true) {
    return true;
  }

  // Fallback to DB flag if available
  try {
    if (dbGlobal && req.session && req.session.userinfo && req.session.userinfo.id) {
      const adminStatus = await dbGlobal.get(`admin-${req.session.userinfo.id}`);
      if (adminStatus === 1 || adminStatus === true || adminStatus === '1' || adminStatus === 'true') {
        return true;
      }
    }
  } catch (_) {}

  if (!req.session || !req.session.pterodactyl || !req.session.pterodactyl.id) return false;

  try {
    const cacheaccount = await fetch(
      `${settings.pterodactyl.domain}/api/application/users/${req.session.pterodactyl.id}?include=servers`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.pterodactyl.key}`,
          'Accept': 'application/json'
        },
      }
    );

    if (!cacheaccount.ok) return false;
    const cacheaccountinfo = await cacheaccount.json();
    return cacheaccountinfo.attributes?.root_admin === true;
  } catch (e) {
    console.error('Admin check failed:', e?.message || e);
    return false;
  }
}

module.exports.load = async function (app, db) {
  
  /**
   * GET /api/webhooks - List all webhooks
   */
  app.get('/api/webhooks', async (req, res) => {
    if (!(await isAdmin(req))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const dbConn = getDb();
    
    dbConn.all('SELECT * FROM discord_webhooks ORDER BY created_at DESC', (err, rows) => {
      if (err) {
        console.error('Error fetching webhooks:', err);
        dbConn.close();
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Parse event_types JSON
      const webhooks = rows.map(row => ({
        ...row,
        event_types: JSON.parse(row.event_types),
        enabled: row.enabled === 1,
      }));
      
      dbConn.close();
      res.json({ webhooks });
    });
  });

  /**
   * GET /api/webhooks/:id - Get single webhook
   */
  app.get('/api/webhooks/:id', async (req, res) => {
    if (!(await isAdmin(req))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const dbConn = getDb();
    
    dbConn.get('SELECT * FROM discord_webhooks WHERE id = ?', [req.params.id], (err, row) => {
      if (err) {
        console.error('Error fetching webhook:', err);
        dbConn.close();
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!row) {
        dbConn.close();
        return res.status(404).json({ error: 'Webhook not found' });
      }
      
      const webhook = {
        ...row,
        event_types: JSON.parse(row.event_types),
        enabled: row.enabled === 1,
      };
      
      dbConn.close();
      res.json({ webhook });
    });
  });

  /**
   * POST /api/webhooks - Create new webhook
   */
  app.post('/api/webhooks', async (req, res) => {
    if (!(await isAdmin(req))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { name, webhook_url, server_id, event_types, enabled } = req.body;

    // Validation
    if (!name || !webhook_url || !event_types) {
      return res.status(400).json({ error: 'Missing required fields: name, webhook_url, event_types' });
    }

    if (!validUrl.isWebUri(webhook_url) || !webhook_url.includes('discord.com/api/webhooks/')) {
      return res.status(400).json({ error: 'Invalid Discord webhook URL' });
    }

    if (!Array.isArray(event_types) || event_types.length === 0) {
      return res.status(400).json({ error: 'event_types must be a non-empty array' });
    }

    const dbConn = getDb();
    
    const query = `
      INSERT INTO discord_webhooks (name, webhook_url, server_id, event_types, enabled)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const params = [
      name,
      webhook_url,
      server_id || null,
      JSON.stringify(event_types),
      enabled !== undefined ? (enabled ? 1 : 0) : 1,
    ];

    dbConn.run(query, params, function(err) {
      if (err) {
        console.error('Error creating webhook:', err);
        dbConn.close();
        return res.status(500).json({ error: 'Database error' });
      }
      
      const insertedId = this.lastID;
      
      dbConn.get('SELECT * FROM discord_webhooks WHERE id = ?', [insertedId], (err, row) => {
        if (err) {
          console.error('Error fetching created webhook:', err);
          dbConn.close();
          return res.status(500).json({ error: 'Database error' });
        }
        
        const webhook = {
          ...row,
          event_types: JSON.parse(row.event_types),
          enabled: row.enabled === 1,
        };
        
        dbConn.close();
        res.status(201).json({ webhook });
      });
    });
  });

  /**
   * PUT /api/webhooks/:id - Update webhook
   */
  app.put('/api/webhooks/:id', async (req, res) => {
    if (!(await isAdmin(req))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { name, webhook_url, server_id, event_types, enabled } = req.body;

    // Validation
    if (webhook_url && (!validUrl.isWebUri(webhook_url) || !webhook_url.includes('discord.com/api/webhooks/'))) {
      return res.status(400).json({ error: 'Invalid Discord webhook URL' });
    }

    if (event_types && (!Array.isArray(event_types) || event_types.length === 0)) {
      return res.status(400).json({ error: 'event_types must be a non-empty array' });
    }

    const dbConn = getDb();
    
    const updates = [];
    const params = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (webhook_url !== undefined) {
      updates.push('webhook_url = ?');
      params.push(webhook_url);
    }
    if (server_id !== undefined) {
      updates.push('server_id = ?');
      params.push(server_id);
    }
    if (event_types !== undefined) {
      updates.push('event_types = ?');
      params.push(JSON.stringify(event_types));
    }
    if (enabled !== undefined) {
      updates.push('enabled = ?');
      params.push(enabled ? 1 : 0);
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);

    const query = `UPDATE discord_webhooks SET ${updates.join(', ')} WHERE id = ?`;

    dbConn.run(query, params, function(err) {
      if (err) {
        console.error('Error updating webhook:', err);
        dbConn.close();
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (this.changes === 0) {
        dbConn.close();
        return res.status(404).json({ error: 'Webhook not found' });
      }
      
      dbConn.get('SELECT * FROM discord_webhooks WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
          console.error('Error fetching updated webhook:', err);
          dbConn.close();
          return res.status(500).json({ error: 'Database error' });
        }
        
        const webhook = {
          ...row,
          event_types: JSON.parse(row.event_types),
          enabled: row.enabled === 1,
        };
        
        dbConn.close();
        res.json({ webhook });
      });
    });
  });

  /**
   * DELETE /api/webhooks/:id - Delete webhook
   */
  app.delete('/api/webhooks/:id', async (req, res) => {
    if (!(await isAdmin(req))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const dbConn = getDb();
    
    dbConn.run('DELETE FROM discord_webhooks WHERE id = ?', [req.params.id], function(err) {
      if (err) {
        console.error('Error deleting webhook:', err);
        dbConn.close();
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (this.changes === 0) {
        dbConn.close();
        return res.status(404).json({ error: 'Webhook not found' });
      }
      
      dbConn.close();
      res.json({ message: 'Webhook deleted successfully' });
    });
  });

  /**
   * POST /api/webhooks/:id/test - Test webhook
   */
  app.post('/api/webhooks/:id/test', async (req, res) => {
    if (!(await isAdmin(req))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const dbConn = getDb();
    
    dbConn.get('SELECT * FROM discord_webhooks WHERE id = ?', [req.params.id], async (err, row) => {
      if (err) {
        console.error('Error fetching webhook:', err);
        dbConn.close();
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!row) {
        dbConn.close();
        return res.status(404).json({ error: 'Webhook not found' });
      }
      
      dbConn.close();
      
      const success = await sendNotification(
        row.webhook_url,
        '✅ Test Notification',
        'This is a test message from Helium. Your webhook is configured correctly!',
        0x57F287
      );
      
      if (success) {
        res.json({ message: 'Test webhook sent successfully' });
      } else {
        res.status(500).json({ error: 'Failed to send test webhook' });
      }
    });
  });

  /**
   * POST /api/ptero/webhook - Receive Pterodactyl panel events
   */
  app.post('/api/ptero/webhook', async (req, res) => {
    const event = req.body;
    
    // Basic validation
    if (!event || !event.event) {
      return res.status(400).json({ error: 'Invalid event payload' });
    }
    
    // Map Pterodactyl events to our event system
    const eventMapping = {
      'server:created': 'server.created',
      'server:deleted': 'server.deleted',
      'server:updated': 'server.modified',
      'server:suspended': 'server.suspended',
      'server:unsuspended': 'server.unsuspended',
    };
    
    const mappedEvent = eventMapping[event.event];
    
    if (mappedEvent) {
      const metadata = {
        serverId: event.server?.id,
        serverName: event.server?.name,
        userId: event.user?.id,
        username: event.user?.username,
      };
      
      await triggerEvent(mappedEvent, metadata);
    }
    
    res.json({ message: 'Event received' });
  });
};
