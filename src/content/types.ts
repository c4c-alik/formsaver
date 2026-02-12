// Storage settings
export interface StorageSettings {
  autoSave: boolean;
  saveInterval: number;
  maxStorageSize: number;
  encryptionEnabled: boolean;
}

// Statistics data
export interface StorageStatistics {
  totalSaves: number;
  totalRestores: number;
  lastBackup: string | null;
  storageUsage: number;
}

// Sync configuration
export interface SyncConfig {
  enabled: boolean;
  provider: 'none' | 'drive' | 'dropbox' | 'onedrive';
  lastSync: string | null;
  conflictResolution: 'local' | 'remote' | 'manual';
}

// Form metadata
export interface FormMetadata {
  lastAccessed: string;
  accessCount: number;
  tags: string[];
}

// Field validation rules
export interface FieldValidation {
  required: boolean;
  pattern: string | null;
}

// Form field type definition
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

// Form information statistics
export interface FormInfo {
  totalFields: number;
  filledFields: number;
  fieldTypes: Record<string, number>;
}

// Single form data structure
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

// Storage structure
export interface StorageData {
  version: string;
  forms: Record<string, FormData>;
  settings?: StorageSettings;
  statistics?: StorageStatistics;
  sync?: SyncConfig;
}

// Message type definition
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
