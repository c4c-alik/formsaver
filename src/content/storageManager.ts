import { FormData, FormField, FormInfo, StorageData } from './types';

export class StorageManager {
  private static readonly STORAGE_KEY = 'formSaver_data';
  private static readonly MAX_STORAGE_SIZE = 10 * 1024 * 1024; // 5MB

  /**
   * Save form data
   */
  static async saveForm(formData: FormData): Promise<boolean> {
    try {
      const storageData = await this.getStorageData();

      // Use URL as key for storage
      storageData.forms[formData.url] = formData;

      // Check storage size
      const dataSize = JSON.stringify(storageData).length;
      if (dataSize > this.MAX_STORAGE_SIZE) {
        throw new Error('Insufficient storage space');
      }

      await chrome.storage.local.set({ [this.STORAGE_KEY]: storageData });
      return true;
    } catch (error) {
      console.error('Failed to save form:', error);
      return false;
    }
  }

  /**
   * Get form data for specified URL
   */
  static async getForm(url: string): Promise<FormData | null> {
    try {
      const storageData = await this.getStorageData();
      return storageData.forms[url] || null;
    } catch (error) {
      console.error('Failed to get form:', error);
      return null;
    }
  }

  /**
   * Get all saved forms
   */
  static async getAllForms(): Promise<Record<string, FormData>> {
    try {
      const storageData = await this.getStorageData();
      return storageData.forms;
    } catch (error) {
      console.error('Failed to get all forms:', error);
      return {};
    }
  }

  /**
   * Delete form for specified URL
   */
  static async deleteForm(url: string): Promise<boolean> {
    try {
      const storageData = await this.getStorageData();
      if (storageData.forms[url]) {
        delete storageData.forms[url];
        await chrome.storage.local.set({ [this.STORAGE_KEY]: storageData });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete form:', error);
      return false;
    }
  }

  /**
   * Clear all form data
   */
  static async clearAllForms(): Promise<boolean> {
    try {
      const storageData: StorageData = {
        version: '1.0',
        forms: {},
      };
      await chrome.storage.local.set({ [this.STORAGE_KEY]: storageData });
      return true;
    } catch (error) {
      console.error('Failed to clear forms:', error);
      return false;
    }
  }

  /**
   * Get storage data
   */
  private static async getStorageData(): Promise<StorageData> {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEY);
      const storageData = result[this.STORAGE_KEY];

      if (!storageData) {
        // Initialize storage structure
        return {
          version: '1.0',
          forms: {},
        };
      }

      return storageData;
    } catch (error) {
      console.error('Failed to get storage data:', error);
      // Return default structure
      return {
        version: '1.0',
        forms: {},
      };
    }
  }

  /**
   * Migrate old version data (support multi-version upgrade path)
   */
  static async migrateData(): Promise<void> {
    try {
      const storageData = await this.getStorageData();
      const currentVersion = '2.1'; // Current latest version

      // If already latest version, no migration needed
      if (storageData.version === currentVersion) {
        return;
      }

      console.log(
        `Detected old version data v${storageData.version}, starting upgrade to v${currentVersion}`
      );

      // Upgrade step by step according to version order
      while (storageData.version !== currentVersion) {
        await this.upgradeToNextVersion(storageData);
      }

      // Save upgraded data
      await chrome.storage.local.set({ [this.STORAGE_KEY]: storageData });
      console.log(`Data upgrade completed, current version: v${storageData.version}`);
    } catch (error) {
      console.error('Data migration failed:', error);
      throw error; // Re-throw error for upper level handling
    }
  }

  /**
   * Upgrade to next version
   */
  private static async upgradeToNextVersion(storageData: StorageData): Promise<void> {
    const currentVersion = storageData.version;

    switch (currentVersion) {
      case '1.0':
        await this.upgradeFrom10To20(storageData);
        break;
      case '2.0':
        await this.upgradeFrom20To21(storageData);
        break;
      default:
        // Handle unknown version
        console.warn(
          `Unknown version: ${currentVersion}, trying to upgrade directly to latest version`
        );
        storageData.version = '2.1';
        await this.applyDefaultUpgrades(storageData);
    }
  }

  /**
   * Upgrade from 1.0 to 2.0
   */
  private static async upgradeFrom10To20(storageData: StorageData): Promise<void> {
    console.log('Upgrading: v1.0 → v2.0');

    // Add new configuration fields
    (storageData as any).settings = {
      autoSave: false,
      saveInterval: 30000, // 30秒
      maxStorageSize: 5 * 1024 * 1024, // 5MB
      encryptionEnabled: false,
    };

    // Add new metadata fields for each form
    for (const [url, formData] of Object.entries(storageData.forms)) {
      console.log(`Upgrading form data: ${url}`);
      (formData as any).metadata = {
        lastAccessed: new Date().toISOString(),
        accessCount: 0,
        tags: [],
      };

      // Standardize field structure
      formData.formFields = formData.formFields.map(field => ({
        ...field,
        validation: {
          required: false,
          pattern: null,
        },
      }));
    }

    storageData.version = '2.0';
  }

  /**
   * Upgrade from 2.0 to 2.1
   */
  private static async upgradeFrom20To21(storageData: StorageData): Promise<void> {
    console.log('Upgrading: v2.0 → v2.1');

    // Add statistics data
    (storageData as any).statistics = {
      totalSaves: 0,
      totalRestores: 0,
      lastBackup: null,
      storageUsage: 0,
    };

    // Add index optimization for form fields
    for (const formData of Object.values(storageData.forms)) {
      (formData as any).fieldIndex = this.buildFieldIndex(formData.formFields);

      // Add form template identifier
      (formData as any).isTemplate = false;
    }

    // Add cloud sync configuration
    (storageData as any).sync = {
      enabled: false,
      provider: 'none',
      lastSync: null,
      conflictResolution: 'local',
    };

    storageData.version = '2.1';
  }

  /**
   * Apply default upgrade (handle exceptional cases)
   */
  private static async applyDefaultUpgrades(storageData: StorageData): Promise<void> {
    // Ensure necessary fields exist
    if (!(storageData as any).settings) {
      (storageData as any).settings = {
        autoSave: false,
        saveInterval: 30000,
        maxStorageSize: 5 * 1024 * 1024,
        encryptionEnabled: false,
      };
    }

    if (!(storageData as any).statistics) {
      (storageData as any).statistics = {
        totalSaves: 0,
        totalRestores: 0,
        lastBackup: null,
        storageUsage: 0,
      };
    }

    if (!(storageData as any).sync) {
      (storageData as any).sync = {
        enabled: false,
        provider: 'none',
        lastSync: null,
        conflictResolution: 'local',
      };
    }

    // Add missing fields for each form
    for (const formData of Object.values(storageData.forms)) {
      if (!(formData as any).metadata) {
        (formData as any).metadata = {
          lastAccessed: new Date().toISOString(),
          accessCount: 0,
          tags: [],
        };
      }

      if (!(formData as any).fieldIndex) {
        (formData as any).fieldIndex = this.buildFieldIndex(formData.formFields);
      }

      if ((formData as any).isTemplate === undefined) {
        (formData as any).isTemplate = false;
      }
    }
  }

  /**
   * Build field index to improve query performance
   */
  private static buildFieldIndex(formFields: FormField[]): Record<string, number> {
    const index: Record<string, number> = {};

    formFields.forEach((field, idx) => {
      // Use selector as index key
      const key = field.selectors.primary || `field_${idx}`;
      index[key] = idx;

      // Also build index for name attribute
      if (field.attributes.name) {
        index[`name:${field.attributes.name}`] = idx;
      }

      // Build index for id attribute
      if (field.attributes.id) {
        index[`id:${field.attributes.id}`] = idx;
      }
    });

    return index;
  }

  /**
   * Normalize form data format (example migration function)
   */
  private static normalizeFormData(oldForms: any): Record<string, FormData> {
    const normalized: Record<string, FormData> = {};

    // Convert old format to new format
    for (const [url, formObj] of Object.entries(oldForms)) {
      const oldForm = formObj as any;
      normalized[url] = {
        id: oldForm.id || this.generateId(),
        name: oldForm.name || 'Unknown Form',
        url: url,
        savedAt: oldForm.savedAt || new Date().toISOString(),
        formFields: this.normalizeFormFields(oldForm.fields || []),
        formInfo: this.calculateFormInfo(oldForm.fields || []),
      };
    }

    return normalized;
  }

  private static normalizeFormFields(fields: any[]): FormField[] {
    return fields.map(field => ({
      type: field.type || 'text',
      value: field.value,
      attributes: field.attributes || {},
      metadata: field.metadata || {},
      selectors: field.selectors || { primary: '' },
    }));
  }

  private static calculateFormInfo(fields: any[]): FormInfo {
    const fieldTypes: Record<string, number> = {};
    let filledFields = 0;

    fields.forEach(field => {
      const type = field.type || 'text';
      fieldTypes[type] = (fieldTypes[type] || 0) + 1;
      if (field.value && String(field.value).trim()) {
        filledFields++;
      }
    });

    return {
      totalFields: fields.length,
      filledFields,
      fieldTypes,
    };
  }

  private static generateId(): string {
    return 'form_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get storage usage information
   */
  static async getStorageInfo(): Promise<{
    totalForms: number;
    totalSize: number;
    maxSize: number;
    usagePercentage: number;
  }> {
    try {
      const storageData = await this.getStorageData();
      const jsonData = JSON.stringify(storageData);
      const size = new Blob([jsonData]).size;

      return {
        totalForms: Object.keys(storageData.forms).length,
        totalSize: size,
        maxSize: this.MAX_STORAGE_SIZE,
        usagePercentage: Math.round((size / this.MAX_STORAGE_SIZE) * 100),
      };
    } catch (error) {
      console.error('Failed to get storage information:', error);
      return {
        totalForms: 0,
        totalSize: 0,
        maxSize: this.MAX_STORAGE_SIZE,
        usagePercentage: 0,
      };
    }
  }

  /**
   * Export data
   */
  static async exportData(): Promise<string> {
    try {
      const storageData = await this.getStorageData();
      return JSON.stringify(storageData, null, 2);
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }

  /**
   * Import data
   */
  static async importData(data: string): Promise<boolean> {
    try {
      const importedData: StorageData = JSON.parse(data);

      // Validate data structure
      if (!importedData.version || !importedData.forms) {
        throw new Error('Invalid data format');
      }

      await chrome.storage.local.set({ [this.STORAGE_KEY]: importedData });
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }
}
