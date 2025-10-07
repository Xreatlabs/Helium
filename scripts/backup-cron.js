/**
 * Backup Cron Job
 * 
 * This script runs periodically to create automatic database backups
 * based on the configuration in settings.json
 */

const CronJob = require("cron").CronJob;
const chalk = require("chalk");
const BackupManager = require("../managers/BackupManager");

module.exports = function (db, settings) {
  if (!settings.backup || !settings.backup.enabled || !settings.backup.automatic) {
    console.log(chalk.gray("Backup Cron: Automatic backups disabled"));
    return null;
  }

  const backupManager = new BackupManager(db, settings);
  const config = settings.backup;

  // Build cron expression based on schedule type
  let cronExpression;
  const [hours, minutes] = (config.time || "03:00").split(":");

  switch (config.schedule) {
    case "hourly":
      cronExpression = `0 */${config.frequency || 1} * * *`;
      break;

    case "daily":
      cronExpression = `${minutes} ${hours} */${config.frequency || 1} * *`;
      break;

    case "weekly":
      const dayOfWeek = config.dayOfWeek || 0;
      cronExpression = `${minutes} ${hours} * * ${dayOfWeek}`;
      break;

    case "monthly":
      cronExpression = `${minutes} ${hours} 1 */${config.frequency || 1} *`;
      break;

    default:
      console.log(chalk.yellow(`Backup Cron: Unknown schedule type '${config.schedule}', defaulting to daily`));
      cronExpression = `${minutes} ${hours} * * *`;
  }

  // Create and start the cron job
  const job = new CronJob(
    cronExpression,
    async function () {
      try {
        console.log(chalk.blue("Backup Cron: Running scheduled backup..."));
        
        const result = await backupManager.createBackup();
        
        if (result.success) {
          console.log(chalk.green("Backup Cron: Scheduled backup completed successfully"));
          
          // Get stats
          const stats = await backupManager.getStats();
          console.log(chalk.gray(`  Total backups: ${stats.totalBackups}`));
          console.log(chalk.gray(`  Total size: ${stats.totalSizeMB} MB`));
        } else {
          console.error(chalk.red("Backup Cron: Scheduled backup failed:"), result.error);
        }
      } catch (error) {
        console.error(chalk.red("Backup Cron: Fatal error during backup:"), error);
      }
    },
    null,
    true,
    settings.timezone || "UTC"
  );

  // Log backup schedule
  const scheduleDesc = getScheduleDescription(config);
  console.log(chalk.green(`Backup Cron: Automatic backups enabled - ${scheduleDesc}`));
  console.log(chalk.gray(`  Cron expression: ${cronExpression}`));
  console.log(chalk.gray(`  Backup path: ${config.path || './backups'}`));
  console.log(chalk.gray(`  Max backups: ${config.maxBackups || 10}`));

  return job;
};

function getScheduleDescription(config) {
  const frequency = config.frequency || 1;
  const time = config.time || "03:00";

  switch (config.schedule) {
    case "hourly":
      if (frequency === 1) {
        return "every hour";
      } else {
        return `every ${frequency} hours`;
      }

    case "daily":
      if (frequency === 1) {
        return `daily at ${time}`;
      } else {
        return `every ${frequency} days at ${time}`;
      }

    case "weekly":
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const day = days[config.dayOfWeek || 0];
      return `weekly on ${day} at ${time}`;

    case "monthly":
      if (frequency === 1) {
        return `monthly on the 1st at ${time}`;
      } else {
        return `every ${frequency} months on the 1st at ${time}`;
      }

    default:
      return `daily at ${time}`;
  }
}
