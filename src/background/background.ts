import { Message } from '../content/types';
import { StorageManager } from '../content/storageManager';

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
});

// 监听右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;

  switch (info.menuItemId) {
    case 'save-form':
      sendMessageToContentScript(tab.id, { type: 'SAVE_FORM' })
        .then(response => {
          console.log('Content script保存响应:', response);
        })
        .catch(error => {
          console.error('发送保存表单消息失败:', error);
          // 显示通知给用户
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'assets/icon48.png',
            title: 'FormSaver',
            message: '无法保存表单：页面可能不支持或正在加载中',
          });
        });
      break;
    case 'restore-form':
      sendMessageToContentScript(tab.id, { type: 'RESTORE_FORM' }).catch(error => {
        console.error('发送恢复表单消息失败:', error);
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'assets/icon48.png',
          title: 'FormSaver',
          message: '无法恢复表单：页面可能不支持或正在加载中',
        });
      });
      break;
    case 'manage-forms':
      chrome.runtime.openOptionsPage();
      break;
  }
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
/**
 * 向内容脚本发送消息的封装函数，包含错误处理和重试机制
 */
async function sendMessageToContentScript(
  tabId: number,
  message: any,
  maxRetries = 3
): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 检查标签页是否存在且可访问
      const tab = await chrome.tabs.get(tabId);
      if (!tab || !tab.url) {
        throw new Error('标签页不存在或URL无效');
      }

      // 尝试发送消息
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

      // 如果是连接错误且还有重试机会
      if (errorMessage.includes('Could not establish connection') && attempt < maxRetries) {
        console.warn(`第${attempt}次尝试发送消息失败，等待后重试...`, errorMessage);
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        continue;
      }

      // 其他错误或重试次数用完
      throw error;
    }
  }

  throw new Error('达到最大重试次数，无法建立连接');
}

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
