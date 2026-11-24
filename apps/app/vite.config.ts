import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'prompt',
            injectRegister: false, // registered from main.tsx (no inline script: strict CSP)
            includeAssets: ['favicon-32.png', 'favicon-32-light.png', 'apple-touch-icon.png', 'brand/*.png'],
            manifest: {
                name: 'CodeArchy',
                short_name: 'CodeArchy',
                description: "Your codebase's architecture, computed in your browser. Private by default: nothing is uploaded to CodeArchy.",
                theme_color: '#15171c',
                background_color: '#15171c',
                display: 'standalone',
                start_url: '/',
                icons: [
                    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                    { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,svg,png}'],
                // The voice worker (kokoro-js + transformers.js) loads only once a viewer opts into the
                // natural voice: cached on first use (below), not precached for everyone.
                globIgnores: ['**/kokoro.worker-*.js', 'voice/**'],
                navigateFallback: '/index.html',
                // The engine's wasm and samples are versioned by content hash: cache them on first use, forever.
                runtimeCaching: [
                    {
                        urlPattern: ({ url }) => url.pathname.startsWith('/engine/'),
                        handler: 'CacheFirst',
                        options: { cacheName: 'codearchy-engine', expiration: { maxEntries: 80 } },
                    },
                    // The voice's worker and ONNX Runtime (the model itself is cached by transformers.js, once).
                    {
                        urlPattern: ({ url }) => url.pathname.startsWith('/voice/ort/') || /^\/assets\/kokoro\.worker-.*\.js$/.test(url.pathname),
                        handler: 'CacheFirst',
                        options: { cacheName: 'codearchy-voice-runtime', expiration: { maxEntries: 4 } },
                    },
                ],
            },
        }),
    ],
    // One React, even when `pnpm dev:link` links a codearchy checkout with its own node_modules.
    resolve: { dedupe: ['react', 'react-dom'] },
    worker: { format: 'es' },
    build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 2500 },
    server: { port: 5180 },
});
