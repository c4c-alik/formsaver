// 核心引擎
export { FormEngine } from './FormEngine';

// 类型定义
export type { FrameworkAdapter, FieldIdentifier } from './types/interfaces';

// 适配器
export { NativeHtmlAdapter } from './adapters/NativeHtmlAdapter';
export { VueAdapter } from './adapters/VueAdapter';
export { AdapterManager } from './adapters/AdapterManager';

// 层次结构
export { FormDiscoveryLayer } from './layers/FormDiscoveryLayer';
export { FieldParsingLayer } from './layers/FieldParsingLayer';
