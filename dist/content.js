"use strict";
// content.ts - Injected into web pages to interact with forms
// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fillForm') {
        fillForm(request.data);
        sendResponse({ success: true });
    }
});
// Function to fill form fields with provided data
function fillForm(data) {
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        const element = input;
        if ((element.name || element.id) && element.type !== 'password') {
            const key = element.name || element.id;
            const savedValue = data[key];
            if (savedValue !== undefined) {
                if (element.type === 'checkbox' || element.type === 'radio') {
                    element.checked = !!savedValue;
                }
                else {
                    element.value = String(savedValue);
                }
                // Trigger input and change events to notify any listeners
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    });
}
// Monitor form changes and potentially auto-save
let formElements = null;
function monitorFormChanges() {
    // Only set up monitoring once
    if (formElements)
        return;
    formElements = document.querySelectorAll('input, textarea, select');
    formElements.forEach(element => {
        const el = element;
        el.addEventListener('change', handleFormChange);
        el.addEventListener('input', handleFormChange);
    });
}
function handleFormChange(event) {
    // Optionally implement auto-save functionality here
    // For now, just log the change
    console.log('Form field changed:', event.target);
}
// Set up monitoring when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', monitorFormChanges);
}
else {
    monitorFormChanges();
}
// Expose a function to the global scope to allow popup to trigger form filling
window.fillFormWithData = fillForm;
