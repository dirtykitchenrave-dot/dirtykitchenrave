export type ChannelTrack = {
  id: string
  title: string
  summary: string
  publishedAt: string
  durationSec: number | null
  pageUrl: string | null
  audioUrl: string | null
  videoId: string | null
}

const YT_FEED = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCkDNqfxqe9wkus4Ni74kpcw'
const SC_FEED = 'https://feeds.soundcloud.com/users/soundcloud:users:1130133241/sounds.rss'

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

function isoDate(raw: string): string {
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}

function summaryOf(title: string, raw: string): string {
  const summary = stripHtml(raw)
  return summary.toLowerCase() === title.toLowerCase() ? '' : summary
}

function isSoundCloudAudio(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && u.hostname.toLowerCase() === 'feeds.soundcloud.com'
  } catch {
    return false
  }
}

export async function loadSoundCloud(): Promise<ChannelTrack[]> {
  try {
    const res = await fetch(SC_FEED, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const xml = await res.text()
    const items: ChannelTrack[] = []
    for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
      if (items.length >= 80) break
      const block = m[1]
      const title = textTag(block, 'title')
      const audioUrl = decodeEntities(block.match(/<enclosure\b[^>]*\burl="([^"]+)"/i)?.[1] || '')
      if (!title || !isSoundCloudAudio(audioUrl)) continue
      const pageUrl = textTag(block, 'link')
      items.push({
        id: textTag(block, 'guid') || audioUrl,
        title,
        summary: summaryOf(title, textTag(block, 'description') || textTag(block, 'itunes:summary')),
        publishedAt: isoDate(textTag(block, 'pubDate')),
        durationSec: parseDuration(textTag(block, 'itunes:duration')),
        pageUrl: pageUrl.startsWith('https://soundcloud.com/') ? pageUrl : null,
        audioUrl,
        videoId: null,
      })
    }
    return items
  } catch (err) {
    console.error('[channels] soundcloud', err)
    return []
  }
}

export async function loadYouTube(): Promise<ChannelTrack[]> {
  try {
    const res = await fetch(YT_FEED, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const xml = await res.text()
    const items: ChannelTrack[] = []
    for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)) {
      if (items.length >= 30) break
      const block = m[1]
      const videoId = (block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i)?.[1] || '').trim()
      const title = textTag(block, 'title')
      if (!title || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) continue
      items.push({
        id: videoId,
        title,
        summary: summaryOf(title, textTag(block, 'media:description')),
        publishedAt: isoDate(textTag(block, 'published')),
        durationSec: null,
        pageUrl: `https://www.youtube.com/watch?v=${videoId}`,
        audioUrl: null,
        videoId,
      })
    }
    return items
  } catch (err) {
    console.error('[channels] youtube', err)
    return []
  }
}
