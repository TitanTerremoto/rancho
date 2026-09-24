import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// GitHub Pages serves the project from /rancho/; the dev server stays at the root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/rancho/' : '/',
  root: 'src',
  publicDir: '../public',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // Two places, two pages: the ranch at the root and Sky's bay one folder in.
    rollupOptions: {
      input: {
        rancho: fileURLToPath(new URL('./src/index.html', import.meta.url)),
        sky: fileURLToPath(new URL('./src/sky/index.html', import.meta.url)),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['**/*.{test,spec}.{ts,tsx}'],
  },
}))
