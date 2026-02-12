<template>
  <div class="container">
    <header class="header">
      <div class="header-content">
        <h1 class="title">FormSaver 设置</h1>
        <p class="subtitle">管理您的表单保存偏好和数据</p>
      </div>
    </header>

    <main class="main">
      <div class="settings-grid">
        <!-- 通用设置 -->
        <section class="card">
          <h2 class="card-title">通用设置</h2>
          <div class="setting-item">
            <label class="setting-label">
              <span class="label-text">启用自动保存</span>
              <span class="label-description">当检测到表单提交时自动保存数据</span>
            </label>
            <label class="switch">
              <input
                type="checkbox"
                v-model="settings.autoSaveEnabled"
                @change="saveSettings"
              >
              <span class="slider"></span>
            </label>
          </div>

          <div class="setting-item">
            <label class="setting-label">
              <span class="label-text">显示通知</span>
              <span class="label-description">操作完成后显示桌面通知</span>
            </label>
            <label class="switch">
              <input
                type="checkbox"
                v-model="settings.showNotifications"
                @change="saveSettings"
              >
              <span class="slider"></span>
            </label>
          </div>
        </section>

        <!-- 数据管理 -->
        <section class="card">
          <h2 class="card-title">数据管理</h2>
          <div class="data-stats">
            <div class="stat-item">
              <span class="stat-label">已保存表单</span>
              <span class="stat-value">{{ stats.savedFormsCount }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">总字段数</span>
              <span class="stat-value">{{ stats.totalFieldsCount }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">占用空间</span>
              <span class="stat-value">{{ formatBytes(stats.storageSize) }}</span>
            </div>
          </div>

          <div class="actions-row">
            <button class="btn btn-secondary" @click="exportData">
              <span class="btn-icon">📤</span>
              导出数据
            </button>
            <button class="btn btn-danger" @click="clearAllData">
              <span class="btn-icon">🗑️</span>
              清空所有数据
            </button>
          </div>
        </section>

        <!-- 已保存表单列表 -->
        <section class="card full-width">
          <h2 class="card-title">已保存表单</h2>
          <div class="table-container">
            <table class="table" v-if="savedForms.length > 0">
              <thead>
              <tr>
                <th>表单名称</th>
                <th>域名</th>
                <th>保存时间</th>
                <th>字段数量</th>
                <th>操作</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="form in savedForms" :key="form.url">
                <td>
                  <div class="form-name" :title="form.name">{{ form.name }}</div>
                </td>
                <td>{{ getDomain(form.url) }}</td>
                <td>{{ formatDate(form.savedAt) }}</td>
                <td>{{ form.fieldsCount }}</td>
                <td>
                  <div class="table-actions">
                    <button
                      class="btn btn-secondary btn-small"
                      @click="restoreForm(form.url)"
                    >
                      恢复
                    </button>
                    <button
                      class="btn btn-danger btn-small"
                      @click="deleteForm(form.url)"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
              </tbody>
            </table>
            <div v-else class="empty-state">
              <div class="empty-icon">📋</div>
              <p class="empty-text">暂无保存的表单</p>
              <p class="empty-subtext">开始使用FormSaver保存您的第一个表单吧！</p>
            </div>
          </div>
        </section>

        <!-- 快捷键设置 -->
        <section class="card">
          <h2 class="card-title">快捷键</h2>
          <div class="shortcut-item">
            <span class="shortcut-label">保存当前表单</span>
            <kbd class="shortcut-key">Ctrl+Shift+S</kbd>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-label">恢复最近表单</span>
            <kbd class="shortcut-key">Ctrl+Shift+R</kbd>
          </div>
          <div class="shortcut-note">
            注意：快捷键功能将在未来的版本中实现
          </div>
        </section>

        <!-- 关于 -->
        <section class="card">
          <h2 class="card-title">关于</h2>
          <div class="about-content">
            <div class="app-info">
              <h3>FormSaver</h3>
              <p>版本：<span>{{ appVersion }}</span></p>
              <p>智能表单数据保存和恢复工具</p>
            </div>
            <div class="links">
              <a href="#" class="link" @click.prevent="openHelp">帮助文档</a>
              <a href="#" class="link" @click.prevent="reportIssue">反馈问题</a>
              <a href="#" class="link" @click.prevent="openGithub">GitHub仓库</a>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- 消息提示 -->
    <div
      v-for="message in messages"
      :key="message.id"
      class="message"
      :class="`message-${message.type}`"
    >
      {{ message.text }}
    </div>
  </div>
</template>

<script setup>
import {onMounted, ref} from 'vue'
import {useChromeExtension} from '../composables/useChromeExtension'
import {useMessage} from '../composables/useMessage'

const {sendMessageToBackground} = useChromeExtension()
const {messages, showMessage} = useMessage()

// 响应式数据
const settings = ref({
  autoSaveEnabled: true,
  showNotifications: true
})

const stats = ref({
  savedFormsCount: 0,
  totalFieldsCount: 0,
  storageSize: 0
})

const savedForms = ref([])
const appVersion = ref('1.0.0')
const loading = ref(false)

// 生命周期钩子
onMounted(async () => {
  await Promise.all([
    loadSettings(),
    loadDataStats(),
    loadSavedForms()
  ])
})

// Load settings
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(['autoSaveEnabled', 'showNotifications'])
    settings.value = {
      autoSaveEnabled: result.autoSaveEnabled ?? true,
      showNotifications: result.showNotifications ?? true
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
  }
}

// Save settings
async function saveSettings() {
  try {
    await chrome.storage.sync.set(settings.value)
    showMessage('Settings saved', 'success')
  } catch (error) {
    console.error('Failed to save settings:', error)
    showMessage('Failed to save settings', 'error')
  }
}

// Load data statistics
async function loadDataStats() {
  try {
    const response = await sendMessageToBackground({
      type: 'GET_SAVED_FORMS'
    })

    if (response?.success && response.forms) {
      const forms = response.forms
      stats.value.savedFormsCount = forms.length
      stats.value.totalFieldsCount = forms.reduce((sum, form) => sum + form.fieldsCount, 0)

      // 计算大致存储大小（简单估算）
      const jsonString = JSON.stringify(forms)
      stats.value.storageSize = new Blob([jsonString]).size
    }
  } catch (error) {
    console.error('Failed to load data statistics:', error)
  }
}

// Load saved forms
async function loadSavedForms() {
  try {
    const response = await sendMessageToBackground({
      type: 'GET_SAVED_FORMS'
    })

    if (response?.success && response.forms) {
      savedForms.value = response.forms
    }
  } catch (error) {
    console.error('Failed to load saved forms:', error)
  }
}

// Export data
async function exportData() {
  try {
    const data = {
      forms: savedForms.value,
      settings: settings.value,
      exportDate: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'})
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `formsaver-export-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    showMessage('Data exported successfully', 'success')
  } catch (error) {
    console.error('Failed to export data:', error)
    showMessage('Failed to export data', 'error')
  }
}

// Clear all data
async function clearAllData() {
  if (!confirm('Are you sure you want to clear all saved form data? This action cannot be undone!')) {
    return
  }

  try {
    // Send message to delete all forms
    const response = await sendMessageToBackground({
      type: 'CLEAR_ALL_FORMS'
    })

    if (response?.success) {
      savedForms.value = []
      stats.value = {
        savedFormsCount: 0,
        totalFieldsCount: 0,
        storageSize: 0
      }
      showMessage('All data cleared', 'success')
    } else {
      showMessage('Failed to clear data', 'error')
    }
  } catch (error) {
    console.error('Failed to clear data:', error)
    showMessage('Failed to clear data', 'error')
  }
}

// Restore form
async function restoreForm(url) {
  try {
    // Switch to corresponding page
    const tabs = await chrome.tabs.query({url: url})
    let tabId

    if (tabs.length > 0) {
      tabId = tabs[0].id
      await chrome.tabs.update(tabId, {active: true})
    } else {
      const newTab = await chrome.tabs.create({url: url})
      tabId = newTab.id
    }

    // Wait for page to load completely before restoring
    setTimeout(async () => {
      try {
        const response = await chrome.tabs.sendMessage(tabId, {
          type: 'RESTORE_FORM'
        })

        if (response?.success) {
          showMessage('Form restored successfully!', 'success')
        }
      } catch (error) {
        console.error('Failed to restore form:', error)
        showMessage(`Restore failed: ${error.message}`, 'error')
      }
    }, 1000)

  } catch (error) {
    console.error('Failed to restore form:', error)
    showMessage('Restore failed: ' + error.message, 'error')
  }
}

// Delete form
async function deleteForm(url) {
  if (!confirm('Are you sure you want to delete this saved form?')) {
    return
  }

  try {
    const response = await sendMessageToBackground({
      type: 'DELETE_FORM',
      data: {url: url}
    })

    if (response?.success) {
      // Remove from list
      const index = savedForms.value.findIndex(form => form.url === url)
      if (index !== -1) {
        savedForms.value.splice(index, 1)
      }

      // Update statistics
      await loadDataStats()
      showMessage('Deleted successfully!', 'success')
    } else {
      showMessage(response?.error || 'Delete failed', 'error')
    }
  } catch (error) {
    console.error('Failed to delete form:', error)
    showMessage('Delete failed: ' + error.message, 'error')
  }
}

// Link click handlers
function openHelp() {
  chrome.tabs.create({url: 'https://github.com/your-repo/formsaver/wiki'})
}

function reportIssue() {
  chrome.tabs.create({url: 'https://github.com/your-repo/formsaver/issues'})
}

function openGithub() {
  chrome.tabs.create({url: 'https://github.com/your-repo/formsaver'})
}

// Utility functions
function getDomain(url) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString('zh-CN')
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
}

.header {
  background: linear-gradient(135deg, #4285f4, #34a853);
  color: white;
  padding: 32px 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.title {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 16px;
  opacity: 0.9;
}

.main {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
  width: 100%;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}

.full-width {
  grid-column: 1 / -1;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #e0e0e0;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label-text {
  font-weight: 500;
  color: #202124;
}

.label-description {
  font-size: 13px;
  color: #5f6368;
}

.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #4285f4;
}

input:checked + .slider:before {
  transform: translateX(26px);
}

.data-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-label {
  display: block;
  font-size: 13px;
  color: #5f6368;
  margin-bottom: 8px;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 600;
  color: #4285f4;
}

.actions-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.table-container {
  overflow-x: auto;
}

.form-name {
  font-weight: 500;
  color: #202124;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.table-actions {
  display: flex;
  gap: 8px;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #e0e0e0;
}

.shortcut-item:last-child {
  border-bottom: none;
}

.shortcut-label {
  font-weight: 500;
  color: #202124;
}

.shortcut-key {
  display: inline-block;
  padding: 4px 8px;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  color: #5f6368;
}

.shortcut-note {
  margin-top: 16px;
  padding: 12px;
  background: #fff9e6;
  border-radius: 8px;
  font-size: 13px;
  color: #5f6368;
  border-left: 3px solid #fbbc04;
}

.about-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.app-info h3 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #4285f4;
}

.app-info p {
  margin-bottom: 4px;
  color: #5f6368;
}

.links {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.link {
  color: #4285f4;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.link:hover {
  color: #3367d6;
  text-decoration: underline;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-content,
  .main {
    padding: 0 16px;
  }

  .settings-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .actions-row {
    flex-direction: column;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }

  .data-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .shortcut-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .full-width {
    grid-column: 1;
  }
}

@media (max-width: 480px) {
  .title {
    font-size: 24px;
  }

  .card-title {
    font-size: 18px;
  }

  .data-stats {
    grid-template-columns: 1fr;
  }

  .links {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
