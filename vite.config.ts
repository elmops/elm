import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';
import { defineConfig as defineVitestConfig } from 'vitest/config';

export default defineConfig(
  defineVitestConfig({
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@data': path.resolve(__dirname, './src/1-data'),
        '@schema': path.resolve(__dirname, './src/1-data/1-schema'),
        '@model': path.resolve(__dirname, './src/1-data/2-model'),
        '@state': path.resolve(__dirname, './src/1-data/3-state'),

        '@process': path.resolve(__dirname, './src/2-process'),
        '@utility': path.resolve(__dirname, './src/2-process/1-utility'),
        '@engine': path.resolve(__dirname, './src/2-process/2-engine'),
        '@manager': path.resolve(__dirname, './src/2-process/3-manager'),

        '@presentation': path.resolve(__dirname, './src/3-presentation'),
        '@pattern': path.resolve(__dirname, './src/3-presentation/1-pattern'),
        '@component': path.resolve(
          __dirname,
          './src/3-presentation/2-component'
        ),
        '@view': path.resolve(__dirname, './src/3-presentation/3-view'),
      },
      extensions: ['.vue', '.js', '.ts', '.jsx', '.tsx', '.json'],
    },
    server: {
      open: '/',
    },
    test: {
      environment: 'happy-dom',
      globals: true,
      env: {
        NODE_ENV: 'test',
      },
    },
  })
);
