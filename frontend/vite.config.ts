// frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],

  // Path aliases for cleaner imports (@/components/Navbar)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Development server
  server: {
    port: 3000,
    host: true, // Allow external access
    proxy: {
      // Proxy /api/* calls to backend
      '/api': {
        target: 'http://localhost:4000', // backend (Express + API)
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
      // Proxy Socket.IO to backend (handles /socket.io/*)
      '/socket.io': {
        target: 'http://localhost:4000', // same backend
        ws: true, // enable WebSocket proxying
        changeOrigin: true,
      },
    },
  },

  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: true, // Enable source maps for debugging
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          editor: ['@monaco-editor/react'],
          network: ['axios', 'socket.io-client'],
        },
      },
    },
  },

  // Global polyfills for Monaco + Socket.IO
  define: {
    global: 'globalThis',
  },

  // Optimize deps for faster startup
  optimizeDeps: {
    include: [
      '@monaco-editor/react',
      'socket.io-client',
    ],
  },

  // CSS preprocessing
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`,
      },
    },
  },
})
