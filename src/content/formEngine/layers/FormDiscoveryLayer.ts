import { AdapterManager } from '../adapters/AdapterManager';

export class FormDiscoveryLayer {
  private adapterManager: AdapterManager;

  constructor(adapterManager: AdapterManager) {
    this.adapterManager = adapterManager;
  }

  /**
   * 发现页面中的所有表单
   */
  discoverForms(): HTMLFormElement[] {
    return Array.from(document.querySelectorAll('form')) as HTMLFormElement[];
  }

  /**
   * 获取最适合的框架适配器
   */
  getBestAdapter() {
    return this.adapterManager.getBestAdapter();
  }

  /**
   * 动态监听表单变化
   */
  observeFormChanges(callback: (form: HTMLFormElement) => void): MutationObserver {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node instanceof HTMLElement && node.tagName === 'FORM') {
              callback(node as HTMLFormElement);
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return observer;
  }
}
