import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { qrcode } from 'vite-plugin-qrcode';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  base: '/kitchen-sync/',
  server: {
    host: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    basicSsl(),
    qrcode({
      filter: (url) => !url.includes('localhost') && !url.includes('127.0.0.1')
    }),
    {
      name: 'cross-origin-isolation',
      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
          res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
          next();
        });
      },
    },
    VitePWA({
      devOptions: {
        enabled: true,
      },
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Kitchen Sync',
        short_name: 'KitchenSync',
        description: 'AI-powered pantry inventory with in-browser food detection',
        theme_color: '#16a34a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        id: '/kitchen-sync/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // ONNX WASM runtime (~21 MB) — cache on first use, not during install
            urlPattern: /\.wasm$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'wasm-cache',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // HuggingFace model files — cache on first use
            urlPattern: /^https:\/\/(huggingface\.co|cdn-lfs\.hf\.co|cdn-lfs-us-1\.hf\.co|cdn-lfs-us-1\.huggingface\.co)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'hf-model-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: { statuses: [0, 200] },
              matchOptions: { ignoreVary: true },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
