import { Message } from './types';
import { StorageManager } from './storageManager';

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // 保持消息通道开放以支持异步响应
});

// 扩展安装时初始化
chrome.runtime.onInstalled.addListener(async () => {
  console.log('FormSaver extension installed');

  // 创建右键菜单
  await createContextMenu();

  // 迁移旧数据
  await StorageManager.migrateData();

  // 创建通知权限
  chrome.permissions.request({
    permissions: ['notifications'],
  });
});

// 标签页更新时检查是否有保存的表单
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      // 检查该URL是否有保存的表单
      const savedForm = await StorageManager.getForm(tab.url);
      if (savedForm) {
        // 可以在这里显示页面提示或badge
        chrome.action.setBadgeText({
          text: '💾',
          tabId: tabId,
        });
      }
    } catch (error) {
      console.error('检查保存表单时出错:', error);
    }
  }
});

// 监听右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;

  switch (info.menuItemId) {
    case 'save-form':
      chrome.tabs.sendMessage(tab.id, { type: 'SAVE_FORM' }, response => {
        if (chrome.runtime.lastError) {
          console.error('发送保存表单消息失败:', chrome.runtime.lastError);
        } else {
          console.log('Content script保存响应:', response);
        }
      });
      break;
    case 'restore-form':
      chrome.tabs.sendMessage(tab.id, { type: 'RESTORE_FORM' });
      break;
    case 'manage-forms':
      chrome.runtime.openOptionsPage();
      break;
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
        sendResponse({ success: false, error: '未知消息类型' });
    }
  } catch (error) {
    console.error('处理消息时出错:', error);
    sendResponse({ success: false, error: (error as Error).message });
  }
}

/**
 * 处理获取保存表单列表请求
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
    console.error('获取表单列表失败:', error);
    sendResponse({ success: false, error: (error as Error).message });
  }
}

/**
 * 处理删除表单请求
 */
async function handleDeleteForm(
  message: Message,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) {
  try {
    const url = message.data?.url;
    if (!url) {
      sendResponse({ success: false, error: '缺少URL参数' });
      return;
    }

    const success = await StorageManager.deleteForm(url);

    if (success) {
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: '删除表单失败' });
    }
  } catch (error) {
    console.error('删除表单失败:', error);
    sendResponse({ success: false, error: (error as Error).message });
  }
}

/**
 * 创建右键菜单
 */
async function createContextMenu() {
  // 移除现有的上下文菜单项
  chrome.contextMenus.removeAll();

  // 创建保存表单菜单项
  chrome.contextMenus.create({
    id: 'save-form',
    title: '保存表单数据',
    contexts: ['page'],
    documentUrlPatterns: ['https://*/*', 'http://*/*'],
  });

  // 创建恢复表单菜单项
  chrome.contextMenus.create({
    id: 'restore-form',
    title: '恢复表单数据',
    contexts: ['page'],
    documentUrlPatterns: ['https://*/*', 'http://*/*'],
  });

  // 创建分隔线
  chrome.contextMenus.create({
    id: 'separator',
    type: 'separator',
    contexts: ['page'],
  });

  // 创建管理表单菜单项
  chrome.contextMenus.create({
    id: 'manage-forms',
    title: '管理已保存表单',
    contexts: ['page'],
  });
}
