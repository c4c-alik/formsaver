"use strict";
// background.ts - Handles form data storage and context menu
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
    if (info.menuItemId === 'saveForm' && (tab === null || tab === void 0 ? void 0 : tab.id)) {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: saveFormFromContextMenu
        });
    }
});
// Function to save form data to Chrome storage
function saveFormData(url, data) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Retrieve existing form data
            const result = yield chrome.storage.local.get(['formData']);
            const formData = result.formData || {};
            // Update the data for this URL
            formData[url] = data;
            // Save back to storage
            yield chrome.storage.local.set({ formData });
            console.log(`Form data saved for URL: ${url}`);
        }
        catch (error) {
            console.error('Error saving form data:', error);
            throw error;
        }
    });
}
// Function to retrieve form data from Chrome storage
function getFormData(url) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield chrome.storage.local.get(['formData']);
            const formData = result.formData || {};
            // Return data for this URL, or null if not found
            return formData[url] || null;
        }
        catch (error) {
            console.error('Error retrieving form data:', error);
            throw error;
        }
    });
}
// Context menu save function that runs in the content script context
function saveFormFromContextMenu() {
    try {
        // Get all form elements - cast to appropriate types
        const inputs = document.querySelectorAll('input, textarea, select');
        const formData = {};
        inputs.forEach(input => {
            // Type guard to check if element has the properties we need
            const element = input;
            if ((element.name || element.id) && element.type !== 'password') {
                const key = element.name || element.id;
                let value;
                if (element.type === 'checkbox' || element.type === 'radio') {
                    value = element.checked;
                }
                else {
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
            }
            else {
                console.error('Failed to save form data:', response.error);
            }
        });
    }
    catch (error) {
        console.error('Error in context menu save:', error);
    }
}
