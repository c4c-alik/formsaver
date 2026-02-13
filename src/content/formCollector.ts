import { FormEngine } from './formEngine';
import { FormData } from './types';

export class FormCollector {
  private engine: FormEngine;

  constructor() {
    this.engine = new FormEngine();
  }

  /**
   * 收集当前页面的所有表单数据
   * 保持原有的静态方法API兼容性
   */
  static collectFormData(): FormData | null {
    const collector = new FormCollector();
    return collector.engine.collectAllForms();
  }

  /**
   * 获取底层引擎实例（用于高级用法）
   */
  getEngine(): FormEngine {
    return this.engine;
  }
}
