// background.ts - Handles form data storage and context menu

interface FormDataStorage {
  [url: string]: {
    [field: string]: string | boolean;
  };
}

// Initialize the extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('FormSaver extension installed');
  
  // Create context menu item
  chrome.contextMenus.create({
    id: 'saveForm',
    title: 'Save Form Data',
    contexts: ['page']
  });
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'saveFormData':
      saveFormData(message.url, message.data)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep message channel open for async response
    
    case 'getFormData':
      getFormData(message.url)
        .then(data => sendResponse({ success: true, data }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep message channel open for async response
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'saveForm' && tab?.id) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: saveFormFromContextMenu
    });
  }
});

// Function to save form data to Chrome storage
async function saveFormData(url: string, data: { [key: string]: string | boolean }): Promise<void> {
  try {
    // Retrieve existing form data
    const result = await chrome.storage.local.get(['formData']);
    const formData: FormDataStorage = result.formData || {};
    
    // Update the data for this URL
    formData[url] = data;
    
    // Save back to storage
    await chrome.storage.local.set({ formData });
    console.log(`Form data saved for URL: ${url}`);
  } catch (error) {
    console.error('Error saving form data:', error);
    throw error;
  }
}

// Function to retrieve form data from Chrome storage
async function getFormData(url: string): Promise<{ [key: string]: string | boolean } | null> {
  try {
    const result = await chrome.storage.local.get(['formData']);
    const formData: FormDataStorage = result.formData || {};
    
    // Return data for this URL, or null if not found
    return formData[url] || null;
  } catch (error) {
    console.error('Error retrieving form data:', error);
    throw error;
  }
}

// Context menu save function that runs in the content script context
function saveFormFromContextMenu() {
  try {
    // Get all form elements - cast to appropriate types
    const inputs = document.querySelectorAll('input, textarea, select');
    const formData: { [key: string]: string | boolean } = {};

    inputs.forEach(input => {
      // Type guard to check if element has the properties we need
      const element = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      
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
      console.log('No form fields found on this page');
      return;
    }

    // Send message to background to save the data
    const url = window.location.href;
    chrome.runtime.sendMessage({
      action: 'saveFormData',
      url: url,
      data: formData
    }).then(response => {
      if (response.success) {
        console.log(`Form data saved for ${Object.keys(formData).length} fields`);
      } else {
        console.error('Failed to save form data:', response.error);
      }
    });
  } catch (error) {
    console.error('Error in context menu save:', error);
  }
}