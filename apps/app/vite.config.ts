import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'prompt',
            injectRegister: false, // registered from main.tsx (no inline script: strict CSP)
            includeAssets: ['icon.svg'],
            manifest: {
                name: 'CodeArchy',
                short_name: 'CodeArchy',
                description: "Your codebase's architecture, computed in your browser. Your code never leaves your machine.",
                theme_color: '#15171c',
                background_color: '#15171c',
                display: 'standalone',
                start_url: '/',
                icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,svg}'],
                navigateFallback: '/index.html',
                // The engine's wasm and samples are versioned by content hash: cache them on first use, forever.
                runtimeCaching: [
                    {
                        urlPattern: ({ url }) => url.pathname.startsWith('/engine/'),
                        handler: 'CacheFirst',
                        options: { cacheName: 'codearchy-engine', expiration: { maxEntries: 80 } },
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
