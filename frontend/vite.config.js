import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '$lib': path.resolve('./src/lib')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:2052',
        ws: true,
        changeOrigin: true
      },
      '/api': {
        target: 'http://localhost:2052',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:2052',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: '../public',
    emptyOutDir: false, // Don't delete existing files like uploads, emojis, etc.
    sourcemap: true,
    rollupOptions: {
      output: {
        // Organize build output
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    }
  }
})
