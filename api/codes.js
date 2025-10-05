const settings = require("../settings.json");
const fs = require("fs");
const crypto = require("crypto");
const log = require("../misc/log");

async function checkAdmin(req, res, db) {
  if (!req.session || !req.session.userinfo || !req.session.userinfo.id) {
    return false;
  }
  const isRootAdminSession = !!(req.session.pterodactyl && req.session.pterodactyl.root_admin === true);
  if (isRootAdminSession) return true;
  const adminStatus = await db.get(`admin-${req.session.userinfo.id}`);
  return adminStatus === 1 || adminStatus === true || adminStatus === "1" || adminStatus === "true";
}

function generateCode(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

module.exports.load = async function (app, db) {
  
  // Admin: Create a new code
  app.post("/admin/codes/create", async (req, res) => {
    if (!req.session.pterodactyl) return res.status(401).json({ error: "Unauthorized" });
    
    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { coins, ram, disk, cpu, servers, maxUses, maxUsesPerUser, expiresIn, customCode } = req.body;
    
    if (!coins && !ram && !disk && !cpu && !servers) {
      return res.status(400).json({ error: "At least one resource must be specified" });
    }

    const code = customCode && customCode.length > 0 ? customCode.toUpperCase() : generateCode();
    
    const existingCode = await db.get(`code-${code}`);
    if (existingCode) {
      return res.status(400).json({ error: "Code already exists" });
    }

    const codeData = {
      code: code,
      rewards: {
        coins: parseInt(coins) || 0,
        ram: parseInt(ram) || 0,
        disk: parseInt(disk) || 0,
        cpu: parseInt(cpu) || 0,
        servers: parseInt(servers) || 0
      },
      maxUses: parseInt(maxUses) || 999999,
      maxUsesPerUser: parseInt(maxUsesPerUser) || 1,
      uses: 0,
      usedBy: {},
      createdAt: Date.now(),
      createdBy: req.session.userinfo.id,
      expiresAt: expiresIn ? Date.now() + (parseInt(expiresIn) * 24 * 60 * 60 * 1000) : null
    };

    await db.set(`code-${code}`, codeData);
    
    const allCodes = (await db.get('all-codes')) || [];
    allCodes.push(code);
    await db.set('all-codes', allCodes);

    log(
      `code created`,
      `${req.session.userinfo.username} created code ${code} with ${JSON.stringify(codeData.rewards)}`
    );

    res.json({ success: true, code: codeData });
  });

  // Admin: Get all codes
  app.get("/admin/codes/list", async (req, res) => {
    if (!req.session.pterodactyl) return res.status(401).json({ error: "Unauthorized" });
    
    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const allCodes = (await db.get('all-codes')) || [];
    const codes = [];
    
    for (const code of allCodes) {
      const codeData = await db.get(`code-${code}`);
      if (codeData) {
        codes.push(codeData);
      }
    }

    res.json({ codes });
  });

  // Admin: Delete a code
  app.delete("/admin/codes/delete/:code", async (req, res) => {
    if (!req.session.pterodactyl) return res.status(401).json({ error: "Unauthorized" });
    
    if (!(await checkAdmin(req, res, db))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const code = req.params.code.toUpperCase();
    const codeData = await db.get(`code-${code}`);
    
    if (!codeData) {
      return res.status(404).json({ error: "Code not found" });
    }

    await db.delete(`code-${code}`);
    
    const allCodes = (await db.get('all-codes')) || [];
    const updatedCodes = allCodes.filter(c => c !== code);
    await db.set('all-codes', updatedCodes);

    log(
      `code deleted`,
      `${req.session.userinfo.username} deleted code ${code}`
    );

    res.json({ success: true });
  });

  // User: Redeem a code
  app.post("/redeem-code", async (req, res) => {
    if (!req.session.pterodactyl) return res.status(401).json({ error: "Not logged in" });

    const { code } = req.body;
    
    if (!code || code.length === 0) {
      return res.status(400).json({ error: "Code is required" });
    }

    const codeUpper = code.toUpperCase().trim();
    const codeData = await db.get(`code-${codeUpper}`);
    
    if (!codeData) {
      return res.status(404).json({ error: "Invalid code" });
    }

    if (codeData.expiresAt && Date.now() > codeData.expiresAt) {
      return res.status(400).json({ error: "Code has expired" });
    }

    if (codeData.uses >= codeData.maxUses) {
      return res.status(400).json({ error: "Code has reached maximum total uses" });
    }

    const userId = req.session.userinfo.id;
    const userUseCount = codeData.usedBy[userId] || 0;
    
    if (userUseCount >= codeData.maxUsesPerUser) {
      return res.status(400).json({ error: `You have already used this code ${userUseCount} time(s). Maximum uses per user: ${codeData.maxUsesPerUser}` });
    }

    const rewards = codeData.rewards;

    if (rewards.coins > 0) {
      const currentCoins = (await db.get(`coins-${userId}`)) || 0;
      await db.set(`coins-${userId}`, currentCoins + rewards.coins);
    }

    const extra = (await db.get(`extra-${userId}`)) || {
      ram: 0,
      disk: 0,
      cpu: 0,
      servers: 0
    };

    if (rewards.ram > 0) extra.ram += rewards.ram;
    if (rewards.disk > 0) extra.disk += rewards.disk;
    if (rewards.cpu > 0) extra.cpu += rewards.cpu;
    if (rewards.servers > 0) extra.servers += rewards.servers;

    await db.set(`extra-${userId}`, extra);

    codeData.uses += 1;
    codeData.usedBy[userId] = (codeData.usedBy[userId] || 0) + 1;
    await db.set(`code-${codeUpper}`, codeData);

    const rewardsList = [];
    if (rewards.coins > 0) rewardsList.push(`${rewards.coins} coins`);
    if (rewards.ram > 0) rewardsList.push(`${rewards.ram}MB RAM`);
    if (rewards.disk > 0) rewardsList.push(`${rewards.disk}MB Disk`);
    if (rewards.cpu > 0) rewardsList.push(`${rewards.cpu}% CPU`);
    if (rewards.servers > 0) rewardsList.push(`${rewards.servers} server slot(s)`);

    const remainingUses = codeData.maxUsesPerUser - codeData.usedBy[userId];
    const usageInfo = remainingUses > 0 ? ` (${remainingUses} use(s) remaining for you)` : '';

    log(
      `code redeemed`,
      `${req.session.userinfo.username} redeemed code ${codeUpper} and received: ${rewardsList.join(', ')}`
    );

    const { onCoinsAdded } = require('../lib/integrations');
    if (rewards.coins > 0) {
      onCoinsAdded(
        userId,
        req.session.userinfo.username,
        rewards.coins
      ).catch(err => console.error('Webhook error:', err));
    }

    res.json({ 
      success: true, 
      rewards,
      message: `Successfully redeemed! You received: ${rewardsList.join(', ')}${usageInfo}`
    });
  });

  // User: Check code validity (without redeeming)
  app.post("/check-code", async (req, res) => {
    if (!req.session.pterodactyl) return res.status(401).json({ error: "Not logged in" });

    const { code } = req.body;
    
    if (!code || code.length === 0) {
      return res.status(400).json({ error: "Code is required" });
    }

    const codeUpper = code.toUpperCase().trim();
    const codeData = await db.get(`code-${codeUpper}`);
    
    if (!codeData) {
      return res.status(404).json({ error: "Invalid code", valid: false });
    }

    const userId = req.session.userinfo.id;
    const userUseCount = codeData.usedBy[userId] || 0;

    const valid = 
      (!codeData.expiresAt || Date.now() <= codeData.expiresAt) &&
      codeData.uses < codeData.maxUses &&
      userUseCount < codeData.maxUsesPerUser;

    let reason = "";
    if (codeData.expiresAt && Date.now() > codeData.expiresAt) reason = "Code has expired";
    else if (codeData.uses >= codeData.maxUses) reason = "Code has reached maximum total uses";
    else if (userUseCount >= codeData.maxUsesPerUser) reason = `You have already used this code ${userUseCount}/${codeData.maxUsesPerUser} times`;

    res.json({ 
      valid,
      reason: reason || "Code is valid",
      rewards: valid ? codeData.rewards : null,
      usesRemaining: valid ? codeData.maxUsesPerUser - userUseCount : 0
    });
  });
};
