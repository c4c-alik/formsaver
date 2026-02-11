import { ref, Ref } from 'vue';

interface MessageItem {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: Date;
}

export function useMessage() {
  const messages: Ref<MessageItem[]> = ref([]);

  function showMessage(
    text: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
    duration: number = 3000
  ): number {
    const id = Date.now();
    const message: MessageItem = {
      id,
      text,
      type,
      timestamp: new Date(),
    };

    messages.value.push(message);

    // 自动移除消息
    setTimeout(() => {
      removeMessage(id);
    }, duration);

    return id;
  }

  function removeMessage(id: number): void {
    const index = messages.value.findIndex(msg => msg.id === id);
    if (index !== -1) {
      messages.value.splice(index, 1);
    }
  }

  function showError(text: string, duration?: number): number {
    return showMessage(text, 'error', duration);
  }

  function showSuccess(text: string, duration?: number): number {
    return showMessage(text, 'success', duration);
  }

  function showWarning(text: string, duration?: number): number {
    return showMessage(text, 'warning', duration);
  }

  function showInfo(text: string, duration?: number): number {
    return showMessage(text, 'info', duration);
  }

  return {
    messages,
    showMessage,
    removeMessage,
    showError,
    showSuccess,
    showWarning,
    showInfo,
  };
}
