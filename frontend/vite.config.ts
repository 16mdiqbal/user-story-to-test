import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load VITE_* vars from env files so the dev server proxy sees them
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_JIRA_BASE_URL
  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      // Optional proxy to Jira for dev to avoid CORS; activated when VITE_JIRA_BASE_URL is set
      proxy: target
        ? {
            '/jira': {
              target,
              changeOrigin: true,
              secure: true,
              rewrite: (path: string) => path.replace(/^\/jira/, ''),
            }
          }
        : undefined,
    }
  }
})