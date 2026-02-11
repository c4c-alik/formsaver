import { FormData, FormField } from './types';

export class FormRestorer {
  /**
   * 恢复表单数据到页面
   */
  static async restoreFormData(formData: FormData): Promise<boolean> {
    try {
      // 遍历所有表单字段
      for (const field of formData.formFields) {
        await this.restoreField(field);
      }

      return true;
    } catch (error) {
      console.error('恢复表单数据失败:', error);
      return false;
    }
  }

  /**
   * 恢复单个字段
   */
  private static async restoreField(field: FormField): Promise<void> {
    // 尝试使用主要选择器
    let element = document.querySelector(field.selectors.primary) as
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
      | null;

    // 如果主要选择器失败，尝试备选选择器
    if (!element && field.selectors.alternative) {
      for (const selector of field.selectors.alternative) {
        element = document.querySelector(selector) as
          | HTMLInputElement
          | HTMLSelectElement
          | HTMLTextAreaElement
          | null;
        if (element) break;
      }
    }

    // 如果还是找不到元素，尝试更通用的方法
    if (!element) {
      element = this.findElementByAttributes(field) as
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement
        | null;
    }

    if (!element) {
      console.warn(`未找到匹配的元素: ${field.selectors.primary}`);
      return;
    }

    // 设置元素值
    await this.setElementValue(element, field);
  }

  /**
   * 通过属性查找元素
   */
  private static findElementByAttributes(field: FormField): Element | null {
    const { attributes } = field;

    // 优先使用name属性
    if (attributes.name) {
      const element = document.querySelector(`[name="${attributes.name}"]`);
      if (element) return element;
    }

    // 使用id属性
    if (attributes.id) {
      const element = document.getElementById(attributes.id);
      if (element) return element;
    }

    // 使用type和标签组合
    if (attributes.type) {
      const element = document.querySelector(`${field.type}[type="${attributes.type}"]`);
      if (element) return element;
    }

    return null;
  }

  /**
   * 设置元素值
   */
  private static async setElementValue(
    element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
    field: FormField
  ): Promise<void> {
    const tagName = element.tagName.toLowerCase();

    switch (tagName) {
      case 'input':
        await this.setInputValue(element as HTMLInputElement, field);
        break;
      case 'select':
        this.setSelectValue(element as HTMLSelectElement, field);
        break;
      case 'textarea':
        (element as HTMLTextAreaElement).value = String(field.value);
        break;
    }

    // 触发事件让页面响应变化
    this.triggerEvents(element);
  }

  /**
   * 设置输入框值
   */
  private static async setInputValue(input: HTMLInputElement, field: FormField): Promise<void> {
    switch (input.type) {
      case 'checkbox':
      case 'radio':
        input.checked = Boolean(field.value);
        break;
      case 'file':
        // 文件输入框不恢复
        console.warn('跳过文件输入框:', field.metadata.label || field.attributes.name);
        break;
      default:
        input.value = String(field.value);
        break;
    }
  }

  /**
   * 设置选择框值
   */
  private static setSelectValue(select: HTMLSelectElement, field: FormField): void {
    const value = String(field.value);

    // 直接设置值
    select.value = value;

    // 如果直接设置失败，尝试通过选项匹配
    if (select.value !== value && field.options) {
      const option = field.options.find(opt => opt.value === value || opt.text === value);
      if (option) {
        select.value = option.value;
      }
    }
  }

  /**
   * 触发必要的事件
   */
  private static triggerEvents(element: HTMLElement): void {
    // 创建并触发change事件
    const changeEvent = new Event('change', { bubbles: true });
    element.dispatchEvent(changeEvent);

    // 创建并触发input事件
    const inputEvent = new Event('input', { bubbles: true });
    element.dispatchEvent(inputEvent);

    // 对于某些特殊元素，可能需要额外的事件
    if (element.tagName.toLowerCase() === 'select') {
      const selectEvent = new Event('select', { bubbles: true });
      element.dispatchEvent(selectEvent);
    }

    // 延迟触发blur事件，模拟用户操作
    setTimeout(() => {
      const blurEvent = new FocusEvent('blur', { bubbles: true });
      element.dispatchEvent(blurEvent);
    }, 100);
  }

  /**
   * 验证表单是否可以恢复
   */
  static canRestoreForm(formData: FormData): boolean {
    // 检查页面URL是否匹配
    if (formData.url !== window.location.href) {
      console.warn('URL不匹配，当前页面:', window.location.href, '保存时:', formData.url);
      return false;
    }

    // 检查是否有可恢复的字段
    return formData.formFields.length > 0;
  }

  /**
   * 获取可恢复字段的数量
   */
  static getRestorableFieldsCount(formData: FormData): number {
    let count = 0;

    for (const field of formData.formFields) {
      const element =
        document.querySelector(field.selectors.primary) ||
        field.selectors.alternative?.find(sel => document.querySelector(sel));

      if (element) {
        count++;
      }
    }

    return count;
  }
}
