import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/ISA-Cosmos/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@arch': path.resolve(__dirname, 'src/core/arch'),
      '@ui': path.resolve(__dirname, 'src/ui'),
      '@visualizers': path.resolve(__dirname, 'src/visualizers'),
    }
  }
})
