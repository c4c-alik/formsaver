import { FrameworkAdapter } from '../types/interfaces';

export class NativeHtmlAdapter implements FrameworkAdapter {
  getName(): string {
    return 'native-html';
  }

  isCompatible(): boolean {
    // 原生HTML总是兼容的
    return true;
  }

  getFormElements(root: HTMLElement): HTMLElement[] {
    return Array.from(root.querySelectorAll('input, select, textarea, button')) as HTMLElement[];
  }

  getFieldValue(element: HTMLElement): any {
    const el = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

    if (el instanceof HTMLInputElement) {
      if (el.type === 'checkbox' || el.type === 'radio') {
        return el.checked;
      }
    }

    return el.value;
  }

  setFieldValue(element: HTMLElement, value: any): void {
    const el = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

    if (el instanceof HTMLInputElement) {
      if (el.type === 'checkbox' || el.type === 'radio') {
        el.checked = Boolean(value);
      } else {
        el.value = String(value);
      }
    } else {
      el.value = String(value);
    }

    // 触发change事件
    const event = new Event('change', { bubbles: true });
    el.dispatchEvent(event);
  }
}
