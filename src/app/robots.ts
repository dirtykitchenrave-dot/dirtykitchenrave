import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/site'

/** Short links and the API are not pages. Legal pages stay crawlable and carry noindex. */
const PRIVATE = ['/api/', '/en/r/', '/es/r/']

/** Named so a later disallow on `*` cannot hide the site from answer engines. OAI-SearchBot is the one that cites. */
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'Google-Extended',
  'PerplexityBot',
  'Perplexity-User',
  'Applebot-Extended',
  'meta-externalagent',
]

export default function robots(): MetadataRoute.Robots {
  if (!SITE.indexable) {
    return { rules: [{ userAgent: '*', disallow: '/' }] }
  }
  const allow = { allow: '/', disallow: PRIVATE }
  return {
    rules: [{ userAgent: '*', ...allow }, ...AI_CRAWLERS.map((userAgent) => ({ userAgent, ...allow }))],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  }
}
