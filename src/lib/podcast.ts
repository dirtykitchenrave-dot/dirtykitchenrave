import type { Lang } from '@/i18n/config'

/** Public Podbean feed (the same one Apple Podcasts uses). Audio files stay on their CDN. */
const FEED_URL = 'https://feed.podbean.com/dirtykitchenrave/feed.xml'

export type PodcastEpisode = {
  id: string
  title: string
  summary: string
  /** ISO-8601. Empty when the feed date does not parse. */
  publishedAt: string
  durationSec: number | null
  audioUrl: string
  pageUrl: string | null
  episode: number | null
}

export type PodcastShow = {
  title: string
  artwork: string | null
  episodes: PodcastEpisode[]
}

function decodeEntities(raw: string): string {
  return raw
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function stripHtml(raw: string): string {
  const decoded = decodeEntities(raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'))
  return decoded
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function textTag(block: string, tag: string): string {
  const safe = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = block.match(new RegExp(`<${safe}(?:\\s[^>]*)?>([\\s\\S]*?)</${safe}>`, 'i'))
  return m ? stripHtml(m[1]) : ''
}

function parseDuration(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null
  if (/^\d+$/.test(t)) return Number(t)
  const parts = t.split(':').map((n) => Number(n))
  if (parts.some((n) => !Number.isFinite(n))) return null
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return null
}

function isPodbeanHttps(url: string, audio: boolean): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return false
    const host = u.hostname.toLowerCase()
    if (audio) return host === 'mcdn.podbean.com' || host.endsWith('.podbean.com')
    return host.endsWith('.podbean.com')
  } catch {
    return false
  }
}

export function parsePodcastRss(xml: string): PodcastShow {
  const head = xml.split(/<item\b/i)[0] || xml
  const artwork = head.match(/<itunes:image\b[^>]*\bhref="([^"]+)"/i)?.[1] || ''
  const episodes: PodcastEpisode[] = []

  for (const m of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    if (episodes.length >= 80) break
    const block = m[1]
    const audioUrl = decodeEntities(block.match(/<enclosure\b[^>]*\burl="([^"]+)"/i)?.[1] || '')
    const title = textTag(block, 'title')
    if (!title || !isPodbeanHttps(audioUrl, true)) continue

    let summary = textTag(block, 'description') || textTag(block, 'itunes:summary')
    if (summary.toLowerCase() === title.toLowerCase()) summary = ''

    const published = new Date(textTag(block, 'pubDate'))
    const episodeRaw = textTag(block, 'itunes:episode')
    const episode = /^\d+$/.test(episodeRaw) ? Number(episodeRaw) : null
    const pageUrl = textTag(block, 'link')
    const id = textTag(block, 'guid') || audioUrl

    episodes.push({
      id,
      title,
      summary,
      publishedAt: Number.isNaN(published.getTime()) ? '' : published.toISOString(),
      durationSec: parseDuration(textTag(block, 'itunes:duration')),
      audioUrl,
      pageUrl: pageUrl && isPodbeanHttps(pageUrl, false) ? pageUrl : null,
      episode,
    })
  }

  return {
    title: textTag(head, 'title') || 'The DIRTY KITCHEN RAVE Podcast',
    artwork: artwork && isPodbeanHttps(artwork, false) ? artwork : null,
    episodes,
  }
}

export function formatPodcastClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
  return `${m}:${String(r).padStart(2, '0')}`
}

/** London calendar day, so server and browser render the same date. */
export function formatPodcastDate(iso: string, lang: Lang): string {
  const d = new Date(iso)
  if (!iso || Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-ES' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/London',
  }).format(d)
}

export async function loadPodcast(): Promise<PodcastShow | null> {
  try {
    const res = await fetch(FEED_URL, {
      next: { revalidate: 3600 },
      headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
    })
    if (!res.ok) {
      console.error('[podcast] feed', res.status)
      return null
    }
    const show = parsePodcastRss(await res.text())
    return show.episodes.length ? show : null
  } catch (err) {
    console.error('[podcast] feed', err)
    return null
  }
}
