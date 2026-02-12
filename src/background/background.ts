import { Message } from '../content/types';
import { StorageManager } from '../content/storageManager';

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

// Listen for context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;

  switch (info.menuItemId) {
    case 'save-form':
      sendMessageToContentScript(tab.id, { type: 'SAVE_FORM' })
        .then(response => {
          console.log('Content script save response:', response);
        })
        .catch(error => {
          console.error('Failed to send save form message:', error);
          // Show notification to user
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'assets/icon48.png',
            title: 'FormSaver',
            message: 'cannot save form: page may not support or loading',
          });
        });
      break;
    case 'restore-form':
      sendMessageToContentScript(tab.id, { type: 'RESTORE_FORM' }).catch(error => {
        console.error('Failed to send restore form message:', error);
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'assets/icon48.png',
          title: 'FormSaver',
          message: 'cannot restore form: page may not support or loading',
        });
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
    sendResponse({ success: false, error: (error as Error).message });
  }
}

/**
 * Create context menu
 */
/**
 * Wrapper function to send messages to content script with error handling and retry mechanism
 */
async function sendMessageToContentScript(
  tabId: number,
  message: any,
  maxRetries = 3
): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check if tab exists and is accessible
      const tab = await chrome.tabs.get(tabId);
      if (!tab || !tab.url) {
        throw new Error('Tab does not exist or URL is invalid');
      }

      // Try to send message
      const response = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });

      return response;
    } catch (error) {
      const errorMessage = (error as Error).message;

      // If it's a connection error and there are retry attempts left
      if (errorMessage.includes('Could not establish connection') && attempt < maxRetries) {
        console.warn(
          `Attempt ${attempt} to send message failed, waiting to retry...`,
          errorMessage
        );
        // Wait for a while before retrying
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        continue;
      }

      // Other errors or retry attempts exhausted
      throw error;
    }
  }

  throw new Error('Maximum retry attempts reached, unable to establish connection');
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
