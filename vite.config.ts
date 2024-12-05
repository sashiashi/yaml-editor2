/// <reference types="vite/client" />
import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5175,
      strictPort: true,
      open: true,
      proxy: {
        '/api/translate': {
          target: 'https://api-free.deepl.com',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/translate/, '/v2/translate'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const apiKey = env.VITE_DEEPL_API_KEY;
              if (!apiKey) {
                console.error('DeepL API key is not set');
                return;
              }
              proxyReq.setHeader('Authorization', `DeepL-Auth-Key ${apiKey}`);
              proxyReq.setHeader('Content-Type', 'application/json');
            });
          }
        }
      }
    }
  }
})