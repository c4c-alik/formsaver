import { FrameworkAdapter, FieldIdentifier } from '../types/interfaces';
import { FormField } from '../../types';

export class FieldParsingLayer {
  private adapter: FrameworkAdapter;

  constructor(adapter: FrameworkAdapter) {
    this.adapter = adapter;
  }

  /**
   * 解析单个表单元素
   */
  parseElement(element: Element): FormField | null {
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

    // 获取值和选项
    const value = this.adapter.getFieldValue(element as HTMLElement);
    let options: Array<{ value: string; text: string; selected: boolean }> | undefined;

    if (tagName === 'select') {
      const select = element as HTMLSelectElement;
      options = Array.from(select.options).map(option => ({
        value: option.value,
        text: option.text,
        selected: option.selected,
      }));
    }

    // 生成标识符
    const identifiers = this.generateIdentifiers(element);

    // 获取标签文本
    const label = this.findLabel(element);

    // 获取框架特定信息
    const bindingExpression = this.adapter.getBindingExpression?.(element as HTMLElement);

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
        // @ts-ignore - framework属性在FormFieldMetadata中可能存在
        framework: this.adapter.getName(),
        bindingExpression,
      },
      selectors: {
        primary: identifiers.primary,
        alternative: identifiers.alternative,
      },
      ...(options && { options }),
    };
  }

  /**
   * 生成字段标识符
   */
  private generateIdentifiers(element: Element): FieldIdentifier {
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

    // Class名选择器
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

    // XPath
    const xpath = this.generateXPath(element);

    // 数据属性
    const dataAttributes: Record<string, string> = {};
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('data-')) {
        dataAttributes[attr.name] = attr.value;
      }
    });

    return {
      primary: selectors[0] || element.tagName.toLowerCase(),
      alternative: selectors.slice(1),
      xpath,
      dataAttributes: Object.keys(dataAttributes).length > 0 ? dataAttributes : undefined,
      structuralPath: parentSelector || undefined,
      contentHash: this.generateContentHash(element),
    };
  }

  /**
   * 生成XPath
   */
  private generateXPath(element: Element): string {
    if (element.id) {
      return `//*[@id='${element.id}']`;
    }

    const path: string[] = [];
    let current: Element | null = element;

    while (current && current !== document.documentElement) {
      let index = 0;
      let hasSameTagSiblings = false;

      if (current.parentNode) {
        const siblings = Array.from(current.parentNode.children);
        const sameTagSiblings = siblings.filter(sib => sib.tagName === current!.tagName);

        if (sameTagSiblings.length > 1) {
          hasSameTagSiblings = true;
          index = sameTagSiblings.indexOf(current) + 1;
        }
      }

      const tagName = current.tagName.toLowerCase();
      const position = hasSameTagSiblings ? `[${index}]` : '';
      path.unshift(`${tagName}${position}`);

      current = current.parentElement;
    }

    return '/' + path.join('/');
  }

  /**
   * 获取父级路径选择器
   */
  private getParentPathSelector(element: Element): string | null {
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
   * 生成内容哈希
   */
  private generateContentHash(element: Element): string {
    const content = [
      element.tagName,
      element.id,
      (element as HTMLInputElement).name,
      element.className,
    ].join('|');

    // 简单的哈希函数
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 转换为32位整数
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * 查找关联标签
   */
  private findLabel(element: Element): string | undefined {
    const input = element as HTMLInputElement;

    // 通过for属性查找
    if (input.id) {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label) {
        return label.textContent?.trim() || undefined;
      }
    }

    // 通过父元素查找
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
}
