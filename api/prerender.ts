import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Prerender.io Integration for Bot/Crawler Requests
 *
 * This serverless function serves pre-rendered HTML to bots and crawlers.
 *
 * Usage:
 * 1. Sign up at https://prerender.io (free tier: 1000 pages/month)
 * 2. Add PRERENDER_TOKEN to Vercel Environment Variables
 * 3. Configure Prerender.io to use your sitemap.xml for caching
 *
 * For automatic bot detection, configure Prerender.io's middleware integration
 * or use Cloudflare Workers to route bot traffic to this endpoint.
 */

// Bot user agents that should receive pre-rendered content
const BOT_AGENTS = [
  'googlebot',
  'bingbot',
  'yandex',
  'baiduspider',
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'slackbot',
  'redditbot',
  'applebot',
  'whatsapp',
  'discordbot',
  'telegrambot',
  // AI crawlers
  'perplexitybot',
  'perplexity',
  'claudebot',
  'claude-web',
  'anthropic-ai',
  'chatgpt-user',
  'gptbot',
  'oai-searchbot',
  'ccbot',
  'google-extended',
  'cohere-ai',
  'bytespider',
]

function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase()
  return BOT_AGENTS.some(bot => ua.includes(bot))
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userAgent = req.headers['user-agent'] || ''
  const path = (req.query.path as string) || '/'

  // Construct the full URL
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'www.masubventionpro.com'
  const fullUrl = `https://${host}${path}`

  // Check if this is a bot request
  const isBotRequest = isBot(userAgent)

  // Get Prerender.io token
  const prerenderToken = process.env.PRERENDER_TOKEN

  // If not a bot or no token, redirect to origin
  if (!isBotRequest || !prerenderToken) {
    return res.redirect(302, path)
  }

  try {
    // Fetch pre-rendered content from Prerender.io
    const prerenderUrl = `https://service.prerender.io/${fullUrl}`

    const response = await fetch(prerenderUrl, {
      method: 'GET',
      headers: {
        'X-Prerender-Token': prerenderToken,
        'User-Agent': userAgent,
      },
    })

    if (!response.ok) {
      console.error(`Prerender.io error: ${response.status} ${response.statusText}`)
      return res.redirect(302, path)
    }

    const html = await response.text()

    // Set response headers
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('X-Prerendered', 'true')
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200')

    return res.status(200).send(html)
  } catch (error) {
    console.error('Prerender fetch error:', error)
    return res.redirect(302, path)
  }
}
