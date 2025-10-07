/**
 * Backup Manager
 * 
 * Handles database backups, restoration, and automatic backup scheduling
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class BackupManager {
  constructor(db, settings) {
    this.db = db;
    this.settings = settings;
    this.backupConfig = settings.backup || {};
    this.backupPath = path.resolve(this.backupConfig.path || './backups');
    
    // Create backup directory if it doesn't exist
    this.ensureBackupDirectory();
  }

  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupPath)) {
      fs.mkdirSync(this.backupPath, { recursive: true });
      console.log(chalk.green(`Backup Manager: Created backup directory at ${this.backupPath}`));
    }
  }

  /**
   * Create a backup of the database
   * @param {string} name - Optional custom name for the backup
   * @returns {Promise<Object>} Backup information
   */
  async createBackup(name = null) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = name || `backup-${timestamp}`;
      const backupFile = path.join(this.backupPath, `${backupName}.sqlite`);
      const metadataFile = path.join(this.backupPath, `${backupName}.json`);

      console.log(chalk.blue(`Backup Manager: Creating backup '${backupName}'...`));

      // Get database file path
      const dbPath = this.settings.database.replace('sqlite://', '');
      const sourcePath = path.resolve(dbPath);

      // Verify source database exists
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Database file not found at ${sourcePath}`);
      }

      // Copy database file
      fs.copyFileSync(sourcePath, backupFile);

      // Create metadata
      const metadata = {
        name: backupName,
        timestamp: new Date().toISOString(),
        size: fs.statSync(backupFile).size,
        databasePath: dbPath,
        version: this.settings.version || '1.0.0',
        includesSettings: this.backupConfig.includeSettings || false,
      };

      // Optionally backup settings.json
      if (this.backupConfig.includeSettings) {
        const settingsBackupFile = path.join(this.backupPath, `${backupName}-settings.json`);
        const settingsPath = path.resolve('./settings.json');
        
        if (fs.existsSync(settingsPath)) {
          fs.copyFileSync(settingsPath, settingsBackupFile);
          metadata.includesSettings = true;
          metadata.settingsSize = fs.statSync(settingsBackupFile).size;
        }
      }

      // Save metadata
      fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));

      console.log(chalk.green(`Backup Manager: Backup created successfully - ${backupName}`));
      console.log(chalk.gray(`  Size: ${(metadata.size / 1024).toFixed(2)} KB`));

      // Clean up old backups
      await this.cleanupOldBackups();

      return {
        success: true,
        backup: metadata,
      };
    } catch (error) {
      console.error(chalk.red('Backup Manager: Error creating backup:'), error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Restore database from a backup
   * @param {string} backupName - Name of the backup to restore
   * @returns {Promise<Object>} Restoration result
   */
  async restoreBackup(backupName) {
    try {
      const backupFile = path.join(this.backupPath, `${backupName}.sqlite`);
      const metadataFile = path.join(this.backupPath, `${backupName}.json`);

      console.log(chalk.blue(`Backup Manager: Restoring backup '${backupName}'...`));

      // Verify backup exists
      if (!fs.existsSync(backupFile)) {
        throw new Error(`Backup file not found: ${backupName}`);
      }

      // Read metadata
      let metadata = {};
      if (fs.existsSync(metadataFile)) {
        metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
      }

      // Create a backup of current database before restoring
      console.log(chalk.yellow('Backup Manager: Creating safety backup before restore...'));
      await this.createBackup('pre-restore-safety-backup');

      // Get database file path
      const dbPath = this.settings.database.replace('sqlite://', '');
      const targetPath = path.resolve(dbPath);

      // Restore database file
      fs.copyFileSync(backupFile, targetPath);

      // Optionally restore settings.json
      if (metadata.includesSettings) {
        const settingsBackupFile = path.join(this.backupPath, `${backupName}-settings.json`);
        if (fs.existsSync(settingsBackupFile)) {
          const settingsPath = path.resolve('./settings.json');
          
          // Create backup of current settings
          const settingsBackup = path.resolve('./settings.backup.json');
          if (fs.existsSync(settingsPath)) {
            fs.copyFileSync(settingsPath, settingsBackup);
          }
          
          // Restore settings
          fs.copyFileSync(settingsBackupFile, settingsPath);
          console.log(chalk.green('Backup Manager: Settings restored (previous settings saved to settings.backup.json)'));
        }
      }

      console.log(chalk.green(`Backup Manager: Backup restored successfully`));
      console.log(chalk.yellow(`  NOTE: Server restart required for changes to take full effect`));

      return {
        success: true,
        backup: metadata,
        requiresRestart: true,
      };
    } catch (error) {
      console.error(chalk.red('Backup Manager: Error restoring backup:'), error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * List all available backups
   * @returns {Promise<Array>} List of backups with metadata
   */
  async listBackups() {
    try {
      const files = fs.readdirSync(this.backupPath);
      const backups = [];

      for (const file of files) {
        if (file.endsWith('.json') && !file.endsWith('-settings.json')) {
          const metadataPath = path.join(this.backupPath, file);
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          
          // Verify database file exists
          const dbFile = file.replace('.json', '.sqlite');
          const dbPath = path.join(this.backupPath, dbFile);
          
          if (fs.existsSync(dbPath)) {
            backups.push(metadata);
          }
        }
      }

      // Sort by timestamp (newest first)
      backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return backups;
    } catch (error) {
      console.error(chalk.red('Backup Manager: Error listing backups:'), error);
      return [];
    }
  }

  /**
   * Delete a specific backup
   * @param {string} backupName - Name of the backup to delete
   * @returns {Promise<Object>} Deletion result
   */
  async deleteBackup(backupName) {
    try {
      const backupFile = path.join(this.backupPath, `${backupName}.sqlite`);
      const metadataFile = path.join(this.backupPath, `${backupName}.json`);
      const settingsFile = path.join(this.backupPath, `${backupName}-settings.json`);

      let deleted = 0;

      if (fs.existsSync(backupFile)) {
        fs.unlinkSync(backupFile);
        deleted++;
      }

      if (fs.existsSync(metadataFile)) {
        fs.unlinkSync(metadataFile);
        deleted++;
      }

      if (fs.existsSync(settingsFile)) {
        fs.unlinkSync(settingsFile);
        deleted++;
      }

      console.log(chalk.green(`Backup Manager: Deleted backup '${backupName}' (${deleted} files)`));

      return {
        success: true,
        filesDeleted: deleted,
      };
    } catch (error) {
      console.error(chalk.red('Backup Manager: Error deleting backup:'), error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Clean up old backups based on maxBackups setting
   * @returns {Promise<void>}
   */
  async cleanupOldBackups() {
    try {
      const maxBackups = this.backupConfig.maxBackups || 10;
      const backups = await this.listBackups();

      if (backups.length > maxBackups) {
        const toDelete = backups.slice(maxBackups);
        
        console.log(chalk.yellow(`Backup Manager: Cleaning up ${toDelete.length} old backups...`));

        for (const backup of toDelete) {
          await this.deleteBackup(backup.name);
        }
      }
    } catch (error) {
      console.error(chalk.red('Backup Manager: Error cleaning up old backups:'), error);
    }
  }

  /**
   * Get backup statistics
   * @returns {Promise<Object>} Backup statistics
   */
  async getStats() {
    try {
      const backups = await this.listBackups();
      let totalSize = 0;

      for (const backup of backups) {
        totalSize += backup.size || 0;
        if (backup.settingsSize) {
          totalSize += backup.settingsSize;
        }
      }

      return {
        totalBackups: backups.length,
        totalSize: totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        oldestBackup: backups.length > 0 ? backups[backups.length - 1] : null,
        newestBackup: backups.length > 0 ? backups[0] : null,
        backupPath: this.backupPath,
      };
    } catch (error) {
      console.error(chalk.red('Backup Manager: Error getting stats:'), error);
      return {
        totalBackups: 0,
        totalSize: 0,
        error: error.message,
      };
    }
  }
}

module.exports = BackupManager;
