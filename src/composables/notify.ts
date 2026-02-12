/**
 * Send notification request to background script
 * @param message Notification message
 * @param type Notification type: 'success', 'error', 'info'
 */
export function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
  // Send message to background to handle notification
  chrome.runtime
    .sendMessage({
      type: 'SHOW_NOTIFICATION',
      message: message,
      notificationType: type,
    })
    .catch(error => {
      // Fallback to local notification if background is not available
      console.warn('Failed to send notification to background:', error);
    });
}
