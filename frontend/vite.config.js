import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { baseURL } from './src/service/api'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: `${baseURL}`,
        changeOrigin: true,
      }
    }
  }
})