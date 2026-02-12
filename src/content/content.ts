import { Message } from './types';
import { FormCollector } from './formCollector';
import { FormRestorer } from './formRestorer';
import { StorageManager } from './storageManager';

console.log(
  '🎯 Content script injected into page:',
  window.location.href,
  'Extension ID:',
  chrome.runtime.id
);

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true;
});

async function handleMessage(
  message: Message,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) {
  // Basic validation
  if (!message || !message.type) {
    sendResponse({ success: false, error: 'Invalid message format' });
    return;
  }
  try {
    switch (message.type) {
      case 'SAVE_FORM':
        await saveForm();
        sendResponse({ success: true });
        break;

      case 'RESTORE_FORM':
        await restoreForm();
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ success: false, error: 'unknow message type' });
    }
  } catch (error) {
    console.error('Error handling content script message:', error);
    sendResponse({ success: false, error: (error as Error).message });
  }
}

/**
 * Trigger form saving
 */
async function saveForm() {
  try {
    // 显示加载状态
    showNotification('Saving form...', 'info');

    // Directly collect and save form data
    const formData = FormCollector.collectFormData();

    if (!formData) {
      showNotification('No forms found on current page', 'error');
      return;
    }

    // Directly call storage manager to save data
    const success = await StorageManager.saveForm(formData);

    if (success) {
      showNotification('Form saved successfully!', 'success');
      // 可选：发送通知
      chrome.runtime
        .sendMessage({
          type: 'FORM_SAVED',
          data: { formName: formData.name },
        })
        .catch(() => {
          // 忽略通知发送失败
        });
    } else {
      showNotification('Save failed: Storage operation failed', 'error');
    }
  } catch (error) {
    console.error('Failed to save form:', error);
    showNotification(`Save failed: ${(error as Error).message}`, 'error');
  }
}

/**
 * Trigger form restoration
 */
async function restoreForm() {
  try {
    // 显示加载状态
    showNotification('Restoring form...', 'info');

    // Directly get form data from storage
    const formData = await StorageManager.getForm(window.location.href);

    if (!formData) {
      showNotification('No saved form data found', 'error');
      return;
    }

    // Verify if form can be restored on current page
    if (!FormRestorer.canRestoreForm(formData)) {
      showNotification('Cannot restore this form on current page', 'error');
      return;
    }

    // Directly restore form data
    const success = await FormRestorer.restoreFormData(formData);

    if (success) {
      showNotification('Form restored successfully!', 'success');
      // optional: send notification
      chrome.runtime
        .sendMessage({
          type: 'FORM_RESTORED',
          data: { formName: formData.name },
        })
        .catch(() => {
          // ignore notification sending failure
        });
    } else {
      showNotification('Restore failed: Restore operation failed', 'error');
    }
  } catch (error) {
    console.error('Failed to restore form:', error);
    showNotification(`Restore failed: ${(error as Error).message}`, 'error');
  }
}

/**
 * Show in-page notification
 */
function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 4px;
    color: white;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    max-width: 300px;
    word-wrap: break-word;
  `;

  // Set styles based on type
  switch (type) {
    case 'success':
      notification.style.backgroundColor = '#4CAF50';
      break;
    case 'error':
      notification.style.backgroundColor = '#f44336';
      break;
    case 'info':
      notification.style.backgroundColor = '#2196F3';
      break;
  }

  notification.textContent = message;

  // Add to page
  document.body.appendChild(notification);

  // Auto remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

/**
 * Initialize after page load completes
 */
document.addEventListener('DOMContentLoaded', () => {
  // Can add page-specific initialization logic here
  console.log('FormSaver content script loaded');
});

// Check for saved forms after page fully loads
window.addEventListener('load', async () => {
  try {
    // Check if current page has saved forms
    const response = await chrome.runtime.sendMessage({
      type: 'GET_SAVED_FORMS',
    });

    if (response?.success && response.forms) {
      const currentUrlForms = response.forms.filter(
        (form: any) => form.url === window.location.href
      );

      if (currentUrlForms.length > 0) {
        // Can show a small hint to inform user about restorable forms
        console.log(`Found ${currentUrlForms.length} restorable forms`);
      }
    }
  } catch (error) {
    console.error('Error checking saved forms:', error);
  }
});

// Listen for keyboard shortcuts (optional feature)
document.addEventListener('keydown', event => {
  // Ctrl+Shift+S Save form
  if (event.ctrlKey && event.shiftKey && event.key === 'S') {
    event.preventDefault();
    saveForm();
  }

  // Ctrl+Shift+R Restore form
  if (event.ctrlKey && event.shiftKey && event.key === 'R') {
    event.preventDefault();
    restoreForm();
  }
});
