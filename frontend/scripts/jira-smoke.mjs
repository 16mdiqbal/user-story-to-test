#!/usr/bin/env node

// Minimal smoke test to fetch a Jira issue using environment variables.
// Usage (zsh):
//   ISSUE_KEY=PROJ-123 JIRA_BASE_URL="https://your-domain.atlassian.net" \
//   JIRA_AUTH_TYPE=basic JIRA_EMAIL="you@example.com" JIRA_API_TOKEN="xxx" \
//   npm run -w frontend test:jira
// Or pass the issue key as an arg: node scripts/jira-smoke.mjs PROJ-123

import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { parse as dotenvParse } from 'dotenv'

// Env is loaded by dotenv-cli via package.json script; keep path utils for optional debug only
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Proactively parse root .env for JIRA_* in case the runner didn't inject them
let rootVars = {}
try {
  const repoRoot = path.resolve(__dirname, '../../')
  const rootEnv = path.join(repoRoot, '.env')
  if (fs.existsSync(rootEnv)) {
    const buf = fs.readFileSync(rootEnv)
    rootVars = dotenvParse(buf)
    // Debug parse result for JIRA_ keys
    const masked = rootVars.JIRA_BASE_URL ? rootVars.JIRA_BASE_URL.replace(/([^:]*:\/\/).*/, '$1***') : ''
    console.error('[jira-smoke] rootVars JIRA keys:', Object.keys(rootVars).filter(k=>k.startsWith('JIRA_')))
    console.error('[jira-smoke] rootVars.JIRA_BASE_URL =', masked)
    try {
      const txt = fs.readFileSync(rootEnv, 'utf8')
      const l = txt.split(/\r?\n/).find(s => s.startsWith('JIRA_BASE_URL')) || ''
      console.error('[jira-smoke] JIRA_BASE_URL line literal =', JSON.stringify(l))
    } catch {}
  }
} catch {}

const { env, exit } = process

function fail(message) {
  console.error(`[jira-smoke] ERROR: ${message}`)
  exit(1)
}

function info(message) {
  console.log(`[jira-smoke] ${message}`)
}

const baseUrl = (env.JIRA_BASE_URL || rootVars.JIRA_BASE_URL || env.VITE_JIRA_BASE_URL || '').trim()
const rawAuthType = (env.JIRA_AUTH_TYPE || rootVars.JIRA_AUTH_TYPE || env.VITE_JIRA_AUTH_TYPE || 'basic').trim()
const authType = rawAuthType.toLowerCase()
const issueKey = (env.JIRA_ISSUE_KEY || rootVars.JIRA_ISSUE_KEY || env.ISSUE_KEY || process.argv[2] || '').trim()

if (!baseUrl) fail('JIRA_BASE_URL is required')
if (!issueKey) fail('ISSUE_KEY (or argv[2]) is required')

let authHeader = ''
if (authType === 'basic') {
  const email = (env.JIRA_EMAIL || rootVars.JIRA_EMAIL || env.VITE_JIRA_EMAIL || '').trim()
  const token = (env.JIRA_API_TOKEN || rootVars.JIRA_API_TOKEN || env.VITE_JIRA_API_TOKEN || '').trim()
  if (!email || !token) fail('JIRA_EMAIL and JIRA_API_TOKEN are required for basic auth')
  const creds = Buffer.from(`${email}:${token}`).toString('base64')
  authHeader = `Basic ${creds}`
} else if (authType === 'bearer') {
  const bearer = (env.JIRA_BEARER || rootVars.JIRA_BEARER || env.VITE_JIRA_BEARER || '').trim()
  if (!bearer) fail('JIRA_BEARER is required for bearer auth')
  authHeader = `Bearer ${bearer}`
} else {
  fail(`Unsupported JIRA_AUTH_TYPE: ${rawAuthType}`)
}

const trimmedBase = baseUrl.replace(/\/$/, '')
// Do not pass specific fields; hit the default endpoint
const url = `${trimmedBase}/rest/api/3/issue/${encodeURIComponent(issueKey)}`

info(`Fetching: ${url}`)
try {
  const res = await fetch(url, {
    headers: {
      'Authorization': authHeader,
      'Accept': 'application/json'
    }
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(`[jira-smoke] HTTP ${res.status} ${res.statusText}`)
    console.error(text)
    exit(1)
  }

  const data = await res.json()
  const key = data.key || issueKey
  const summary = data?.fields?.summary || ''
  info(`Success. key=${key} summary=${JSON.stringify(summary)}`)

  // Extract description (ADF) and perform a light validation for user-provided sections
  const adf = data?.fields?.description
  const adfToText = (node) => {
    if (!node) return ''
    if (typeof node === 'string') return node
    const type = node.type
    if (type === 'text') return node.text || ''
    if (type === 'hardBreak') return '\n'
    let out = ''
    const parts = Array.isArray(node.content) ? node.content : []
    for (const child of parts) out += adfToText(child)
    // Add newlines after common block nodes for readability
    if (['paragraph','heading','blockquote','listItem','codeBlock'].includes(type)) out += '\n'
    return out
  }
  const descriptionText = adfToText(adf).split(/\n{3,}/g).join('\n\n').trim()
  const hasUserStory = /\bUser\s*Story\s*:/i.test(descriptionText)
  const hasAcceptance = /\bAcceptance\s*Criteria\s*:/i.test(descriptionText)

  console.log(JSON.stringify({
    key,
    summary,
    hasDescription: Boolean(adf),
    containsUserStorySection: hasUserStory,
    containsAcceptanceCriteriaSection: hasAcceptance,
    descriptionPreview: descriptionText ? descriptionText.slice(0, 400) : ''
  }, null, 2))

  exit(0)
} catch (err) {
  console.error('[jira-smoke] Request failed:', err?.message || err)
  exit(1)
}
