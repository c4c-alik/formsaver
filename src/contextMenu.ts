// contextMenu.ts - Handles the right-click context menu functionality

// Initialize context menu when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  // Remove any existing menu items to avoid duplicates
  chrome.contextMenus.removeAll(() => {
    // Create the main context menu item for saving forms
    chrome.contextMenus.create({
      id: 'saveFormWithRightClick',
      title: 'Save Current Form Data',
      contexts: ['page', 'selection', 'link'] // Show on right-click anywhere on page
    });
    
    // Optional: Add another menu item for restoring forms
    chrome.contextMenus.create({
      id: 'restoreFormWithRightClick',
      title: 'Restore Saved Form Data',
      contexts: ['page']
    });
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  
  try {
    if (info.menuItemId === 'saveFormWithRightClick') {
      // Execute content script to collect form data and save it
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: collectAndSaveFormData
      });
      
      if (results && results[0]?.result?.success) {
        console.log(`Successfully saved form data for ${results[0].result.count} fields`);
        // Optionally show notification
        showNotification('Form data saved successfully!');
      } else {
        console.error('Failed to save form data:', results[0]?.result?.error);
        showNotification('Failed to save form data: ' + (results[0]?.result?.error || 'Unknown error'));
      }
    } 
    else if (info.menuItemId === 'restoreFormWithRightClick') {
      // Execute content script to restore form data
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: restoreFormData
      });
      
      if (results && results[0]?.result?.success) {
        console.log('Successfully restored form data');
        showNotification('Form data restored successfully!');
      } else {
        console.error('Failed to restore form data:', results[0]?.result?.error);
        showNotification(results[0]?.result?.error || 'No saved form data found for this page');
      }
    }
  } catch (error) {
    console.error('Error handling context menu click:', error);
    showNotification('Error: ' + (error as Error).message);
  }
});

// Function to collect form data and save it - runs in the content page context
function collectAndSaveFormData(): { success: boolean; count?: number; error?: string } {
  try {
    // Get all form elements
    const inputs = document.querySelectorAll('input, textarea, select');
    const formData: { [key: string]: string | boolean } = {};

    inputs.forEach(input => {
      // Cast to appropriate type and check if element has the properties we need
      const element = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      
      // Only save fields that have names or IDs and are not passwords
      if ((element.name || element.id) && element.type !== 'password') {
        const key = element.name || element.id;
        let value: string | boolean;

        if (element.type === 'checkbox' || element.type === 'radio') {
          value = (element as HTMLInputElement).checked;
        } else {
          value = element.value;
        }

        if (key) {
          formData[key] = value;
        }
      }
    });

    if (Object.keys(formData).length === 0) {
      return { success: false, error: 'No form fields found on this page' };
    }

    // Send collected data to background script for storage
    const url = window.location.href;
    chrome.runtime.sendMessage({
      action: 'saveFormData',
      url: url,
      data: formData
    }).catch(error => {
      console.error('Error sending save message:', error);
    });

    return { success: true, count: Object.keys(formData).length };
  } catch (error) {
    console.error('Error in collectAndSaveFormData:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Function to restore form data - runs in the content page context
function restoreFormData(): { success: boolean; error?: string } {
  try {
    const url = window.location.href;
    
    // Request stored form data from background script
    chrome.runtime.sendMessage({
      action: 'getFormData',
      url: url
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError);
        return { success: false, error: chrome.runtime.lastError.message };
      }
      
      if (response.success && response.data) {
        // Fill form fields with saved data
        const inputs = document.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
          const element = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          
          if ((element.name || element.id) && element.type !== 'password') {
            const key = element.name || element.id;
            const savedValue = response.data[key];

            if (savedValue !== undefined) {
              if (element.type === 'checkbox' || element.type === 'radio') {
                (element as HTMLInputElement).checked = !!savedValue;
              } else {
                element.value = String(savedValue);
              }
              
              // Trigger input and change events to notify any listeners
              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        });
      } else {
        // No saved data found for this URL
        console.log('No saved form data found for this URL');
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error in restoreFormData:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Helper function to show notifications
function showNotification(message: string) {
  if (chrome.notifications) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icon48.png',
      title: 'FormSaver',
      message: message,
      eventTime: Date.now() + 5000 // Auto-dismiss after 5 seconds
    });
  } else {
    // Fallback to console if notifications permission not granted
    console.log('Notification:', message);
  }
}

// Also listen for runtime messages to coordinate between popup and context menu
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle messages if needed for coordination between components
  if (message.action === 'refreshContextMenu') {
    // No refresh method available in contextMenus API for MV3
    // Just ignore this action
  }
});