document.addEventListener('DOMContentLoaded', function() {
  // Load saved options
  loadOptions();
  
  // Attach event listeners
  document.getElementById('saveOptions').addEventListener('click', saveOptions);
  document.getElementById('clearAllData').addEventListener('click', clearAllData);
  document.getElementById('exportData').addEventListener('click', exportData);
  document.getElementById('importData').addEventListener('click', importData);
});

// Load saved options from storage
function loadOptions() {
  chrome.storage.sync.get({
    autoSaveEnabled: false,
    excludePasswords: true,
    saveHiddenFields: false,
    showNotifications: true,
    notificationTimeout: 5
  }, function(items) {
    document.getElementById('autoSaveEnabled').checked = items.autoSaveEnabled;
    document.getElementById('excludePasswords').checked = items.excludePasswords;
    document.getElementById('saveHiddenFields').checked = items.saveHiddenFields;
    document.getElementById('showNotifications').checked = items.showNotifications;
    document.getElementById('notificationTimeout').value = items.notificationTimeout;
  });
}

// Save options to storage
function saveOptions() {
  const options = {
    autoSaveEnabled: document.getElementById('autoSaveEnabled').checked,
    excludePasswords: document.getElementById('excludePasswords').checked,
    saveHiddenFields: document.getElementById('saveHiddenFields').checked,
    showNotifications: document.getElementById('showNotifications').checked,
    notificationTimeout: parseInt(document.getElementById('notificationTimeout').value) || 5
  };
  
  chrome.storage.sync.set(options, function() {
    showStatus('设置已保存', 'success');
  });
}

// Clear all saved form data
function clearAllData() {
  if (confirm('确定要清除所有保存的表单数据吗？此操作无法撤销。')) {
    chrome.storage.local.clear(function() {
      if (chrome.runtime.lastError) {
        showStatus('清除数据失败: ' + chrome.runtime.lastError.message, 'error');
      } else {
        showStatus('所有保存的数据已清除', 'success');
      }
    });
  }
}

// Export saved data as JSON
function exportData() {
  chrome.storage.local.get(['formData'], function(result) {
    if (chrome.runtime.lastError) {
      showStatus('导出失败: ' + chrome.runtime.lastError.message, 'error');
      return;
    }
    
    const data = result.formData || {};
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'formsaver-data-export.json';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showStatus('数据已导出', 'success');
    }, 100);
  });
}

// Import data from JSON file
function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const importedData = JSON.parse(e.target.result);
        
        // Validate the imported data structure
        if (typeof importedData !== 'object') {
          throw new Error('Invalid data format');
        }
        
        // Confirm overwrite
        if (confirm('导入新数据将覆盖现有数据，确定继续吗？')) {
          chrome.storage.local.set({ formData: importedData }, function() {
            if (chrome.runtime.lastError) {
              showStatus('导入失败: ' + chrome.runtime.lastError.message, 'error');
            } else {
              showStatus('数据导入成功', 'success');
            }
          });
        }
      } catch (error) {
        showStatus('导入失败: 文件格式无效', 'error');
      }
    };
    reader.readAsText(file);
  };
  
  input.click();
}

// Show status message
function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
  
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
}