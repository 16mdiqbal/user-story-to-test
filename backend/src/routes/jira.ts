import express from 'express'
import fetch from 'node-fetch'

export const jiraRouter = express.Router()

// GET /api/jira/issue/:key -> proxies to Jira using server-side env credentials
jiraRouter.get('/issue/:key', async (req, res): Promise<void> => {
  try {
    const key = req.params.key
    const baseUrl = (process.env.JIRA_BASE_URL || '').replace(/\/$/, '')
    const authType = (process.env.JIRA_AUTH_TYPE || 'basic').toLowerCase()
    const email = process.env.JIRA_EMAIL || ''
    const apiToken = process.env.JIRA_API_TOKEN || ''
    const bearer = process.env.JIRA_BEARER || ''
    const clientAuth = (req.header('authorization') || '').trim()

    if (!baseUrl) {
  res.status(500).json({ error: 'JIRA_BASE_URL is not configured on the server' })
  return
    }

    let authHeader = ''
    if (clientAuth && (clientAuth.startsWith('Basic ') || clientAuth.startsWith('Bearer '))) {
      console.warn('[jira proxy] Using client-provided Authorization header')
      authHeader = clientAuth
    } else if (authType === 'basic') {
      if (email && apiToken) {
        const creds = Buffer.from(`${email}:${apiToken}`).toString('base64')
        authHeader = `Basic ${creds}`
      } else {
        res.status(500).json({ error: 'JIRA_EMAIL/JIRA_API_TOKEN are not configured on the server' })
        return
      }
    } else if (authType === 'bearer') {
      if (bearer) {
        authHeader = `Bearer ${bearer}`
      } else {
        res.status(500).json({ error: 'JIRA_BEARER is not configured on the server' })
        return
      }
    } else {
      res.status(500).json({ error: `Unsupported JIRA_AUTH_TYPE: ${authType}` })
      return
    }

    const url = `${baseUrl}/rest/api/3/issue/${encodeURIComponent(key)}`
    const jirares = await fetch(url, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    })

    // Pass through content, but also include a debug header with the actual Jira URL
    res.set('X-Jira-Target-Url', url)
    const text = await jirares.text()
    res
      .status(jirares.status)
      .type(jirares.headers.get('content-type') || 'application/json')
      .send(text)
    return
  } catch (err: any) {
    console.error('[jira proxy] error:', err?.message || err)
    res.status(500).json({ error: 'Failed to fetch Jira issue' })
    return
  }
})
