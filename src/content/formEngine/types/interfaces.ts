/**
 * 框架适配器接口
 */
export interface FrameworkAdapter {
  /** 获取适配器名称 */
  getName(): string;

  /** 检查当前页面是否兼容此框架 */
  isCompatible(): boolean;

  /** 获取表单元素 */
  getFormElements(root: HTMLElement): HTMLElement[];

  /** 获取字段值 */
  getFieldValue(element: HTMLElement): any;

  /** 设置字段值 */
  setFieldValue(element: HTMLElement, value: any): void;

  /** 获取字段的绑定表达式 */
  getBindingExpression?(element: HTMLElement): string | undefined;
}

/**
 * 字段标识符接口
 */
export interface FieldIdentifier {
  /** 主要CSS选择器 */
  primary: string;

  /** 备用选择器列表 */
  alternative?: string[];

  /** XPath路径 */
  xpath?: string;

  /** 数据属性 */
  dataAttributes?: Record<string, string>;

  /** 结构路径 */
  structuralPath?: string;

  /** 内容哈希 */
  contentHash?: string;
}
