import { FrameworkAdapter } from '../types/interfaces';
import { NativeHtmlAdapter } from './NativeHtmlAdapter';
import { VueAdapter } from './VueAdapter';

// TODO: 导入其他框架适配器
// import { ReactAdapter } from './ReactAdapter';
// import { AngularAdapter } from './AngularAdapter';

export class AdapterManager {
  private adapters: FrameworkAdapter[] = [];

  constructor() {
    // 注册适配器（按优先级排序）
    this.adapters.push(new NativeHtmlAdapter());
    this.adapters.push(new VueAdapter());
    // TODO: 添加更多框架适配器
    // this.adapters.push(new ReactAdapter());
    // this.adapters.push(new AngularAdapter());
  }

  /**
   * 获取最适合的框架适配器
   */
  getBestAdapter(): FrameworkAdapter {
    // 按优先级返回第一个兼容的适配器
    for (const adapter of this.adapters) {
      if (adapter.isCompatible()) {
        return adapter;
      }
    }

    // 默认返回原生适配器
    return this.adapters[0];
  }

  /**
   * 根据名称获取适配器
   */
  getAdapterByName(name: string): FrameworkAdapter | undefined {
    return this.adapters.find(adapter => adapter.getName() === name);
  }

  /**
   * 获取所有注册的适配器
   */
  getAllAdapters(): FrameworkAdapter[] {
    return [...this.adapters];
  }
}
