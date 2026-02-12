import { Message } from './types';
import { FormCollector } from './formCollector';
import { FormRestorer } from './formRestorer';
import { StorageManager } from './storageManager';

console.log('🎯 Content script 已注入到页面:', window.location.href);
console.log('扩展ID:', chrome.runtime.id);

// 监听来自background script的消息
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true;
});

async function handleMessage(
  message: Message,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) {
  // 基本验证
  if (!message || !message.type) {
    sendResponse({ success: false, error: '无效的消息格式' });
    return;
  }
  try {
    switch (message.type) {
      case 'SAVE_FORM':
        await saveForm();
        sendResponse({ success: true });
        break;

      case 'RESTORE_FORM':
        await restoreForm();
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ success: false, error: '未知消息类型' });
    }
  } catch (error) {
    console.error('处理内容脚本消息时出错:', error);
    sendResponse({ success: false, error: (error as Error).message });
  }
}

/**
 * 触发保存表单
 */
async function saveForm() {
  try {
    // 显示加载状态
    showNotification('正在保存表单...', 'info');

    // 直接收集并保存表单数据
    const formData = FormCollector.collectFormData();

    if (!formData) {
      showNotification('当前页面没有找到表单', 'error');
      return;
    }

    // 直接调用存储管理器保存数据
    const success = await StorageManager.saveForm(formData);

    if (success) {
      showNotification('表单保存成功！', 'success');
      // 可选：发送通知
      chrome.runtime
        .sendMessage({
          type: 'FORM_SAVED',
          data: { formName: formData.name },
        })
        .catch(() => {
          // 忽略通知发送失败
        });
    } else {
      showNotification('保存失败: 存储操作失败', 'error');
    }
  } catch (error) {
    console.error('保存表单失败:', error);
    showNotification(`保存失败: ${(error as Error).message}`, 'error');
  }
}

/**
 * 触发恢复表单
 */
async function restoreForm() {
  try {
    // 显示加载状态
    showNotification('正在恢复表单...', 'info');

    // 直接从存储获取表单数据
    const formData = await StorageManager.getForm(window.location.href);

    if (!formData) {
      showNotification('未找到保存的表单数据', 'error');
      return;
    }

    // 验证是否可以在当前页面恢复
    if (!FormRestorer.canRestoreForm(formData)) {
      showNotification('无法在当前页面恢复此表单', 'error');
      return;
    }

    // 直接恢复表单数据
    const success = await FormRestorer.restoreFormData(formData);

    if (success) {
      showNotification('表单恢复成功！', 'success');
      // 可选：发送通知
      chrome.runtime
        .sendMessage({
          type: 'FORM_RESTORED',
          data: { formName: formData.name },
        })
        .catch(() => {
          // 忽略通知发送失败
        });
    } else {
      showNotification('恢复失败: 恢复操作失败', 'error');
    }
  } catch (error) {
    console.error('恢复表单失败:', error);
    showNotification(`恢复失败: ${(error as Error).message}`, 'error');
  }
}

/**
 * 显示页面内通知
 */
function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
  // 创建通知元素
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 4px;
    color: white;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    max-width: 300px;
    word-wrap: break-word;
  `;

  // 根据类型设置样式
  switch (type) {
    case 'success':
      notification.style.backgroundColor = '#4CAF50';
      break;
    case 'error':
      notification.style.backgroundColor = '#f44336';
      break;
    case 'info':
      notification.style.backgroundColor = '#2196F3';
      break;
  }

  notification.textContent = message;

  // 添加到页面
  document.body.appendChild(notification);

  // 3秒后自动移除
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

/**
 * 页面加载完成后初始化
 */
document.addEventListener('DOMContentLoaded', () => {
  // 可以在这里添加页面特定的初始化逻辑
  console.log('FormSaver content script loaded');
});

// 页面完全加载后检查是否有保存的表单
window.addEventListener('load', async () => {
  try {
    // 检查当前页面是否有保存的表单
    const response = await chrome.runtime.sendMessage({
      type: 'GET_SAVED_FORMS',
    });

    if (response?.success && response.forms) {
      const currentUrlForms = response.forms.filter(
        (form: any) => form.url === window.location.href
      );

      if (currentUrlForms.length > 0) {
        // 可以显示一个小提示告知用户有可恢复的表单
        console.log(`发现 ${currentUrlForms.length} 个可恢复的表单`);
      }
    }
  } catch (error) {
    console.error('检查保存表单时出错:', error);
  }
});

// 监听键盘快捷键（可选功能）
document.addEventListener('keydown', event => {
  // Ctrl+Shift+S 保存表单
  if (event.ctrlKey && event.shiftKey && event.key === 'S') {
    event.preventDefault();
    saveForm();
  }

  // Ctrl+Shift+R 恢复表单
  if (event.ctrlKey && event.shiftKey && event.key === 'R') {
    event.preventDefault();
    restoreForm();
  }
});
