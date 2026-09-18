import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { apiClient } from '../../src/api/client'
import App from './preview.vue'
import '../../src/style.css'

// Isolated local fixture: no authentication, backend connection or model calls.
apiClient.defaults.adapter = async config => {
  if (config.url === '/admin/groups/1/stats') return { config, status: 200, statusText: 'OK', headers: {}, data: { group_id: 1, group_name: '本地合成分组', total_api_keys: 3, active_api_keys: 1, total_accounts: 2, total_requests: 3, total_tokens: 49, total_cost: 32, total_actual_cost: 16, total_account_cost: 13, balance_cost: 12, subscription_cost: 4, zero_charge_requests: 1, average_duration_ms: 2000, from: null, to: null, generated_at: '2026-09-14T12:00:00Z' } }
  throw new Error('本地界面验证禁止网络 API 请求')
}
createApp(App).use(createPinia()).mount('#app')
