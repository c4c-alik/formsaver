<template>
  <div class="container">
    <header class="header">
      <h1 class="title">FormSaver</h1>
      <p class="subtitle">智能表单保存工具</p>
    </header>

    <main class="main">
      <!-- 当前页面表单状态 -->
      <section class="section">
        <h2 class="section-title">当前页面</h2>
        <div class="page-info card">
          <div class="url-display">{{ currentPageUrl }}</div>
          <div class="status-indicator">
            <span 
              class="status-dot" 
              :class="{ 
                'has-forms': hasForms, 
                'no-forms': !hasForms,
                'loading': loadingStatus
              }"
            ></span>
            <span class="status-text">{{ statusText }}</span>
          </div>
        </div>
      </section>

      <!-- 操作按钮区域 -->
      <section class="section">
        <h2 class="section-title">操作</h2>
        <div class="actions">
          <button 
            class="btn btn-primary" 
            :disabled="!hasForms || loading"
            @click="saveForm"
          >
            <span class="btn-icon">💾</span>
            保存表单
          </button>
          <button 
            class="btn btn-secondary" 
            :disabled="!hasSavedForms || loading"
            @click="restoreForm"
          >
            <span class="btn-icon">🔄</span>
            恢复表单
          </button>
        </div>
      </section>

      <!-- 已保存表单列表 -->
      <section class="section">
        <h2 class="section-title">已保存表单</h2>
        <div class="saved-forms-container">
          <div v-if="savedForms.length === 0" class="empty-state">
            <div class="empty-icon">📋</div>
            <p class="empty-text">暂无保存的表单</p>
          </div>
          <div v-else class="saved-forms-list">
            <div 
              v-for="form in savedForms" 
              :key="form.url"
              class="saved-form-item card"
            >
              <div class="form-info">
                <div class="form-name" :title="form.name">{{ form.name }}</div>
                <div class="form-meta">
                  <span>{{ getDomain(form.url) }}</span>
                  <span>•</span>
                  <span>{{ formatDate(form.savedAt) }}</span>
                  <span>•</span>
                  <span>{{ form.fieldsCount }}个字段</span>
                </div>
              </div>
              <div class="form-actions">
                <button 
                  class="btn btn-secondary btn-small"
                  @click="restoreSpecificForm(form.url)"
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
            </div>
          </div>
        </div>
      </section>

      <!-- 设置链接 -->
      <footer class="footer">
        <button class="btn btn-link" @click="openOptions">
          <span class="btn-icon">⚙️</span>
          扩展设置
        </button>
      </footer>
    </main>

    <!-- 加载遮罩 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner">
        <div class="spinner"></div>
        处理中...
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useChromeExtension } from '../composables/useChromeExtension'
import { useMessage } from '../composables/useMessage'

const { sendMessageToTab, sendMessageToBackground } = useChromeExtension()
const { showMessage } = useMessage()

// 响应式数据
const currentTab = ref(null)
const currentPageUrl = ref('')
const hasForms = ref(false)
const hasSavedForms = ref(false)
const savedForms = ref([])
const loading = ref(false)
const loadingStatus = ref(true)
const statusText = ref('检测中...')

// Get current tab information
onMounted(async () => {
  try {
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true
    })
    
    if (tabs.length > 0) {
      currentTab.value = tabs[0]
      currentPageUrl.value = tabs[0].url
      
      await Promise.all([
        checkFormStatus(),
        loadSavedForms()
      ])
    }
  } catch (error) {
    console.error('Popup initialization failed:', error)
    showMessage('Initialization failed, please refresh the page and try again', 'error')
  } finally {
    loadingStatus.value = false
  }
})

// Check form status
async function checkFormStatus() {
  try {
    const response = await sendMessageToTab(currentTab.value.id, {
      type: 'CHECK_FORM_STATUS'
    })

    hasForms.value = response?.hasForms || false
    statusText.value = hasForms.value ? 'Form found' : 'No forms'
    
    // Check if there are saved forms
    const savedResponse = await sendMessageToBackground({
      type: 'GET_SAVED_FORMS'
    })

    if (savedResponse?.success && savedResponse.forms) {
      const currentUrlForms = savedResponse.forms.filter(
        form => form.url === currentTab.value.url
      )
      hasSavedForms.value = currentUrlForms.length > 0
    }
  } catch (error) {
    console.error('Failed to check form status:', error)
    hasForms.value = false
    statusText.value = 'Unable to detect'
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

// Save form
async function saveForm() {
  if (!hasForms.value) return
  
  loading.value = true
  try {
    const response = await sendMessageToTab(currentTab.value.id, {
      type: 'SAVE_FORM'
    })

    if (response?.success) {
      showMessage('Form saved successfully!', 'success')
      await Promise.all([
        loadSavedForms(),
        checkFormStatus()
      ])
    } else {
      showMessage(response?.error || 'Save failed', 'error')
    }
  } catch (error) {
    console.error('Failed to save form:', error)
    showMessage('Save failed: ' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

// Restore form
async function restoreForm() {
  if (!hasSavedForms.value) return
  
  loading.value = true
  try {
    const response = await sendMessageToTab(currentTab.value.id, {
      type: 'RESTORE_FORM'
    })

    if (response?.success) {
      showMessage('Form restored successfully!', 'success')
    } else {
      showMessage(response?.error || 'Restore failed', 'error')
    }
  } catch (error) {
    console.error('Failed to restore form:', error)
    showMessage('Restore failed: ' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

// Restore specific form
async function restoreSpecificForm(url) {
  try {
    // Switch to corresponding page
    const tabs = await chrome.tabs.query({ url: url })
    let tabId
    
    if (tabs.length > 0) {
      tabId = tabs[0].id
      await chrome.tabs.update(tabId, { active: true })
    } else {
      const newTab = await chrome.tabs.create({ url: url })
      tabId = newTab.id
    }

    // Wait for page to load completely before restoring
    setTimeout(async () => {
      try {
        const response = await sendMessageToTab(tabId, {
          type: 'RESTORE_FORM'
        })
        
        if (response?.success) {
          showMessage('Form restored successfully!', 'success')
        }
      } catch (error) {
        console.error('恢复表单失败:', error)
      }
    }, 1000)

  } catch (error) {
    console.error('Failed to restore specific form:', error)
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
      data: { url: url }
    })

    if (response?.success) {
      showMessage('Deleted successfully!', 'success')
      await Promise.all([
        loadSavedForms(),
        checkFormStatus()
      ])
    } else {
      showMessage(response?.error || 'Delete failed', 'error')
    }
  } catch (error) {
    console.error('Failed to delete form:', error)
    showMessage('Delete failed: ' + error.message, 'error')
  }
}

// Open settings page
function openOptions() {
  chrome.runtime.openOptionsPage()
  window.close()
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
  return new Date(dateString).toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.container {
  width: 320px;
  min-height: 400px;
  display: flex;
  flex-direction: column;
}

.header {
  padding: 16px;
  background: linear-gradient(135deg, #4285f4, #34a853);
  color: white;
  text-align: center;
}

.title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 4px;
}

.subtitle {
  font-size: 12px;
  opacity: 0.9;
}

.main {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  color: #202124;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e0e0e0;
}

.page-info {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
}

.url-display {
  font-size: 12px;
  color: #5f6368;
  word-break: break-all;
  margin-bottom: 8px;
  font-family: monospace;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #fbbc04;
  transition: background-color 0.3s ease;
}

.status-dot.has-forms {
  background-color: #34a853;
}

.status-dot.no-forms {
  background-color: #5f6368;
}

.status-dot.loading {
  background-color: #4285f4;
  animation: pulse 1.5s ease-in-out infinite;
}

.status-text {
  font-size: 13px;
  color: #5f6368;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn-link {
  background: transparent;
  color: #4285f4;
  font-weight: 400;
  width: 100%;
}

.btn-link:hover {
  background-color: #f8f9fa;
}

.btn-icon {
  font-size: 16px;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
}

.saved-forms-container {
  max-height: 200px;
  overflow-y: auto;
}

.saved-forms-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.saved-form-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  transition: all 0.2s ease;
}

.saved-form-item:hover {
  border-color: #4285f4;
  box-shadow: 0 2px 8px rgba(66, 133, 244, 0.1);
}

.form-info {
  flex: 1;
  min-width: 0;
}

.form-name {
  font-size: 13px;
  font-weight: 500;
  color: #202124;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.form-meta {
  font-size: 11px;
  color: #5f6368;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-left: 12px;
}

.footer {
  padding: 16px;
  border-top: 1px solid #e0e0e0;
  text-align: center;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-weight: 500;
  color: #5f6368;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>