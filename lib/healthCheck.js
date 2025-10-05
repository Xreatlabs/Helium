const fetch = require('node-fetch');
const os = require('os');
const fs = require('fs');
const settings = require('../settings.json');

/**
 * Health Check Module
 * Monitors system and service health
 */

// Get disk usage
function getDiskUsage() {
  try {
    const stats = fs.statfsSync('/');
    const total = stats.blocks * stats.bsize;
    const free = stats.bfree * stats.bsize;
    const used = total - free;
    const usedPercent = ((used / total) * 100).toFixed(2);
    
    return {
      status: 'healthy',
      total: (total / 1024 / 1024 / 1024).toFixed(2) + ' GB',
      used: (used / 1024 / 1024 / 1024).toFixed(2) + ' GB',
      free: (free / 1024 / 1024 / 1024).toFixed(2) + ' GB',
      usedPercent: parseFloat(usedPercent),
      message: `${usedPercent}% used`
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Failed to check disk usage: ' + error.message
    };
  }
}

// Get memory usage
function getMemoryUsage() {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usedPercent = ((usedMem / totalMem) * 100).toFixed(2);
    
    return {
      status: 'healthy',
      total: (totalMem / 1024 / 1024 / 1024).toFixed(2) + ' GB',
      used: (usedMem / 1024 / 1024 / 1024).toFixed(2) + ' GB',
      free: (freeMem / 1024 / 1024 / 1024).toFixed(2) + ' GB',
      usedPercent: parseFloat(usedPercent),
      message: `${usedPercent}% used`
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Failed to check memory usage: ' + error.message
    };
  }
}

// Check Pterodactyl Panel connection
async function checkPterodactyl() {
  try {
    if (!settings.pterodactyl || !settings.pterodactyl.domain || !settings.pterodactyl.key) {
      return {
        status: 'warning',
        message: 'Pterodactyl not configured'
      };
    }

    const response = await fetch(`${settings.pterodactyl.domain}/api/application/users?per_page=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${settings.pterodactyl.key}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    if (response.ok) {
      return {
        status: 'healthy',
        message: 'Connected',
        responseTime: response.headers.get('x-response-time') || 'N/A'
      };
    } else {
      return {
        status: 'error',
        message: `HTTP ${response.status}: ${response.statusText}`
      };
    }
  } catch (error) {
    return {
      status: 'error',
      message: 'Connection failed: ' + error.message
    };
  }
}

// Check database connection
async function checkDatabase(db) {
  try {
    // Try a simple database operation
    await db.set('health_check_test', Date.now());
    await db.get('health_check_test');
    await db.delete('health_check_test');
    
    return {
      status: 'healthy',
      message: 'Connected'
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Connection failed: ' + error.message
    };
  }
}

// Run all health checks
async function runHealthChecks(db) {
  const config = settings.api?.client?.healthMonitoring;
  
  if (!config || !config.enabled) {
    return {
      enabled: false,
      message: 'Health monitoring is disabled'
    };
  }

  const results = {
    enabled: true,
    timestamp: new Date().toISOString(),
    checks: {}
  };

  // Run enabled checks
  if (config.checks?.pterodactyl) {
    results.checks.pterodactyl = await checkPterodactyl();
  }

  if (config.checks?.database) {
    results.checks.database = await checkDatabase(db);
  }

  if (config.checks?.diskSpace) {
    const disk = getDiskUsage();
    const thresholds = config.thresholds || {};
    
    // Check against thresholds
    if (disk.usedPercent >= (thresholds.diskSpaceCritical || 90)) {
      disk.status = 'critical';
    } else if (disk.usedPercent >= (thresholds.diskSpaceWarning || 80)) {
      disk.status = 'warning';
    }
    
    results.checks.diskSpace = disk;
  }

  if (config.checks?.memory) {
    const memory = getMemoryUsage();
    const thresholds = config.thresholds || {};
    
    // Check against thresholds
    if (memory.usedPercent >= (thresholds.memoryCritical || 90)) {
      memory.status = 'critical';
    } else if (memory.usedPercent >= (thresholds.memoryWarning || 80)) {
      memory.status = 'warning';
    }
    
    results.checks.memory = memory;
  }

  // Determine overall status
  results.overallStatus = 'healthy';
  for (const check of Object.values(results.checks)) {
    if (check.status === 'critical' || check.status === 'error') {
      results.overallStatus = 'critical';
      break;
    } else if (check.status === 'warning') {
      results.overallStatus = 'warning';
    }
  }

  return results;
}

// Send webhook alert
async function sendAlert(title, message, severity = 'warning') {
  const config = settings.api?.client?.healthMonitoring;
  
  if (!config?.alerts?.webhook || !config?.alerts?.webhookUrl) {
    return;
  }

  const colors = {
    healthy: 5763719, // green
    warning: 16776960, // yellow
    critical: 15548997, // red
    error: 15548997 // red
  };

  try {
    await fetch(config.alerts.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: '⚠️ ' + title,
          description: message,
          color: colors[severity] || colors.warning,
          timestamp: new Date().toISOString(),
          footer: {
            text: 'Helium Health Monitoring'
          }
        }]
      })
    });
  } catch (error) {
    console.error('[Health] Failed to send alert webhook:', error);
  }
}

module.exports = {
  runHealthChecks,
  sendAlert,
  checkPterodactyl,
  checkDatabase,
  getDiskUsage,
  getMemoryUsage
};
