import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { 
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8787'
    }
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    },
    rollupOptions: {
      external: [
        'react', 
        'react-dom', 
        'react/jsx-runtime',
        'react-is',
        'react/jsx-dev-runtime',
        'prop-types',
        /^d3-/
      ],
      output: {
        manualChunks: {
          'recharts-vendor': ['recharts'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-label',
            '@radix-ui/react-progress',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip'
          ]
        }
      }
    }
  }
})
