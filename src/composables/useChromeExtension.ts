import { Message } from '../content/types';

interface SendMessageResponse {
  success: boolean;
  error?: string;

  [key: string]: any;
}

interface NotificationOptions {
  type: 'basic' | 'image' | 'list' | 'progress';
  iconUrl: string;
  title: string;
  message: string;
}

export function useChromeExtension() {
  // 发送消息到content script
  async function sendMessageToTab(tabId: number, message: Message): Promise<SendMessageResponse> {
    return new Promise(resolve => {
      chrome.tabs.sendMessage(tabId, message, response => {
        if (chrome.runtime.lastError) {
          console.error('Failed to send message:', chrome.runtime.lastError);
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response as SendMessageResponse);
        }
      });
    });
  }

  // 发送消息到background script
  async function sendMessageToBackground(message: Message): Promise<SendMessageResponse> {
    return new Promise(resolve => {
      chrome.runtime.sendMessage(message, response => {
        if (chrome.runtime.lastError) {
          console.error('Failed to send message:', chrome.runtime.lastError);
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response as SendMessageResponse);
        }
      });
    });
  }

  // 获取当前活动标签页
  async function getCurrentTab(): Promise<chrome.tabs.Tab | null> {
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    return tabs[0] || null;
  }

  // 创建通知
  function createNotification(
    title: string,
    message: string,
    type: 'basic' | 'image' | 'list' | 'progress' = 'basic'
  ): void {
    const options: NotificationOptions = {
      type: type,
      iconUrl: '/assets/icon48.png',
      title: title,
      message: message,
    };

    chrome.notifications.create(options);
  }

  return {
    sendMessageToTab,
    sendMessageToBackground,
    getCurrentTab,
    createNotification,
  };
}
