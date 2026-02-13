<template>
  <div class="container">
    <header class="header">
      <div class="header-content">
        <div class="header-icon">
          <img src="/assets/icon32.svg" alt="FormSaver Logo" class="app-icon"/>
        </div>
        <div class="header-text">
          <h1 class="title">FormSaver</h1>
          <p class="subtitle">表单保存助手</p>
        </div>
      </div>
    </header>

    <main class="main">
      <div class="saved-forms-list">
        <template v-if="savedForms.length > 0">
          <div v-for="form in savedForms" :key="form.id" class="form-item">
            <div class="form-url">
              {{ form.url }}
            </div>
            <div class="form-time">
              {{ form.timestamp }}
            </div>
            <button class="btn-delete" @click="deleteForm(form.id)">
              <img src="/assets/delete.svg" alt="删除" class="delete-icon"/>
            </button>
          </div>
        </template>
        <div v-else class="empty-state">
          <div class="empty-icon">📋</div>
          <p class="empty-text">暂无保存的表单</p>
          <p class="empty-subtext">点击右上角扩展图标可保存当前页面表单</p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import {onMounted, ref} from 'vue'
import {useChromeExtension} from '@/composables/useChromeExtension'
import {useMessage} from '@/composables/useMessage'

// 移除TypeScript interface定义
// import { SavedForm } from '@/types/form'

// 响应式数据 - 移除泛型类型注解
const savedForms = ref([])
const {sendMessage} = useChromeExtension()
const {t} = useMessage()

// 删除表单函数 - 移除参数类型注解
const deleteForm = async (formId) => {
  try {
    await sendMessage('deleteForm', {formId})
    // 从列表中移除
    savedForms.value = savedForms.value.filter(form => form.id !== formId)
  } catch (error) {
    console.error('删除表单失败:', error)
  }
}

// 加载保存的表单
const loadSavedForms = async () => {
  try {
    const response = await sendMessage('getSavedForms', {})
    if (response.success && response.data) {
      savedForms.value = response.data
    }
  } catch (error) {
    console.error('加载表单失败:', error)
    // 使用假数据
    loadMockData()
  }
}

// 加载假数据
const loadMockData = () => {
  savedForms.value = [
    {
      id: '1',
      url: 'https://example.com/login',
      timestamp: '2024-01-15 14:30:22',
      data: {
        username: 'testuser',
        password: '******',
        remember: true
      }
    },
    {
      id: '2',
      url: 'https://github.com/settings/profile',
      timestamp: '2024-01-15 10:15:45',
      data: {
        name: '张三',
        email: 'zhangsan@example.com',
        bio: '前端开发者'
      }
    },
    {
      id: '3',
      url: 'https://forms.google.com/example',
      timestamp: '2024-01-14 16:22:18',
      data: {
        title: '项目反馈表',
        description: '请填写您的使用体验',
        rating: '5'
      }
    }
  ]
}

// 组件挂载时加载数据
onMounted(() => {
  loadSavedForms()
})
</script>

<style scoped>
.container {
  width: 400px;
  min-height: 300px;
  background: var(--color-background);
  border-radius: 8px;
  overflow: hidden;
}

.header {
  padding: 16px;
  background: var(--color-header-bg);
  border-bottom: 1px solid var(--color-border);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  flex-shrink: 0;
}

.app-icon {
  width: 32px;
  height: 32px;
  display: block;
}

.header-text {
  flex: 1;
}

.title {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-primary);
}

.subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.main {
  padding: 16px;
}

.saved-forms-list {
  max-height: 400px;
  overflow-y: auto;
}

.form-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background: var(--color-card-bg);
  border-radius: 6px;
  border: 1px solid var(--color-border);
  transition: all 0.2s ease;
}

.form-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.form-url {
  flex: 1;
  font-size: 14px;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 12px;
}

.form-time {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-right: 12px;
  white-space: nowrap;
}

.btn-delete {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-delete:hover {
  background-color: var(--color-danger-light);
}

.delete-icon {
  width: 16px;
  height: 16px;
  display: block;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-text {
  font-size: 16px;
  color: var(--color-text-secondary);
  margin: 0 0 8px 0;
}

.empty-subtext {
  font-size: 14px;
  color: var(--color-text-tertiary);
  margin: 0;
  line-height: 1.4;
}
</style>