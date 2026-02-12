import { StorageManager } from '../content/storageManager';
import { Message } from '../content/types';

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
  } else {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icon48.png',
      title: 'FormSaver',
      message: message,
    });
  }
}

// Listen for messages from content scripts and injected functions
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'SHOW_NOTIFICATION':
      showExtensionNotification(message.message, message.notificationType);
      break;

    // Handle other message types...
    case 'GET_SAVED_FORMS':
      handleGetSavedForms(message, sender, sendResponse);
      return true; // Keep message channel open for async response

    case 'DELETE_FORM':
      handleDeleteForm(message, sender, sendResponse);
      return true;

    default:
      // Handle unknown message types
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  // For SHOW_NOTIFICATION, we don't need to send a response
  return false;
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
      // Send message to content script to handle save functionality
      chrome.tabs.sendMessage(tab.id, { type: 'SAVE_FORM' }).catch(error => {
        console.error('Failed to send save form message:', error, 'tabId', tab.id);
        // Use unified notification method for critical errors
        showExtensionNotification('Cannot save form: page may not support or loading', 'error');
      });
      break;
    case 'restore-form':
      // Send message to content script to handle restore functionality
      chrome.tabs.sendMessage(tab.id, { type: 'RESTORE_FORM' }).catch(error => {
        console.error('Failed to send restore form message:', error);
        // Use unified notification method for critical errors
        showExtensionNotification('Cannot restore form: page may not support or loading', 'error');
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
