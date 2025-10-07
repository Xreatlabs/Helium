const fetch = require('node-fetch');
const os = require('os');
const fs = require('fs');
const settings = require('../settings.json');

/**
 * Health Check Module
 * Monitors system and service health
 */

// Store last check results for comparison
let lastCheckResults = {};
let healthHistory = [];
const MAX_HISTORY = 100;
const processStartTime = Date.now();

// Get disk usage
function getDiskUsage() {
  try {
    // Try native statfsSync first (Linux)
    if (fs.statfsSync) {
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
        totalBytes: total,
        usedBytes: used,
        freeBytes: free,
        usedPercent: parseFloat(usedPercent),
        message: `${usedPercent}% used`
      };
    } else {
      // Fallback: not supported on this platform
      return {
        status: 'warning',
        message: 'Disk monitoring not supported on this platform'
      };
    }
  } catch (error) {
    return {
      status: 'error',
      message: 'Failed to check disk usage: ' + error.message,
      details: error.stack
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
      totalBytes: totalMem,
      usedBytes: usedMem,
      freeBytes: freeMem,
      usedPercent: parseFloat(usedPercent),
      message: `${usedPercent}% used`
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Failed to check memory usage: ' + error.message,
      details: error.stack
    };
  }
}

// Get CPU usage
function getCPUUsage() {
  try {
    const cpus = os.cpus();
    const numCPUs = cpus.length;
    
    // Calculate average CPU usage
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    const idle = totalIdle / numCPUs;
    const total = totalTick / numCPUs;
    const usedPercent = (100 - ~~(100 * idle / total)).toFixed(2);
    
    return {
      status: 'healthy',
      cores: numCPUs,
      model: cpus[0].model,
      speed: `${cpus[0].speed} MHz`,
      usedPercent: parseFloat(usedPercent),
      message: `${usedPercent}% used (${numCPUs} cores)`
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Failed to check CPU usage: ' + error.message,
      details: error.stack
    };
  }
}

// Get system uptime
function getUptime() {
  try {
    const systemUptime = os.uptime();
    const processUptime = (Date.now() - processStartTime) / 1000;
    
    const formatUptime = (seconds) => {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      
      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      
      return parts.join(' ') || '< 1m';
    };
    
    return {
      status: 'healthy',
      systemUptime: formatUptime(systemUptime),
      processUptime: formatUptime(processUptime),
      systemUptimeSeconds: systemUptime,
      processUptimeSeconds: processUptime,
      message: `System: ${formatUptime(systemUptime)}, Process: ${formatUptime(processUptime)}`
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Failed to check uptime: ' + error.message,
      details: error.stack
    };
  }
}

// Check Pterodactyl Panel connection
async function checkPterodactyl() {
  const startTime = Date.now();
  
  try {
    if (!settings.pterodactyl || !settings.pterodactyl.domain || !settings.pterodactyl.key) {
      return {
        status: 'warning',
        message: 'Pterodactyl not configured',
        responseTime: 'N/A'
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${settings.pterodactyl.domain}/api/application/users?per_page=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${settings.pterodactyl.key}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);
    const responseTime = Date.now() - startTime;

    if (response.ok) {
      const data = await response.json();
      return {
        status: 'healthy',
        message: 'Connected',
        responseTime: `${responseTime}ms`,
        responseTimeMs: responseTime,
        panelVersion: response.headers.get('x-pterodactyl-version') || 'Unknown',
        userCount: data.meta?.pagination?.total || 'N/A'
      };
    } else {
      const errorText = await response.text().catch(() => 'Unable to read error');
      return {
        status: 'error',
        message: `HTTP ${response.status}: ${response.statusText}`,
        responseTime: `${responseTime}ms`,
        details: errorText
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    if (error.name === 'AbortError') {
      return {
        status: 'error',
        message: 'Connection timeout (>10s)',
        responseTime: `${responseTime}ms`,
        details: 'The panel did not respond within 10 seconds'
      };
    }
    
    return {
      status: 'error',
      message: 'Connection failed: ' + error.message,
      responseTime: `${responseTime}ms`,
      details: error.stack
    };
  }
}

// Check database connection
async function checkDatabase(db) {
  const startTime = Date.now();
  
  try {
    const testKey = 'health_check_test_' + Date.now();
    const testValue = Date.now();
    
    // Write test
    await db.set(testKey, testValue);
    
    // Read test
    const readValue = await db.get(testKey);
    
    // Delete test
    await db.delete(testKey);
    
    const responseTime = Date.now() - startTime;
    
    // Verify read matches write
    if (readValue !== testValue) {
      return {
        status: 'error',
        message: 'Data integrity check failed',
        responseTime: `${responseTime}ms`,
        details: 'Read value does not match written value'
      };
    }
    
    return {
      status: 'healthy',
      message: 'Connected and operational',
      responseTime: `${responseTime}ms`,
      responseTimeMs: responseTime
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      status: 'error',
      message: 'Connection failed: ' + error.message,
      responseTime: `${responseTime}ms`,
      details: error.stack
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
    checks: {},
    system: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version
    }
  };

  // Run enabled checks in parallel for better performance
  const checkPromises = [];

  if (config.checks?.pterodactyl) {
    checkPromises.push(
      checkPterodactyl().then(result => {
        results.checks.pterodactyl = result;
      })
    );
  }

  if (config.checks?.database) {
    checkPromises.push(
      checkDatabase(db).then(result => {
        results.checks.database = result;
      })
    );
  }

  // Wait for async checks
  await Promise.all(checkPromises);

  // Run synchronous checks
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

  if (config.checks?.cpu) {
    const cpu = getCPUUsage();
    const thresholds = config.thresholds || {};
    
    // Check against thresholds
    if (cpu.usedPercent >= (thresholds.cpuCritical || 90)) {
      cpu.status = 'critical';
    } else if (cpu.usedPercent >= (thresholds.cpuWarning || 80)) {
      cpu.status = 'warning';
    }
    
    results.checks.cpu = cpu;
  }

  if (config.checks?.uptime) {
    results.checks.uptime = getUptime();
  }

  // Determine overall status
  results.overallStatus = 'healthy';
  let criticalCount = 0;
  let warningCount = 0;
  let errorCount = 0;
  
  for (const check of Object.values(results.checks)) {
    if (check.status === 'critical') {
      criticalCount++;
      results.overallStatus = 'critical';
    } else if (check.status === 'error') {
      errorCount++;
      if (results.overallStatus !== 'critical') {
        results.overallStatus = 'error';
      }
    } else if (check.status === 'warning') {
      warningCount++;
      if (results.overallStatus === 'healthy') {
        results.overallStatus = 'warning';
      }
    }
  }

  results.summary = {
    total: Object.keys(results.checks).length,
    healthy: Object.values(results.checks).filter(c => c.status === 'healthy').length,
    warning: warningCount,
    critical: criticalCount,
    error: errorCount
  };

  // Check for status changes and send alerts
  checkForAlerts(results);

  // Store in history
  healthHistory.unshift({
    timestamp: results.timestamp,
    overallStatus: results.overallStatus,
    summary: results.summary
  });

  // Keep only last MAX_HISTORY entries
  if (healthHistory.length > MAX_HISTORY) {
    healthHistory = healthHistory.slice(0, MAX_HISTORY);
  }

  lastCheckResults = results;

  return results;
}

// Check for status changes and send alerts
async function checkForAlerts(currentResults) {
  const config = settings.api?.client?.healthMonitoring;
  
  if (!config?.alerts?.webhook || !config?.alerts?.webhookUrl) {
    return;
  }

  // Only alert on status changes or critical/error states
  for (const [checkName, checkResult] of Object.entries(currentResults.checks)) {
    const lastResult = lastCheckResults.checks?.[checkName];
    
    // Alert on new errors/critical or status degradation
    if (checkResult.status === 'critical' || checkResult.status === 'error') {
      if (!lastResult || lastResult.status !== checkResult.status) {
        await sendAlert(
          `Health Check Alert: ${checkName}`,
          `**Status:** ${checkResult.status.toUpperCase()}\n**Message:** ${checkResult.message}\n${checkResult.details ? `**Details:** ${checkResult.details.substring(0, 200)}` : ''}`,
          checkResult.status
        );
      }
    }
    
    // Alert on recovery
    if (checkResult.status === 'healthy' && lastResult && lastResult.status !== 'healthy') {
      await sendAlert(
        `Health Check Recovered: ${checkName}`,
        `**Status:** HEALTHY\n**Message:** ${checkResult.message}`,
        'healthy'
      );
    }
  }
}

// Get health history
function getHealthHistory() {
  return healthHistory;
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
  getMemoryUsage,
  getCPUUsage,
  getUptime,
  getHealthHistory
};
