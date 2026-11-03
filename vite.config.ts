import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [react(), VitePWA({
    registerType: 'prompt', injectRegister: false,
    includeAssets: ['icon.svg', 'apple-touch-icon.png', 'icons/*.png'],
    manifest: {
      id: './', name: 'CALC Pro', short_name: 'CALC Pro', description: 'Private, offline scientific, graphing, programmer, engineering and unit calculator.',
      theme_color: '#0c1018', background_color: '#0c1018', display: 'standalone', start_url: './', scope: './', lang: 'en', orientation: 'any',
      categories: ['productivity','utilities','education'],
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: { globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'], cleanupOutdatedCaches: true, navigateFallback: 'index.html', maximumFileSizeToCacheInBytes: 2_000_000 },
  }), {
    name: 'production-security-policy', apply: 'build',
    transformIndexHtml(html) { return html.replace('<head>', '<head>\n<meta http-equiv="Content-Security-Policy" content="default-src &#39;self&#39;; script-src &#39;self&#39;; style-src &#39;self&#39; &#39;unsafe-inline&#39;; img-src &#39;self&#39; data: blob:; connect-src &#39;self&#39;; worker-src &#39;self&#39;; object-src &#39;none&#39;; base-uri &#39;self&#39;; form-action &#39;none&#39;" />') },
  }],
  server: { host: '127.0.0.1', port: 5173 }, preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  test: { environment: 'node', include: ['src/**/*.test.ts'], reporters: ['default','json'], outputFile: { json: 'evidence/unit-results.json' } },
})
