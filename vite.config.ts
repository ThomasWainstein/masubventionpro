import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import prerender from '@prerenderer/rollup-plugin'
import puppeteerRenderer from '@prerenderer/renderer-puppeteer'

// Public routes to prerender for SEO and LLM crawlers
const publicRoutes = [
  '/',
  '/signup',
  '/inscription',
  '/login',
  '/connexion',
  '/mentions-legales',
  '/cgu',
  '/cgv',
  '/privacy',
  '/cookies',
  '/ai-transparency',
  '/notre-histoire',
]

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    prerender({
      routes: publicRoutes,
      renderer: puppeteerRenderer,
      rendererOptions: {
        renderAfterDocumentEvent: 'prerender-ready',
        timeout: 30000,
      },
      postProcess(renderedRoute) {
        // Add prerendered indicator for debugging
        renderedRoute.html = renderedRoute.html.replace(
          '</head>',
          '<meta name="prerendered" content="true" /></head>'
        )
        return renderedRoute
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001, // Different port from subvention360 (5173)
  },
})
