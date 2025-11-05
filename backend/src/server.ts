import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'node:fs'
import { generateRouter } from './routes/generate'
import { jiraRouter } from './routes/jira'

// Load environment variables from root and backend directories (backend overrides root)
const rootEnvPath = path.resolve(__dirname, '../../.env')
const backendEnvPath = path.resolve(__dirname, '../.env')
console.log(`[env] Root .env path: ${rootEnvPath} exists=${fs.existsSync(rootEnvPath)}`)
// Use override:true to ensure values from .env are applied even if the env already contains different/empty values
dotenv.config({ path: rootEnvPath, override: true })
console.log(`[env] Backend .env path: ${backendEnvPath} exists=${fs.existsSync(backendEnvPath)}`)
dotenv.config({ path: backendEnvPath, override: true })

// Debug environment variables
console.log('Environment variables loaded:')
console.log(`PORT: ${process.env.PORT}`)
console.log(`CORS_ORIGIN: ${process.env.CORS_ORIGIN}`)
console.log(`groq_API_BASE: ${process.env.groq_API_BASE}`)
console.log(`groq_API_KEY: ${process.env.groq_API_KEY ? 'SET' : 'NOT SET'}`)
console.log(`groq_MODEL: ${process.env.groq_MODEL}`)
// Jira summary (no secrets)
console.log(`[Jira env] JIRA_BASE_URL SET: ${!!process.env.JIRA_BASE_URL}`)
console.log(`[Jira env] JIRA_AUTH_TYPE: ${process.env.JIRA_AUTH_TYPE || 'undefined'}`)
console.log(`[Jira env] JIRA_EMAIL SET: ${!!process.env.JIRA_EMAIL}`)
console.log(`[Jira env] JIRA_API_TOKEN SET: ${!!process.env.JIRA_API_TOKEN}`)
if (process.env.JIRA_API_TOKEN) {
  console.log(`[Jira env] JIRA_API_TOKEN length: ${String(process.env.JIRA_API_TOKEN).length}`)
}

// Resilience: if JIRA_API_TOKEN is still not visible in process.env due to formatting issues, try to parse from root .env
if (!process.env.JIRA_API_TOKEN && fs.existsSync(rootEnvPath)) {
  try {
    const envRaw = fs.readFileSync(rootEnvPath, 'utf8')
    const re = /^\s*JIRA_API_TOKEN\s*=\s*(.+)\s*$/m
    const match = re.exec(envRaw)
    if (match) {
      let val = match[1].trim()
      // Strip surrounding quotes if present
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
        val = val.slice(1, -1)
      }
      process.env.JIRA_API_TOKEN = val
      console.log('[Jira env] JIRA_API_TOKEN recovered from .env text line')
      console.log(`[Jira env] JIRA_API_TOKEN SET: ${!!process.env.JIRA_API_TOKEN}`)
      if (process.env.JIRA_API_TOKEN) {
        console.log(`[Jira env] JIRA_API_TOKEN length: ${String(process.env.JIRA_API_TOKEN).length}`)
      }
    }
  } catch (e) {
    console.warn('[env] Failed to recover JIRA_API_TOKEN from .env:', (e as Error).message)
  }
}

const app = express()
const PORT = Number(process.env.PORT) || 8080

// Middleware
// Support multiple allowed origins via comma-separated CORS_ORIGIN
const allowedOriginsArr = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
const allowedOrigins = new Set(allowedOriginsArr)

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (no Origin) and explicit matches
    if (!origin || allowedOrigins.has('*') || allowedOrigins.has(origin)) {
      return callback(null, true)
    }
    return callback(new Error(`Not allowed by CORS: ${origin}`))
  },
  credentials: true,
  exposedHeaders: ['X-Jira-Target-Url']
}))
app.use(express.json({ limit: '10mb' }))

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// API routes
app.use('/api/generate-tests', generateRouter)
app.use('/api/jira', jiraRouter)

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err.message)
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  })
})

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({
    error: 'Route not found'
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`)
  console.log(`📡 API available at http://localhost:${PORT}/api`)
  console.log(`🔍 Health check at http://localhost:${PORT}/api/health`)
})