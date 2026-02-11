import { FormField, FormInfo, FormData } from './types';

export class FormCollector {
  /**
   * 收集当前页面的所有表单数据
   */
  static collectFormData(): FormData | null {
    const forms = document.querySelectorAll('form');
    if (forms.length === 0) {
      return null;
    }

    // 获取第一个表单（通常是最主要的）
    const form = forms[0];
    const formFields: FormField[] = [];
    let totalFields = 0;
    let filledFields = 0;
    const fieldTypes: Record<string, number> = {};

    // 收集所有可输入元素
    const inputElements = form.querySelectorAll('input, select, textarea');

    inputElements.forEach((element: Element) => {
      const field = this.processElement(element);
      if (field) {
        formFields.push(field);
        totalFields++;

        // 统计字段类型
        const fieldType = field.type;
        fieldTypes[fieldType] = (fieldTypes[fieldType] || 0) + 1;

        // 统计已填字段
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
   * 处理单个表单元素
   */
  private static processElement(element: Element): FormField | null {
    const tagName = element.tagName.toLowerCase();
    const inputElement = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

    // 跳过隐藏字段和按钮
    if (
      inputElement.type === 'hidden' ||
      inputElement.type === 'submit' ||
      inputElement.type === 'button' ||
      inputElement.type === 'reset'
    ) {
      return null;
    }

    let value: string | boolean | number = '';
    let options: Array<{ value: string; text: string; selected: boolean }> | undefined;

    // 获取值和选项
    switch (tagName) {
      case 'input': {
        const input = element as HTMLInputElement;
        if (input.type === 'checkbox' || input.type === 'radio') {
          value = input.checked;
        } else {
          value = input.value;
        }
        break;
      }
      case 'select': {
        const select = element as HTMLSelectElement;
        value = select.value;
        options = Array.from(select.options).map(option => ({
          value: option.value,
          text: option.text,
          selected: option.selected,
        }));
        break;
      }
      case 'textarea':
        value = (element as HTMLTextAreaElement).value;
        break;
      default:
        return null;
    }

    // 生成选择器
    const selectors = this.generateSelectors(element);

    // 获取标签文本
    const label = this.findLabel(element);

    return {
      type: inputElement.type || tagName,
      value,
      attributes: {
        type: inputElement.type,
        name: inputElement.name,
        id: inputElement.id,
      },
      metadata: {
        label,
        placeholder: (inputElement as HTMLInputElement | HTMLTextAreaElement).placeholder,
      },
      selectors,
      ...(options && { options }),
    };
  }

  /**
   * 生成CSS选择器
   */
  private static generateSelectors(element: Element): { primary: string; alternative?: string[] } {
    const selectors: string[] = [];

    // ID选择器
    if (element.id) {
      selectors.push(`#${element.id}`);
    }

    // Name属性选择器
    const name = (element as HTMLInputElement).name;
    if (name) {
      selectors.push(`${element.tagName.toLowerCase()}[name='${name}']`);
    }

    // 类名选择器
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        selectors.push(`${element.tagName.toLowerCase()}.${classes.join('.')}`);
      }
    }

    // 父级路径选择器
    const parentSelector = this.getParentPathSelector(element);
    if (parentSelector) {
      selectors.push(parentSelector);
    }

    return {
      primary: selectors[0] || element.tagName.toLowerCase(),
      alternative: selectors.slice(1),
    };
  }

  /**
   * 获取父级路径选择器
   */
  private static getParentPathSelector(element: Element): string | null {
    const path: string[] = [];
    let current: Element | null = element;

    while (current && current !== document.body) {
      const tagName = current.tagName.toLowerCase();
      let selector = tagName;

      if (current.id) {
        selector = `#${current.id}`;
      } else if ((current as HTMLInputElement).name) {
        selector = `${tagName}[name='${(current as HTMLInputElement).name}']`;
      }

      path.unshift(selector);
      current = current.parentElement;

      // 限制路径长度
      if (path.length > 3) break;
    }

    return path.length > 1 ? path.join(' > ') : null;
  }

  /**
   * 查找关联的标签
   */
  private static findLabel(element: Element): string | undefined {
    const input = element as HTMLInputElement;

    // 通过for属性查找
    if (input.id) {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label) {
        return label.textContent?.trim() || undefined;
      }
    }

    // 通过父级查找
    const parent = element.parentElement;
    if (parent && parent.tagName.toLowerCase() === 'label') {
      return parent.textContent?.trim() || undefined;
    }

    // 通过相邻元素查找
    const prevSibling = element.previousElementSibling;
    if (prevSibling && prevSibling.tagName.toLowerCase() === 'label') {
      return prevSibling.textContent?.trim() || undefined;
    }

    return undefined;
  }

  /**
   * 判断字段是否已填写
   */
  private static isFieldFilled(field: FormField): boolean {
    if (field.type === 'checkbox' || field.type === 'radio') {
      return Boolean(field.value);
    }
    return String(field.value).trim().length > 0;
  }

  /**
   * 获取表单名称
   */
  private static getFormName(form: HTMLFormElement): string | null {
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
  private static generateFormId(): string {
    return 'form_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}
