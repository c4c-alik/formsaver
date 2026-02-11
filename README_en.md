# FormSaver - 智能表单数据保存和恢复工具

FormSaver 是一个功能强大的Chrome扩展程序，可以帮助您轻松保存和恢复网页表单数据。

## 🌟 主要特性

- **智能表单检测** - 自动识别页面上的所有表单元素
- **完整数据保存** - 保存包括文本、选择框、复选框等各种类型的表单数据
- **精准数据恢复** - 基于多种选择器策略准确恢复表单数据
- **右键菜单操作** - 通过右键菜单快速保存和恢复表单
- **弹出窗口控制** - 通过扩展图标弹窗进行操作
- **数据管理面板** - 完整的选项页面用于管理和查看保存的数据
- **键盘快捷键** - Ctrl+Shift+S 保存，Ctrl+Shift+R 恢复

## 🚀 安装和使用

### 安装步骤

1. 克隆或下载此仓库
2. 运行 `npm install` 安装依赖
3. 运行 `npm run build` 编译项目
4. 打开Chrome浏览器，进入 `chrome://extensions/`
5. 启用"开发者模式"
6. 点击"加载已解压的扩展程序"
7. 选择项目根目录

### 使用方法

#### 方法一：右键菜单（推荐）

1. 在包含表单的网页上右键点击
2. 选择"保存表单数据"保存当前表单
3. 后续访问同一页面时，右键选择"恢复表单数据"

#### 方法二：弹出窗口

1. 点击浏览器工具栏中的FormSaver图标
2. 在弹出窗口中点击相应按钮

#### 方法三：键盘快捷键

- `Ctrl+Shift+S` - 保存当前页面表单
- `Ctrl+Shift+R` - 恢复已保存的表单

## 📁 项目结构

```
formsaver/
├── src/                    # TypeScript源码
│   ├── types.ts           # 类型定义
│   ├── formCollector.ts   # 表单数据收集器
│   ├── formRestorer.ts    # 表单数据恢复器
│   ├── storageManager.ts  # 存储管理器
│   ├── background.ts      # 后台服务工作者
│   └── content.ts         # 内容脚本
├── popup/                 # 弹出窗口
│   ├── popup.html
│   └── popup.js
├── options/               # 选项页面
│   ├── options.html
│   └── options.js
├── assets/                # 图标资源
├── dist/                  # 编译后的JavaScript文件
├── manifest.json          # 扩展配置文件
├── storage.json          # 存储结构示例
└── package.json          # 项目配置
```

## 💾 数据存储结构

您的表单数据按照以下结构存储：

```json
{
  "version": "1.0",
  "forms": {
    "https://example.com/form": {
      "id": "form_123",
      "name": "示例表单",
      "url": "https://example.com/form",
      "savedAt": "2024-03-15T10:30:00Z",
      "formFields": [
        {
          "type": "text",
          "value": "张三",
          "attributes": {
            "type": "text",
            "name": "username"
          },
          "metadata": {
            "label": "用户名"
          },
          "selectors": {
            "primary": "input[name='username']"
          }
        }
      ],
      "formInfo": {
        "totalFields": 5,
        "filledFields": 3,
        "fieldTypes": {
          "text": 3,
          "select": 1,
          "checkbox": 1
        }
      }
    }
  }
}
```

## 🔧 开发指南

### 项目设置

```bash
# 安装依赖
npm install

# 编译TypeScript
npm run build

# 开发模式（监听文件变化）
npm run dev

# 代码格式化
npm run format

# 代码检查
npm run lint
```

### 核心模块说明

#### FormCollector（表单收集器）

负责从当前页面收集表单数据，包括：

- 识别各种表单元素（input, select, textarea）
- 提取元素属性和值
- 生成多种CSS选择器
- 关联标签文本
- 统计表单信息

#### FormRestorer（表单恢复器）

负责将保存的数据恢复到页面：

- 使用多种策略定位表单元素
- 正确设置不同类型的值
- 触发必要的DOM事件
- 验证恢复可行性

#### StorageManager（存储管理器）

负责数据的持久化存储：

- 使用Chrome存储API
- 数据版本管理
- 存储空间监控
- 数据导入导出功能

## 🛡️ 安全性和隐私

- 所有数据都存储在本地浏览器中
- 不会上传任何数据到外部服务器
- 支持数据加密存储（可选）
- 可以随时清空所有保存的数据

## 📱 浏览器兼容性

- Chrome 88+
- Edge 88+
- 其他基于Chromium的浏览器

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## 🔧 故障排除

### 常见问题

**Q: 为什么有些表单无法保存？**
A: 可能是因为表单包含动态生成的内容或者使用了特殊的框架。可以尝试手动刷新页面后再保存。

**Q: 恢复表单时部分字段没有填充？**
A: 这可能是由于页面加载顺序问题。建议等待页面完全加载后再尝试恢复。

**Q: 如何备份我的表单数据？**
A: 在选项页面中可以导出所有数据为JSON文件。

**Q: 插件会影响页面性能吗？**
A: 不会。插件只在需要时才激活，对页面性能影响极小。
