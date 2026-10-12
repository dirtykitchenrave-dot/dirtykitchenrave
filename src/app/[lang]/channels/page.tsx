import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ChannelsBoard, type ChannelSection } from '@/components/ChannelList'
import { isLang } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { loadSoundCloud, loadYouTube, type ChannelTrack } from '@/lib/channels'
import { loadPodcast } from '@/lib/podcast'
import { LINKS } from '@/lib/site'
import { pageMeta } from '@/lib/view'

type Props = { params: Promise<{ lang: string }> }

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
  const [show, soundcloud, youtube] = await Promise.all([loadPodcast(), loadSoundCloud(), loadYouTube()])

  const podcast: ChannelTrack[] = show
    ? show.episodes.map((ep) => ({
        id: ep.id,
        title: ep.title,
        summary: ep.summary,
        publishedAt: ep.publishedAt,
        durationSec: ep.durationSec,
        pageUrl: ep.pageUrl,
        audioUrl: ep.audioUrl,
        videoId: null,
      }))
    : []

  const sections: ChannelSection[] = [
    {
      id: 'podcast',
      title: d.podcast.title,
      lead: d.podcast.lead,
      href: LINKS.podcast,
      cta: d.podcast.cta,
      items: podcast,
    },
    {
      id: 'soundcloud',
      title: d.hub.soundcloud,
      lead: d.hub.soundcloudLead,
      href: LINKS.soundcloud,
      cta: d.hub.openSoundcloud,
      items: soundcloud,
    },
    {
      id: 'youtube',
      title: d.hub.youtube,
      lead: d.hub.youtubeLead,
      href: LINKS.youtube,
      cta: d.hub.openYoutube,
      items: youtube,
    },
  ]

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
      <ChannelsBoard
        lang={lang}
        sections={sections}
        labels={{
          play: d.podcast.play,
          pause: d.podcast.pause,
          seek: d.podcast.seek,
          error: d.hub.error,
          showAll: d.hub.showAll,
          showLess: d.hub.showLess,
          empty: d.hub.empty,
          open: d.hub.open,
        }}
      />
    </>
  )
}
