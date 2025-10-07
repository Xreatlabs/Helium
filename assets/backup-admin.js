/**
 * Backup Management Admin UI
 */

// Load backups on page load
document.addEventListener('DOMContentLoaded', function() {
  // Check if we're on the settings page and backup tab exists
  if (document.getElementById('tab-backup')) {
    loadBackups();
  }
});

async function loadBackups() {
  try {
    const response = await fetch('/admin/backups/list');
    const data = await response.json();

    if (data.success) {
      displayBackups(data.backups, data.stats, data.config);
    } else {
      showError('Failed to load backups');
    }
  } catch (error) {
    console.error('Error loading backups:', error);
    showError('Failed to load backups');
  }
}

function displayBackups(backups, stats, config) {
  // Update stats
  document.getElementById('stat-total').textContent = stats.totalBackups || 0;
  document.getElementById('stat-size').textContent = stats.totalSizeMB || '0' + ' MB';
  
  if (stats.newestBackup) {
    const date = new Date(stats.newestBackup.timestamp);
    document.getElementById('stat-latest').textContent = date.toLocaleString();
  } else {
    document.getElementById('stat-latest').textContent = 'Never';
  }

  if (config.enabled && config.automatic) {
    document.getElementById('stat-auto').textContent = `Enabled (${config.schedule})`;
  } else {
    document.getElementById('stat-auto').textContent = 'Disabled';
  }

  // Update toggle states
  if (document.getElementById('backup-enabled')) {
    document.getElementById('backup-enabled').checked = config.enabled || false;
  }
  if (document.getElementById('backup-automatic')) {
    document.getElementById('backup-automatic').checked = config.automatic || false;
  }

  // Display backup list
  const listContainer = document.getElementById('backups-list');
  
  if (!backups || backups.length === 0) {
    listContainer.innerHTML = `
      <div class="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4">
          <path fill-rule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 0 1 3.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 0 1 3.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 0 1-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875Zm5.845 17.03a.75.75 0 0 0 1.06 0l3-3a.75.75 0 1 0-1.06-1.06l-1.72 1.72V12a.75.75 0 0 0-1.5 0v4.19l-1.72-1.72a.75.75 0 0 0-1.06 1.06l3 3Z" clip-rule="evenodd" />
          <path d="M14.25 5.25a5.23 5.23 0 0 0-1.279-3.434 9.768 9.768 0 0 1 6.963 6.963A5.23 5.23 0 0 0 16.5 7.5h-1.875a.375.375 0 0 1-.375-.375V5.25Z" />
        </svg>
        <p class="text-gray-600 dark:text-gray-400 font-medium">No backups found</p>
        <p class="text-sm text-gray-500 dark:text-gray-500 mt-1">Create your first backup to get started</p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = backups.map(backup => {
    const date = new Date(backup.timestamp);
    const sizeKB = (backup.size / 1024).toFixed(2);
    
    return `
      <div class="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-100 dark:hover:bg-gray-900 transition">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4 flex-1">
            <div class="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-6 h-6 text-blue-600 dark:text-blue-400">
                <path fill-rule="evenodd" d="M1 2.75A.75.75 0 0 1 1.75 2h10.5a.75.75 0 0 1 0 1.5H12v13.75a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1-.75-.75v-2.5a.75.75 0 0 0-.75-.75h-2.5a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1-.75-.75V3.5h-.25A.75.75 0 0 1 1 2.75ZM6 5.25a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 6 5.25Zm.75 2.25a.75.75 0 0 0 0 1.5h.5a.75.75 0 0 0 0-1.5h-.5ZM6 10.75a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75Zm2.75-4.5a.75.75 0 0 0 0 1.5h.5a.75.75 0 0 0 0-1.5h-.5Zm-.75 2.75a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75Zm.75 1.75a.75.75 0 0 0 0 1.5h.5a.75.75 0 0 0 0-1.5h-.5Zm1.75-5a.75.75 0 0 1 .75-.75h6.75a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75h-6.75a.75.75 0 0 1-.75-.75V5.75Zm1.5 1a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5Zm0 2.5a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5Zm0 2.5a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5Zm0 2.5a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5Z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="flex-1">
              <p class="font-medium text-gray-900 dark:text-gray-100">${backup.name}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                <span>${date.toLocaleString()}</span>
                <span class="mx-2">•</span>
                <span>${sizeKB} KB</span>
                ${backup.includesSettings ? '<span class="mx-2">•</span><span class="text-green-600 dark:text-green-400">Includes Settings</span>' : ''}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="downloadBackup('${backup.name}')" class="btn-ripple px-3 py-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium transition flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
              </svg>
              Download
            </button>
            <button onclick="restoreBackup('${backup.name}')" class="btn-ripple px-3 py-2 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium transition flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                <path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clip-rule="evenodd" />
              </svg>
              Restore
            </button>
            <button onclick="deleteBackup('${backup.name}')" class="btn-ripple px-3 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium transition">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function createBackup() {
  const btn = event.target.closest('button');
  const originalText = btn.innerHTML;
  
  btn.disabled = true;
  btn.innerHTML = `
    <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    Creating...
  `;

  try {
    const response = await fetch('/admin/backups/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const data = await response.json();

    if (data.success) {
      alert(`✅ Backup created successfully: ${data.backup.name}`);
      await loadBackups();
    } else {
      alert('❌ Error: ' + data.error);
    }
  } catch (error) {
    alert('❌ Failed to create backup');
    console.error(error);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

async function restoreBackup(backupName) {
  if (!confirm(`⚠️ WARNING: This will restore your database to "${backupName}".\n\nA safety backup will be created first, but you should only proceed if you understand the risks.\n\nServer restart will be required after restoration.\n\nContinue?`)) {
    return;
  }

  try {
    const response = await fetch('/admin/backups/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backupName })
    });

    const data = await response.json();

    if (data.success) {
      alert('✅ Backup restored successfully!\n\n⚠️ Please restart the server for changes to take full effect.');
      await loadBackups();
    } else {
      alert('❌ Error: ' + data.error);
    }
  } catch (error) {
    alert('❌ Failed to restore backup');
    console.error(error);
  }
}

async function deleteBackup(backupName) {
  if (!confirm(`Are you sure you want to delete backup "${backupName}"?\n\nThis action cannot be undone.`)) {
    return;
  }

  try {
    const response = await fetch(`/admin/backups/delete/${backupName}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (data.success) {
      alert('✅ Backup deleted successfully');
      await loadBackups();
    } else {
      alert('❌ Error: ' + data.error);
    }
  } catch (error) {
    alert('❌ Failed to delete backup');
    console.error(error);
  }
}

function downloadBackup(backupName) {
  window.location.href = `/admin/backups/download/${backupName}`;
}

function showError(message) {
  const listContainer = document.getElementById('backups-list');
  listContainer.innerHTML = `
    <div class="text-center py-12 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
      <p class="text-red-600 dark:text-red-400">${message}</p>
    </div>
  `;
}

async function toggleBackupSystem(checkbox) {
  const enabled = checkbox.checked;
  
  // Add loading state
  checkbox.disabled = true;
  const originalParent = checkbox.parentElement;
  const loadingText = document.createElement('span');
  loadingText.className = 'text-xs text-gray-500 dark:text-gray-400 ml-2';
  loadingText.textContent = 'Saving...';
  originalParent.appendChild(loadingText);
  
  try {
    const response = await fetch('/admin/settings/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'backup.enabled',
        value: enabled
      })
    });

    const data = await response.json();

    if (data.success) {
      showNotification(
        'success',
        `Backup system ${enabled ? 'enabled' : 'disabled'}`,
        'Please restart the server for changes to take full effect.'
      );
      await loadBackups();
    } else {
      showNotification('error', 'Failed to update setting', data.error || 'Unknown error');
      checkbox.checked = !enabled; // Revert
    }
  } catch (error) {
    showNotification('error', 'Network error', 'Failed to connect to server');
    console.error('Toggle backup system error:', error);
    checkbox.checked = !enabled; // Revert
  } finally {
    checkbox.disabled = false;
    if (loadingText.parentElement) {
      loadingText.remove();
    }
  }
}

async function toggleAutomaticBackups(checkbox) {
  const enabled = checkbox.checked;
  
  // Add loading state
  checkbox.disabled = true;
  const originalParent = checkbox.parentElement;
  const loadingText = document.createElement('span');
  loadingText.className = 'text-xs text-gray-500 dark:text-gray-400 ml-2';
  loadingText.textContent = 'Saving...';
  originalParent.appendChild(loadingText);
  
  try {
    const response = await fetch('/admin/settings/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'backup.automatic',
        value: enabled
      })
    });

    const data = await response.json();

    if (data.success) {
      showNotification(
        'success',
        `Automatic backups ${enabled ? 'enabled' : 'disabled'}`,
        'Please restart the server for changes to take full effect.'
      );
      await loadBackups();
    } else {
      showNotification('error', 'Failed to update setting', data.error || 'Unknown error');
      checkbox.checked = !enabled; // Revert
    }
  } catch (error) {
    showNotification('error', 'Network error', 'Failed to connect to server');
    console.error('Toggle automatic backups error:', error);
    checkbox.checked = !enabled; // Revert
  } finally {
    checkbox.disabled = false;
    if (loadingText.parentElement) {
      loadingText.remove();
    }
  }
}

function showNotification(type, title, message) {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg border transform transition-all duration-300 ${
    type === 'success' 
      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
  }`;
  
  notification.innerHTML = `
    <div class="flex items-start">
      <div class="flex-shrink-0">
        ${type === 'success' 
          ? '<svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>'
          : '<svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/></svg>'
        }
      </div>
      <div class="ml-3 flex-1">
        <h3 class="text-sm font-medium ${type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}">${title}</h3>
        <p class="mt-1 text-sm ${type === 'success' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}">${message}</p>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" class="ml-3 flex-shrink-0">
        <svg class="h-5 w-5 ${type === 'success' ? 'text-green-400' : 'text-red-400'}" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
      </button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
}
