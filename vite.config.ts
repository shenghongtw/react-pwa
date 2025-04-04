import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import manifest from './manifest.json';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      manifest,
      includeAssets: ['favicon.svg', 'favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      // 在开发环境中启用 PWA 进行测试
      devOptions: { 
        enabled: true
      },
      registerType: 'autoUpdate',
      workbox: { 
        globPatterns: ['**/*.{js,css,html}', '**/*.{svg,png,jpg,gif}'],
        clientsClaim: true,
        skipWaiting: true
      },
    }),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 確保正確生成 JavaScript
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    }
  }
});
