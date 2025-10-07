/**
 * Discord Bot - Role Sync Example
 * 
 * This example shows how to automatically sync Discord roles with the dashboard
 * and grant rewards when users gain/lose roles (including server boosts!)
 * 
 * Installation:
 * npm install discord.js axios
 */

const { Client, GatewayIntentBits, Events } = require('discord.js');
const axios = require('axios');

// ================================
// CONFIGURATION
// ================================

const CONFIG = {
  // Your Discord bot token
  botToken: process.env.DISCORD_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE',
  
  // Dashboard URL and API key
  dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:19133',
  apiKey: process.env.API_KEY || 'YOUR_API_KEY_HERE',
  
  // Guild ID to monitor
  guildId: process.env.GUILD_ID || '908739989242789908',
};

// ================================
// DISCORD CLIENT SETUP
// ================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ================================
// API CLIENT
// ================================

const api = axios.create({
  baseURL: CONFIG.dashboardUrl,
  headers: {
    'X-API-Key': CONFIG.apiKey,
    'Content-Type': 'application/json',
  },
});

// ================================
// ROLE SYNC FUNCTION
// ================================

async function syncUserRoles(discordId, roleIds, action = 'add') {
  try {
    const response = await api.post('/api/dashboard/roles/sync', {
      discordId: discordId,
      roles: roleIds,
      action: action, // 'add' or 'remove'
    });

    return response.data;
  } catch (error) {
    console.error('❌ Failed to sync roles:', error.response?.data || error.message);
    throw error;
  }
}

// ================================
// EVENT: BOT READY
// ================================

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Bot is ready! Logged in as ${c.user.tag}`);
  console.log(`📡 Monitoring guild: ${CONFIG.guildId}`);
  console.log(`🔗 Dashboard: ${CONFIG.dashboardUrl}`);
});

// ================================
// EVENT: ROLE ADDED/REMOVED
// ================================

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  try {
    // Check for added roles
    const addedRoles = newMember.roles.cache.filter(role => 
      !oldMember.roles.cache.has(role.id)
    );
    
    if (addedRoles.size > 0) {
      console.log(`\n🎉 ${newMember.user.tag} gained ${addedRoles.size} role(s)`);
      
      const roleIds = Array.from(addedRoles.keys());
      const roleNames = Array.from(addedRoles.values()).map(r => r.name);
      
      console.log(`   Roles: ${roleNames.join(', ')}`);
      console.log(`   Syncing to dashboard...`);
      
      const result = await syncUserRoles(newMember.user.id, roleIds, 'add');
      
      if (result.success) {
        console.log(`   ✅ Sync successful!`);
        
        if (result.rewarded) {
          console.log(`   🎁 Rewards granted:`, result.rewards);
          
          // Notify user via DM
          try {
            const rewardsText = Object.entries(result.rewards)
              .filter(([key, value]) => value > 0)
              .map(([key, value]) => {
                const icons = {
                  ram: '🎮',
                  disk: '💾',
                  cpu: '⚡',
                  servers: '🖥️',
                  coins: '🪙'
                };
                return `${icons[key] || '•'} ${key.toUpperCase()}: ${value}`;
              })
              .join('\n');
            
            await newMember.send(
              `🎉 **You received rewards for your role(s)!**\n\n` +
              `${rewardsText}\n\n` +
              `From roles: ${result.roles?.join(', ') || roleNames.join(', ')}`
            );
          } catch (dmError) {
            console.log(`   ⚠️  Could not send DM to user (DMs may be disabled)`);
          }
        } else {
          console.log(`   ℹ️  No rewards configured for these roles`);
        }
      }
    }
    
    // Check for removed roles
    const removedRoles = oldMember.roles.cache.filter(role => 
      !newMember.roles.cache.has(role.id)
    );
    
    if (removedRoles.size > 0) {
      console.log(`\n❌ ${newMember.user.tag} lost ${removedRoles.size} role(s)`);
      
      const roleIds = Array.from(removedRoles.keys());
      const roleNames = Array.from(removedRoles.values()).map(r => r.name);
      
      console.log(`   Roles: ${roleNames.join(', ')}`);
      console.log(`   Syncing to dashboard...`);
      
      const result = await syncUserRoles(newMember.user.id, roleIds, 'remove');
      
      if (result.success) {
        console.log(`   ✅ Sync successful!`);
        if (result.rewarded) {
          console.log(`   ⚠️  Rewards removed:`, result.rewards);
        }
      }
    }
    
    // Check for server boost changes
    if (!oldMember.premiumSince && newMember.premiumSince) {
      console.log(`\n🚀 ${newMember.user.tag} started boosting the server!`);
      
      const boosterRole = newMember.guild.roles.premiumSubscriberRole;
      if (boosterRole) {
        console.log(`   Syncing booster role: ${boosterRole.name}`);
        const result = await syncUserRoles(newMember.user.id, [boosterRole.id], 'add');
        
        if (result.success && result.rewarded) {
          console.log(`   ✅ Booster rewards granted!`, result.rewards);
          
          try {
            await newMember.send(
              `🚀 **Thank you for boosting ${newMember.guild.name}!**\n\n` +
              `You've received special rewards on the dashboard! 🎁\n` +
              `Check your account to see your new resources!`
            );
          } catch (dmError) {
            console.log(`   ⚠️  Could not send DM to user`);
          }
        }
      }
    }
    
    // Check if boost was removed
    if (oldMember.premiumSince && !newMember.premiumSince) {
      console.log(`\n💔 ${newMember.user.tag} stopped boosting the server`);
      
      const boosterRole = newMember.guild.roles.premiumSubscriberRole;
      if (boosterRole) {
        await syncUserRoles(newMember.user.id, [boosterRole.id], 'remove');
        console.log(`   ✅ Booster rewards removed`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error handling role update:', error.message);
  }
});

// ================================
// COMMANDS
// ================================

client.on(Events.MessageCreate, async (message) => {
  // Ignore bots
  if (message.author.bot) return;
  
  // !syncmyroles - Sync current user's roles
  if (message.content.toLowerCase() === '!syncmyroles') {
    try {
      const member = message.member;
      const roleIds = member.roles.cache.map(role => role.id);
      
      await message.reply('⏳ Syncing your roles...');
      
      const result = await syncUserRoles(member.user.id, roleIds, 'add');
      
      if (result.success) {
        if (result.rewarded && result.rewards) {
          const rewardsText = Object.entries(result.rewards)
            .filter(([key, value]) => value > 0)
            .map(([key, value]) => {
              const icons = { ram: '🎮', disk: '💾', cpu: '⚡', servers: '🖥️', coins: '🪙' };
              return `${icons[key] || '•'} ${key.toUpperCase()}: ${value}`;
            })
            .join('\n');
          
          await message.reply(
            `✅ **Roles synced successfully!**\n\n` +
            `**Rewards Granted:**\n${rewardsText}\n\n` +
            `From roles: ${result.roles?.join(', ') || 'your configured roles'}`
          );
        } else {
          await message.reply(
            `✅ Roles synced successfully!\n` +
            `ℹ️  No rewards configured for your current roles.`
          );
        }
      } else {
        await message.reply(`❌ Failed to sync roles: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      await message.reply(`❌ Error: ${error.message}`);
    }
  }
  
  // !myroles - Show user's configured roles
  if (message.content.toLowerCase() === '!myroles') {
    try {
      const response = await api.get(`/api/dashboard/roles/user/${message.author.id}`);
      
      if (response.data.success && response.data.data.roles.length > 0) {
        const roles = response.data.data.roles;
        
        let text = `**Your Configured Roles:**\n\n`;
        roles.forEach(role => {
          text += `**${role.role_name}**\n`;
          if (role.rewards_coins > 0) text += `🪙 ${role.rewards_coins} coins\n`;
          if (role.rewards_ram > 0) text += `🎮 ${role.rewards_ram} MB RAM\n`;
          if (role.rewards_disk > 0) text += `💾 ${role.rewards_disk} MB Disk\n`;
          if (role.rewards_cpu > 0) text += `⚡ ${role.rewards_cpu}% CPU\n`;
          if (role.rewards_servers > 0) text += `🖥️ ${role.rewards_servers} servers\n`;
          text += `\n`;
        });
        
        await message.reply(text);
      } else {
        await message.reply(`ℹ️  You don't have any configured roles with rewards yet.`);
      }
    } catch (error) {
      await message.reply(`❌ Error: ${error.message}`);
    }
  }
});

// ================================
// START BOT
// ================================

client.login(CONFIG.botToken);

// ================================
// ERROR HANDLING
// ================================

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

client.on(Events.Error, error => {
  console.error('Discord client error:', error);
});

// ================================
// GRACEFUL SHUTDOWN
// ================================

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down bot...');
  client.destroy();
  process.exit(0);
});
