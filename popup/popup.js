document.addEventListener('DOMContentLoaded', function() {
  const saveButton = document.getElementById('saveButton');
  const restoreButton = document.getElementById('restoreButton');
  const statusDiv = document.getElementById('status');

  // Save form data
  saveButton.addEventListener('click', async function() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: saveFormData
      });

      if (result && result[0].result.success) {
        showStatus('Form data saved successfully!', 'success');
      } else {
        showStatus(result && result[0].result.error ? result[0].result.error : 'Failed to save form data', 'error');
      }
    } catch (error) {
      showStatus('Error saving form data: ' + error.message, 'error');
    }
  });

  // Restore form data
  restoreButton.addEventListener('click', async function() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: restoreFormData
      });

      if (result && result[0].result.success) {
        showStatus('Form data restored successfully!', 'success');
      } else {
        showStatus(result && result[0].result.error ? result[0].result.error : 'No saved form data found', 'error');
      }
    } catch (error) {
      showStatus('Error restoring form data: ' + error.message, 'error');
    }
  });

  // Function to save form data (executed in the content script context)
  function saveFormData() {
    try {
      // Get all form elements
      const inputs = document.querySelectorAll('input, textarea, select');
      const formData = {};

      inputs.forEach(input => {
        if (input.name || input.id) {
          const key = input.name || input.id;
          let value;

          if (input.type === 'checkbox' || input.type === 'radio') {
            value = input.checked;
          } else {
            value = input.value;
          }

          if (key) {
            formData[key] = value;
          }
        }
      });

      if (Object.keys(formData).length === 0) {
        return { success: false, error: 'No form fields found on this page' };
      }

      // Save to chrome storage using the current URL as key
      const url = window.location.href;
      chrome.runtime.sendMessage({
        action: 'saveFormData',
        url: url,
        data: formData
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('Error saving form data:', chrome.runtime.lastError);
        }
      });

      return { success: true, count: Object.keys(formData).length };
    } catch (error) {
      console.error('Error in saveFormData:', error);
      return { success: false, error: error.message };
    }
  }

  // Function to restore form data (executed in the content script context)
  function restoreFormData() {
    try {
      const url = window.location.href;
      
      chrome.runtime.sendMessage({
        action: 'getFormData',
        url: url
      }, function(response) {
        if (response && response.data) {
          // Fill form fields with saved data
          const inputs = document.querySelectorAll('input, textarea, select');
          
          inputs.forEach(input => {
            if (input.name || input.id) {
              const key = input.name || input.id;
              const savedValue = response.data[key];

              if (savedValue !== undefined) {
                if (input.type === 'checkbox' || input.type === 'radio') {
                  input.checked = savedValue;
                } else {
                  input.value = savedValue;
                }
                
                // Trigger input event to notify any listeners
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
              }
            }
          });
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error in restoreFormData:', error);
      return { success: false, error: error.message };
    }
  }

  // Show status message
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';

    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }
});