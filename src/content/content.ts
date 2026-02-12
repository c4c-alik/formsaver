import { Message } from './types';
import { FormCollector } from './formCollector';
import { FormRestorer } from './formRestorer';
import { StorageManager } from './storageManager';
import { showNotification } from '../composables/notify';

console.log('FormSaver content script loaded', 'Extension ID:', chrome.runtime.id);

/**
 * Initialize after page load completes
 */
document.addEventListener('DOMContentLoaded', () => {
  // Can add page-specific initialization logic here
  console.log('FormSaver content script loaded', 'Extension ID:', chrome.runtime.id);
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
    showNotification(`Error checking saved forms: ${(error as Error).message}`, 'error');
  }
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener(async (message: Message, sender, sendResponse) => {
  console.log('Received message from background script:', message);
  await handleMessage(message, sender, sendResponse);
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
    } else {
      showNotification('Restore failed: Restore operation failed', 'error');
    }
  } catch (error) {
    console.error('Failed to restore form:', error);
    showNotification(`Restore failed: ${(error as Error).message}`, 'error');
  }
}
