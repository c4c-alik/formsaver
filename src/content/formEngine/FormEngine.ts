import { AdapterManager } from './adapters/AdapterManager';
import { FormDiscoveryLayer } from './layers/FormDiscoveryLayer';
import { FieldParsingLayer } from './layers/FieldParsingLayer';
import { FrameworkAdapter } from './types/interfaces';
import { FormData, FormInfo, FormField } from '../types';

export class FormEngine {
  private adapterManager: AdapterManager;
  private discoveryLayer: FormDiscoveryLayer;
  private parsingLayer: FieldParsingLayer;
  private currentAdapter: FrameworkAdapter;

  constructor() {
    this.adapterManager = new AdapterManager();
    this.discoveryLayer = new FormDiscoveryLayer(this.adapterManager);
    this.currentAdapter = this.discoveryLayer.getBestAdapter();
    this.parsingLayer = new FieldParsingLayer(this.currentAdapter);
  }

  /**
   * 收集当前页面的所有表单数据
   */
  collectAllForms(): FormData | null {
    const forms = this.discoveryLayer.discoverForms();
    if (forms.length === 0) {
      return null;
    }

    // 处理第一个表单（可以根据需要扩展为处理所有表单）
    const form = forms[0];
    const formFields: FormField[] = [];
    let totalFields = 0;
    let filledFields = 0;
    const fieldTypes: Record<string, number> = {};

    // 获取表单内的所有元素
    const formElements = this.currentAdapter.getFormElements(form);

    formElements.forEach(element => {
      const field = this.parsingLayer.parseElement(element);
      if (field) {
        formFields.push(field);
        totalFields++;

        // 分析字段类型
        const fieldType = field.type;
        fieldTypes[fieldType] = (fieldTypes[fieldType] || 0) + 1;

        // 检查字段是否已填充
        if (this.isFieldFilled(field)) {
          filledFields++;
        }
      }
    });

    const formInfo: FormInfo = {
      totalFields,
      filledFields,
      fieldTypes,
    };

    return {
      id: this.generateFormId(),
      name: this.getFormName(form) || document.title,
      url: window.location.href,
      savedAt: new Date().toISOString(),
      formFields,
      formInfo,
    };
  }

  /**
   * 检查字段是否已填充
   */
  private isFieldFilled(field: FormField): boolean {
    if (field.type === 'checkbox' || field.type === 'radio') {
      return Boolean(field.value);
    }
    return String(field.value).trim().length > 0;
  }

  /**
   * 获取表单名称
   */
  private getFormName(form: HTMLFormElement): string | null {
    // 尝试从表单属性获取
    if (form.name) return form.name;
    if (form.id) return form.id;

    // 尝试从标题或其他元素获取
    const title = form.querySelector('h1, h2, h3, legend');
    if (title) return title.textContent?.trim() || null;

    return null;
  }

  /**
   * 生成表单ID
   */
  private generateFormId(): string {
    return 'form_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 获取当前使用的适配器
   */
  getCurrentAdapter(): FrameworkAdapter {
    return this.currentAdapter;
  }

  /**
   * 切换到指定适配器
   */
  switchAdapter(adapterName: string): boolean {
    const adapter = this.adapterManager.getAdapterByName(adapterName);
    if (adapter) {
      this.currentAdapter = adapter;
      this.parsingLayer = new FieldParsingLayer(this.currentAdapter);
      return true;
    }
    return false;
  }

  /**
   * 监听表单变化
   */
  observeFormChanges(callback: (form: HTMLFormElement) => void): MutationObserver {
    return this.discoveryLayer.observeFormChanges(callback);
  }
}
