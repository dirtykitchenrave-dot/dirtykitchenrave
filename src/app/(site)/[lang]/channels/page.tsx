import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PodcastPlayer } from '@/components/PodcastPlayer'
import { YouTubeShelf, type YouTubeClip } from '@/components/YouTubeShelf'
import { isLang } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { loadPodcast } from '@/lib/podcast'
import { LINKS } from '@/lib/site'
import { pageMeta } from '@/lib/view'

type Props = { params: Promise<{ lang: string }> }

const YT_FEED = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCkDNqfxqe9wkus4Ni74kpcw'

function ytTitle(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** Latest clip in the player, three more in the strip. */
async function loadYouTubeClips(): Promise<YouTubeClip[]> {
  try {
    const res = await fetch(YT_FEED, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const xml = await res.text()
    const clips: YouTubeClip[] = []
    for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)) {
      if (clips.length >= 4) break
      const block = m[1]
      const id = (block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i)?.[1] || '').trim()
      const title = ytTitle(block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '')
      if (!title || !/^[a-zA-Z0-9_-]{11}$/.test(id)) continue
      clips.push({ id, title })
    }
    return clips
  } catch (err) {
    console.error('[channels] youtube', err)
    return []
  }
}

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!isLang(lang)) return {}
  const d = getDictionary(lang)
  return pageMeta(lang, '/channels', d.hub.title, d.hub.metaDescription)
}

export default async function ChannelsPage({ params }: Props) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const d = getDictionary(lang)
  const [show, clips] = await Promise.all([loadPodcast(), loadYouTubeClips()])

  return (
    <>
      <header className="page-head ink">
        <h1 className="page-title" style={{ fontStretch: '62%', fontSize: 'clamp(4rem,14vw,12rem)' }}>
          {d.hub.title}
        </h1>
        <p className="lead">{d.hub.lead}</p>
        <nav className="ch-jumps" aria-label={d.hub.jumps}>
          <a href="#podcast">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="8.2" cy="7.6" r="2.15" fill="currentColor" />
              <path
                d="M4.1 17.8c.75-2.85 2.45-4.15 4.1-4.15s3.35 1.3 4.1 4.15"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <path
                d="M15.1 7.1a3.7 3.7 0 0 1 0 5.4M17.7 4.8a6.6 6.6 0 0 1 0 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
            <span>{d.channels.podcast}</span>
          </a>
          <a href="#soundcloud">
            <svg viewBox="0 0 32 18" aria-hidden="true">
              <rect x="0" y="12" width="2.1" height="6" fill="currentColor" />
              <rect x="3.1" y="9.5" width="2.1" height="8.5" fill="currentColor" />
              <rect x="6.2" y="7" width="2.1" height="11" fill="currentColor" />
              <rect x="9.3" y="4.5" width="2.1" height="13.5" fill="currentColor" />
              <rect x="12.4" y="2.2" width="2.1" height="15.8" fill="currentColor" />
              <rect x="15.5" y="0.6" width="2.1" height="17.4" fill="currentColor" />
              <path
                d="M20.2 4.2a4.3 4.3 0 0 1 4.15 3.15 3.35 3.35 0 0 1-.15 6.65H19.4a4.15 4.15 0 0 1 .8-9.8z"
                fill="currentColor"
              />
            </svg>
            <span>{d.hub.soundcloud}</span>
          </a>
          <a href="#youtube">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M23.5 6.2a3 3 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3 3 0 0 0 .5 6.2 31.8 31.8 0 0 0 0 12a31.8 31.8 0 0 0 .5 5.8 3 3 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3 3 0 0 0 2.12-2.14A31.8 31.8 0 0 0 24 12a31.8 31.8 0 0 0-.5-5.8zM9.75 15.57V8.43L15.84 12l-6.09 3.57z"
              />
            </svg>
            <span>{d.hub.youtube}</span>
          </a>
        </nav>
      </header>

      <section id="podcast">
        <div className="ch-head">
          <div>
            <h2>{d.podcast.title}</h2>
            <p>{d.podcast.lead}</p>
          </div>
          <a href={LINKS.podcast} target="_blank" rel="noopener noreferrer">
            {d.podcast.cta}
          </a>
        </div>
        {show ? (
          <PodcastPlayer
            lang={lang}
            show={show}
            labels={{
              episodes: d.podcast.episodes,
              play: d.podcast.play,
              pause: d.podcast.pause,
              nowPlaying: d.podcast.nowPlaying,
              seek: d.podcast.seek,
              error: d.podcast.error,
              episode: d.podcast.episode,
              openEpisode: d.podcast.openEpisode,
            }}
          />
        ) : (
          <div className="pad">
            <p className="lead">{d.podcast.empty}</p>
          </div>
        )}
      </section>

      <section id="soundcloud">
        <div className="ch-head">
          <div>
            <h2>{d.hub.soundcloud}</h2>
            <p>{d.hub.soundcloudLead}</p>
          </div>
          <a href={LINKS.soundcloud} target="_blank" rel="noopener noreferrer">
            {d.hub.openSoundcloud}
          </a>
        </div>
        <div className="ch-embed sc">
          <iframe
            title={`${d.hub.soundcloud} — Dirty Kitchen Rave`}
            src={LINKS.soundcloudEmbed}
            loading="lazy"
            allow="autoplay; encrypted-media"
            scrolling="no"
          />
        </div>
      </section>

      <section id="youtube">
        <div className="ch-head">
          <div>
            <h2>{d.hub.youtube}</h2>
            <p>{d.hub.youtubeLead}</p>
          </div>
          <a href={LINKS.youtube} target="_blank" rel="noopener noreferrer">
            {d.hub.openYoutube}
          </a>
        </div>
        {clips.length > 0 ? (
          <YouTubeShelf videos={clips} label={d.hub.moreVideos} />
        ) : (
          <div className="ch-embed yt">
            <iframe
              title={`${d.hub.youtube} — Dirty Kitchen Rave`}
              src={LINKS.youtubeEmbed}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        )}
      </section>
    </>
  )
}
