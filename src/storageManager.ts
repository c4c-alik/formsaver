import { FormData, FormField, FormInfo, StorageData } from './types';

export class StorageManager {
  private static readonly STORAGE_KEY = 'formSaver_data';
  private static readonly MAX_STORAGE_SIZE = 10 * 1024 * 1024; // 5MB

  /**
   * 保存表单数据
   */
  static async saveForm(formData: FormData): Promise<boolean> {
    try {
      const storageData = await this.getStorageData();

      // 使用URL作为key存储
      storageData.forms[formData.url] = formData;

      // 检查存储大小
      const dataSize = JSON.stringify(storageData).length;
      if (dataSize > this.MAX_STORAGE_SIZE) {
        throw new Error('存储空间不足');
      }

      await chrome.storage.local.set({ [this.STORAGE_KEY]: storageData });
      return true;
    } catch (error) {
      console.error('保存表单失败:', error);
      return false;
    }
  }

  /**
   * 获取指定URL的表单数据
   */
  static async getForm(url: string): Promise<FormData | null> {
    try {
      const storageData = await this.getStorageData();
      return storageData.forms[url] || null;
    } catch (error) {
      console.error('获取表单失败:', error);
      return null;
    }
  }

  /**
   * 获取所有保存的表单
   */
  static async getAllForms(): Promise<Record<string, FormData>> {
    try {
      const storageData = await this.getStorageData();
      return storageData.forms;
    } catch (error) {
      console.error('获取所有表单失败:', error);
      return {};
    }
  }

  /**
   * 删除指定URL的表单
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
      console.error('删除表单失败:', error);
      return false;
    }
  }

  /**
   * 清空所有表单数据
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
      console.error('清空表单失败:', error);
      return false;
    }
  }

  /**
   * 获取存储数据
   */
  private static async getStorageData(): Promise<StorageData> {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEY);
      const storageData = result[this.STORAGE_KEY];

      if (!storageData) {
        // 初始化存储结构
        return {
          version: '1.0',
          forms: {},
        };
      }

      return storageData;
    } catch (error) {
      console.error('获取存储数据失败:', error);
      // 返回默认结构
      return {
        version: '1.0',
        forms: {},
      };
    }
  }

  /**
   * 迁移旧版本数据（支持多版本升级路径）
   */
  static async migrateData(): Promise<void> {
    try {
      const storageData = await this.getStorageData();
      const currentVersion = '2.1'; // 当前最新版本

      // 如果已经是最新版本，无需迁移
      if (storageData.version === currentVersion) {
        return;
      }

      console.log(`检测到旧版本数据 v${storageData.version}，开始升级到 v${currentVersion}`);

      // 按版本顺序逐步升级
      while (storageData.version !== currentVersion) {
        await this.upgradeToNextVersion(storageData);
      }

      // 保存升级后的数据
      await chrome.storage.local.set({ [this.STORAGE_KEY]: storageData });
      console.log(`数据升级完成，当前版本: v${storageData.version}`);
    } catch (error) {
      console.error('数据迁移失败:', error);
      throw error; // 重新抛出错误以便上层处理
    }
  }

  /**
   * 升级到下一个版本
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
        // 处理未知版本
        console.warn(`未知版本: ${currentVersion}，尝试直接升级到最新版本`);
        storageData.version = '2.1';
        await this.applyDefaultUpgrades(storageData);
    }
  }

  /**
   * 从1.0升级到2.0
   */
  private static async upgradeFrom10To20(storageData: StorageData): Promise<void> {
    console.log('正在升级: v1.0 → v2.0');

    // 添加新的配置字段
    (storageData as any).settings = {
      autoSave: false,
      saveInterval: 30000, // 30秒
      maxStorageSize: 5 * 1024 * 1024, // 5MB
      encryptionEnabled: false,
    };

    // 为每个表单添加新的元数据字段
    for (const [url, formData] of Object.entries(storageData.forms)) {
      console.log(`正在升级表单数据: ${url}`);
      (formData as any).metadata = {
        lastAccessed: new Date().toISOString(),
        accessCount: 0,
        tags: [],
      };

      // 标准化字段结构
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
   * 从2.0升级到2.1
   */
  private static async upgradeFrom20To21(storageData: StorageData): Promise<void> {
    console.log('正在升级: v2.0 → v2.1');

    // 添加统计数据
    (storageData as any).statistics = {
      totalSaves: 0,
      totalRestores: 0,
      lastBackup: null,
      storageUsage: 0,
    };

    // 为表单字段添加索引优化
    for (const formData of Object.values(storageData.forms)) {
      (formData as any).fieldIndex = this.buildFieldIndex(formData.formFields);

      // 添加表单模板标识
      (formData as any).isTemplate = false;
    }

    // 添加云同步配置
    (storageData as any).sync = {
      enabled: false,
      provider: 'none',
      lastSync: null,
      conflictResolution: 'local',
    };

    storageData.version = '2.1';
  }

  /**
   * 应用默认升级（处理异常情况）
   */
  private static async applyDefaultUpgrades(storageData: StorageData): Promise<void> {
    // 确保必要的字段存在
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

    // 为每个表单添加缺失的字段
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
   * 构建字段索引以提高查询性能
   */
  private static buildFieldIndex(formFields: FormField[]): Record<string, number> {
    const index: Record<string, number> = {};

    formFields.forEach((field, idx) => {
      // 使用选择器作为索引键
      const key = field.selectors.primary || `field_${idx}`;
      index[key] = idx;

      // 也为name属性建立索引
      if (field.attributes.name) {
        index[`name:${field.attributes.name}`] = idx;
      }

      // 为id属性建立索引
      if (field.attributes.id) {
        index[`id:${field.attributes.id}`] = idx;
      }
    });

    return index;
  }

  /**
   * 标准化表单数据格式（示例迁移函数）
   */
  private static normalizeFormData(oldForms: any): Record<string, FormData> {
    const normalized: Record<string, FormData> = {};

    // 转换旧格式到新格式
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
   * 获取存储使用情况
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
      console.error('获取存储信息失败:', error);
      return {
        totalForms: 0,
        totalSize: 0,
        maxSize: this.MAX_STORAGE_SIZE,
        usagePercentage: 0,
      };
    }
  }

  /**
   * 导出数据
   */
  static async exportData(): Promise<string> {
    try {
      const storageData = await this.getStorageData();
      return JSON.stringify(storageData, null, 2);
    } catch (error) {
      console.error('导出数据失败:', error);
      throw error;
    }
  }

  /**
   * 导入数据
   */
  static async importData(data: string): Promise<boolean> {
    try {
      const importedData: StorageData = JSON.parse(data);

      // 验证数据结构
      if (!importedData.version || !importedData.forms) {
        throw new Error('无效的数据格式');
      }

      await chrome.storage.local.set({ [this.STORAGE_KEY]: importedData });
      return true;
    } catch (error) {
      console.error('导入数据失败:', error);
      return false;
    }
  }
}
