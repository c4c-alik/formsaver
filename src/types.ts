// 存储设置
export interface StorageSettings {
  autoSave: boolean;
  saveInterval: number;
  maxStorageSize: number;
  encryptionEnabled: boolean;
}

// 统计数据
export interface StorageStatistics {
  totalSaves: number;
  totalRestores: number;
  lastBackup: string | null;
  storageUsage: number;
}

// 同步配置
export interface SyncConfig {
  enabled: boolean;
  provider: 'none' | 'drive' | 'dropbox' | 'onedrive';
  lastSync: string | null;
  conflictResolution: 'local' | 'remote' | 'manual';
}

// 表单元数据
export interface FormMetadata {
  lastAccessed: string;
  accessCount: number;
  tags: string[];
}

// 字段验证规则
export interface FieldValidation {
  required: boolean;
  pattern: string | null;
}

// 表单字段类型定义
export interface FormField {
  type: string;
  value: string | boolean | number;
  attributes: {
    type?: string;
    name?: string;
    id?: string;
    [key: string]: string | undefined;
  };
  metadata: {
    label?: string;
    placeholder?: string;
  };
  selectors: {
    primary: string;
    alternative?: string[];
  };
  options?: Array<{
    value: string;
    text: string;
    selected: boolean;
  }>;
  validation?: FieldValidation;
}

// 表单信息统计
export interface FormInfo {
  totalFields: number;
  filledFields: number;
  fieldTypes: Record<string, number>;
}

// 单个表单数据结构
export interface FormData {
  id: string;
  name: string;
  url: string;
  savedAt: string;
  formFields: FormField[];
  formInfo: FormInfo;
  metadata?: FormMetadata;
  fieldIndex?: Record<string, number>;
  isTemplate?: boolean;
}

// 存储结构
export interface StorageData {
  version: string;
  forms: Record<string, FormData>;
  settings?: StorageSettings;
  statistics?: StorageStatistics;
  sync?: SyncConfig;
}

// 消息类型定义
export type MessageType =
  | 'SAVE_FORM'
  | 'RESTORE_FORM'
  | 'GET_SAVED_FORMS'
  | 'DELETE_FORM'
  | 'FORM_SAVED'
  | 'FORM_RESTORED'
  | 'ERROR'
  | 'GET_STORAGE_INFO'
  | 'EXPORT_DATA'
  | 'IMPORT_DATA'
  | 'CLEAR_ALL_FORMS';

export interface Message {
  type: MessageType;
  data?: any;
  url?: string;
  formData?: FormData;
}
