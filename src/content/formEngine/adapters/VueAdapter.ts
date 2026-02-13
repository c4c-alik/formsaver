import { FrameworkAdapter } from '../types/interfaces';
import { NativeHtmlAdapter } from './NativeHtmlAdapter';

export class VueAdapter implements FrameworkAdapter {
  getName(): string {
    return 'vue';
  }

  isCompatible(): boolean {
    // 检查是否存在Vue实例
    return (
      !!(window as any).__VUE__ || !!document.querySelector('[data-v-app]') || this.hasVueDevtools()
    );
  }

  private hasVueDevtools(): boolean {
    return !!(window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__;
  }

  getFormElements(root: HTMLElement): HTMLElement[] {
    // Vue组件可能包装在自定义元素中，需要递归查找
    const elements: HTMLElement[] = [];

    // 使用querySelectorAll简化实现
    const inputs = root.querySelectorAll('input, select, textarea');
    inputs.forEach(input => elements.push(input as HTMLElement));

    // 额外查找带有v-model的元素
    const vModelElements = root.querySelectorAll('[v-model]');
    vModelElements.forEach(el => {
      if (!elements.includes(el as HTMLElement)) {
        elements.push(el as HTMLElement);
      }
    });

    return elements;
  }

  getFieldValue(element: HTMLElement): any {
    // 尝试获取Vue绑定的值
    const vModel = element.getAttribute('v-model');
    if (vModel) {
      // TODO: 实现Vue响应式数据访问
      // 这里需要访问Vue实例的$data或计算属性
      console.log(`Found v-model binding: ${vModel}`);
    }

    // 回退到原生方法
    return new NativeHtmlAdapter().getFieldValue(element);
  }

  setFieldValue(element: HTMLElement, value: any): void {
    const vModel = element.getAttribute('v-model');
    if (vModel) {
      // TODO: 实现Vue响应式数据更新
      // 这里需要更新Vue实例的相应数据属性
      console.log(`Setting Vue model ${vModel} to:`, value);
    }

    // 同时更新DOM值
    new NativeHtmlAdapter().setFieldValue(element, value);
  }

  getBindingExpression(element: HTMLElement): string | undefined {
    return element.getAttribute('v-model') || undefined;
  }
}
