import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'
const frontend = resolve(__dirname, '../..')
export default defineConfig({
  root: frontend,
  plugins: [vue()],
  define: { __INTLIFY_JIT_COMPILATION__: true },
  resolve: { alias: { '@': resolve(frontend, 'src'), 'vue-i18n': 'vue-i18n/dist/vue-i18n.runtime.esm-bundler.js' } },
  test: { globals: true, environment: 'jsdom', setupFiles: [resolve(frontend, 'src/__tests__/setup.ts')], include: ['verification/latest-review-20260915/*.spec.ts'], maxWorkers: 2, minWorkers: 1 }
})
