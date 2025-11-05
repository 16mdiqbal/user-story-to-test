import { defineConfig, loadEnv } from 'vite'
import path from 'node:path'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env from repo root and frontend folder, then merge
  const rootDir = path.resolve(__dirname, '..')
  const rootEnv = loadEnv(mode, rootDir, '')
  const feEnv = loadEnv(mode, process.cwd(), '')
  const merged = { ...rootEnv, ...feEnv }

  // Derive VITE_* values from either VITE_* or root JIRA_* keys to allow single .env at repo root
  const VITE_JIRA_BASE_URL = merged.VITE_JIRA_BASE_URL || merged.JIRA_BASE_URL || ''
  const VITE_JIRA_AUTH_TYPE = merged.VITE_JIRA_AUTH_TYPE || merged.JIRA_AUTH_TYPE || 'basic'
  const VITE_JIRA_EMAIL = merged.VITE_JIRA_EMAIL || merged.JIRA_EMAIL || ''
  const VITE_JIRA_API_TOKEN = merged.VITE_JIRA_API_TOKEN || merged.JIRA_API_TOKEN || ''
  const VITE_JIRA_ACCEPTANCE_FIELD = merged.VITE_JIRA_ACCEPTANCE_FIELD || merged.JIRA_ACCEPTANCE_FIELD || ''
  const VITE_JIRA_DIRECT = merged.VITE_JIRA_DIRECT || merged.JIRA_DIRECT || 'false'
  const VITE_JIRA_FORWARD_BASIC = merged.VITE_JIRA_FORWARD_BASIC || merged.JIRA_FORWARD_BASIC || 'false'

  const target = VITE_JIRA_BASE_URL
  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_JIRA_BASE_URL': JSON.stringify(VITE_JIRA_BASE_URL),
      'import.meta.env.VITE_JIRA_AUTH_TYPE': JSON.stringify(VITE_JIRA_AUTH_TYPE),
      'import.meta.env.VITE_JIRA_EMAIL': JSON.stringify(VITE_JIRA_EMAIL),
      'import.meta.env.VITE_JIRA_API_TOKEN': JSON.stringify(VITE_JIRA_API_TOKEN),
      'import.meta.env.VITE_JIRA_ACCEPTANCE_FIELD': JSON.stringify(VITE_JIRA_ACCEPTANCE_FIELD),
      'import.meta.env.VITE_JIRA_DIRECT': JSON.stringify(VITE_JIRA_DIRECT),
      'import.meta.env.VITE_JIRA_FORWARD_BASIC': JSON.stringify(VITE_JIRA_FORWARD_BASIC),
      // Also expose the non-VITE variables in case you only set JIRA_* in root .env
      'import.meta.env.JIRA_BASE_URL': JSON.stringify(merged.JIRA_BASE_URL || ''),
      'import.meta.env.JIRA_AUTH_TYPE': JSON.stringify(merged.JIRA_AUTH_TYPE || ''),
      'import.meta.env.JIRA_EMAIL': JSON.stringify(merged.JIRA_EMAIL || ''),
      'import.meta.env.JIRA_API_TOKEN': JSON.stringify(merged.JIRA_API_TOKEN || ''),
      'import.meta.env.JIRA_ACCEPTANCE_FIELD': JSON.stringify(merged.JIRA_ACCEPTANCE_FIELD || ''),
      'import.meta.env.JIRA_DIRECT': JSON.stringify(merged.JIRA_DIRECT || ''),
    },
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
