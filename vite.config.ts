import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'مدرسة إبن الجراح الثانوية الخاصة بنات',
        short_name: 'ابن الجراح',
        description: 'نظام إدارة شؤون الطالبات: الدرجات، الرسوم، والجدول الدراسي',
        lang: 'ar',
        dir: 'rtl',
        theme_color: '#441967',
        background_color: '#f8f4fc',
        display: 'standalone',
        start_url: '/',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
  },
})
