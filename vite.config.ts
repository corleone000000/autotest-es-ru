import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/** En `npm run dev` sirve /api/import con la misma función que se despliega en Vercel. */
function devApi(): Plugin {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/import', async (req, res) => {
        try {
          const mod = await server.ssrLoadModule('/api/import.ts')
          await mod.default(req, res)
        } catch (error) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: String(error) }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Solo para el servidor (función /api): las variables sin prefijo VITE_ nunca llegan al navegador.
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of ['ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL', 'IMPORT_TOKEN']) {
    if (env[key] && !process.env[key]) process.env[key] = env[key]
  }

  return {
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '1.0.0'),
    },
    build: {
      rollupOptions: {
        // El banco de preguntas va en su propio chunk: cambia a otro ritmo que el código.
        output: { manualChunks: (id: string) => (id.includes('/src/data/') ? 'bank' : undefined) },
      },
    },
    plugins: [
      devApi(),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
        manifest: {
          name: 'AutoTest ES/RU — Permiso B',
          short_name: 'AutoTest',
          description: 'Practica el examen teórico del permiso B (DGT) en español, con traducción al ruso.',
          lang: 'es',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#0f172a',
          theme_color: '#1d4ed8',
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // Todo el banco (JSON), las señales y los vídeos quedan disponibles sin conexión.
          globPatterns: ['**/*.{js,css,html,svg,png,jpg,webp,woff2,mp4,webm}'],
          maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
        },
      }),
    ],
  }
})
