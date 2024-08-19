import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { defineConfig as defineVitestConfig } from 'vitest/config'

export default defineConfig(
  defineVitestConfig({
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      environment: 'happy-dom',
      globals: true,
      env: {
        NODE_ENV: 'test',
      },
    },
  })
)
