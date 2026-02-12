import { Message } from '../content/types';
import { StorageManager } from '../content/storageManager';

// Extension notification function - for background context only
function showExtensionNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
  // Only show extension-level notifications for actual extension errors
  // Page-level notifications should be handled in content scripts
  if (type === 'error') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icon48.png',
      title: 'FormSaver Error',
      message: message,
    });
  }
  // For success/info messages, rely on content script notifications
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true;
});

// Initialize when extension is installed
chrome.runtime.onInstalled.addListener(async () => {
  console.log('FormSaver extension installed');

  // Create context menu
  await createContextMenu();

  // Migrate old data
  await StorageManager.migrateData();
});

// Context menu click handlers
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;

  switch (info.menuItemId) {
    case 'save-form':
      // Directly inject and execute save functionality
      chrome.scripting
        .executeScript({
          target: { tabId: tab.id },
          func: saveFormDirect,
        })
        .catch(error => {
          console.error('Failed to execute save form:', error);
          // Use unified notification method for critical errors
          showExtensionNotification('Cannot save form: page may not support or loading', 'error');
        });
      break;
    case 'restore-form':
      // Directly inject and execute restore functionality
      chrome.scripting
        .executeScript({
          target: { tabId: tab.id },
          func: restoreFormDirect,
        })
        .catch(error => {
          console.error('Failed to execute restore form:', error);
          // Use unified notification method for critical errors
          showExtensionNotification(
            'Cannot restore form: page may not support or loading',
            'error'
          );
        });
      break;
    case 'manage-forms':
      chrome.runtime.openOptionsPage();
      break;
  }
});

// Check for saved forms when tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      // Check if there are saved forms for this URL
      const savedForm = await StorageManager.getForm(tab.url);
      if (savedForm) {
        // Can show page hint or badge here
        chrome.action.setBadgeText({
          text: '💾',
          tabId: tabId,
        });
      }
    } catch (error) {
      console.error('Error checking saved forms:', error);
      // Use unified notification method
      showExtensionNotification(`Error checking saved forms: ${(error as Error).message}`, 'error');
    }
  }
});

async function handleMessage(
  message: Message,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) {
  try {
    switch (message.type) {
      case 'GET_SAVED_FORMS':
        await handleGetSavedForms(message, sender, sendResponse);
        break;

      case 'DELETE_FORM':
        await handleDeleteForm(message, sender, sendResponse);
        break;

      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    // Use unified notification method
    showExtensionNotification(`Error handling message: ${(error as Error).message}`, 'error');
    sendResponse({ success: false, error: (error as Error).message });
  }
}

/**
 * Handle get saved forms list request
 */
async function handleGetSavedForms(
  message: Message,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) {
  try {
    const forms = await StorageManager.getAllForms();
    const formList = Object.entries(forms).map(([url, formData]: [string, any]) => ({
      url,
      name: formData.name,
      savedAt: formData.savedAt,
      fieldsCount: formData.formInfo.totalFields,
    }));

    sendResponse({ success: true, forms: formList });
  } catch (error) {
    console.error('Failed to get forms list:', error);
    // Use unified notification method
    showExtensionNotification(`Failed to get forms list: ${(error as Error).message}`, 'error');
    sendResponse({ success: false, error: (error as Error).message });
  }
}

/**
 * Handle delete form request
 */
async function handleDeleteForm(
  message: Message,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) {
  try {
    const url = message.data?.url;
    if (!url) {
      sendResponse({ success: false, error: 'Missing URL parameter' });
      return;
    }

    const success = await StorageManager.deleteForm(url);

    if (success) {
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Failed to delete form' });
    }
  } catch (error) {
    console.error('Failed to delete form:', error);
    // Use unified notification method
    showExtensionNotification(`Failed to delete form: ${(error as Error).message}`, 'error');
    sendResponse({ success: false, error: (error as Error).message });
  }
}

// Direct execution functions for content script injection
function saveFormDirect() {
  try {
    // Collect form data directly
    const forms = document.querySelectorAll('form');
    if (forms.length === 0) {
      // Directly call background notification function
      showExtensionNotification('No forms found on current page', 'error');
      return;
    }

    // Simple form collection logic
    const formData: any = {
      url: window.location.href,
      name: document.title,
      savedAt: new Date().toISOString(),
      formFields: [],
    };

    // Collect input values
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach((input: any) => {
      if (input.value && input.name) {
        formData.formFields.push({
          name: input.name,
          value: input.value,
          type: input.type || input.tagName.toLowerCase(),
        });
      }
    });

    // Save to chrome storage and show notification directly
    chrome.storage.local
      .set({ [`form_${window.location.href}`]: formData })
      .then(() => {
        showExtensionNotification('Form saved successfully!', 'success');
      })
      .catch((error: any) => {
        showExtensionNotification(`Save failed: ${error.message}`, 'error');
      });
  } catch (error: any) {
    showExtensionNotification(`Save failed: ${error.message}`, 'error');
  }
}

function restoreFormDirect() {
  try {
    // Get saved form data and show notification directly
    chrome.storage.local
      .get([`form_${window.location.href}`])
      .then(result => {
        const savedData = result[`form_${window.location.href}`];
        if (!savedData) {
          showExtensionNotification('No saved form data found', 'error');
          return;
        }

        // Restore form values
        savedData.formFields.forEach((field: any) => {
          const element = document.querySelector(`[name="${field.name}"]`) as HTMLInputElement;
          if (element && field.value) {
            element.value = field.value;
            // Trigger change event
            element.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });

        showExtensionNotification('Form restored successfully!', 'success');
      })
      .catch((error: any) => {
        showExtensionNotification(`Restore failed: ${error.message}`, 'error');
      });
  } catch (error: any) {
    showExtensionNotification(`Restore failed: ${error.message}`, 'error');
  }
}

async function createContextMenu() {
  // Remove existing context menu items
  chrome.contextMenus.removeAll();

  // Create save form menu item
  chrome.contextMenus.create({
    id: 'save-form',
    title: 'Save Form Data',
    contexts: ['page'],
    documentUrlPatterns: ['https://*/*', 'http://*/*'],
  });

  // Create restore form menu item
  chrome.contextMenus.create({
    id: 'restore-form',
    title: 'Restore Form Data',
    contexts: ['page'],
    documentUrlPatterns: ['https://*/*', 'http://*/*'],
  });

  // Create separator
  chrome.contextMenus.create({
    id: 'separator',
    type: 'separator',
    contexts: ['page'],
  });

  // Create manage forms menu item
  chrome.contextMenus.create({
    id: 'manage-forms',
    title: 'Manage Saved Forms',
    contexts: ['page'],
  });
}
