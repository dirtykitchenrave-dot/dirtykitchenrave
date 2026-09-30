'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { Lang } from '@/i18n/config'
import { splitLinkedNames } from '@/lib/format'
import PlatformLinks, { type PlatformLabels } from './PlatformLinks'
import { usePlayer, type PlayerTrack } from './Player'

export interface TrackRow {
  id: number
  position: number
  title: string
  mix: string
  /** Display string ("A, B & C"). */
  artists: string
  /** Plain names, used for the Spotify search fallback. */
  artistNames: string[]
  /** Each name links to its artist page. */
  artistLinks: { name: string; slug: string }[]
  /** Remix credit ("Gruv42 Remix"). Names that match a remixer become links. */
  remixerLinks: { name: string; slug: string }[]
  bpm: number | null
  key: string | null
  length: string | null
  sampleUrl: string | null
  beatportUrl: string | null
  spotifyUrl: string | null
  tidalUrl: string | null
  /** Small cover (250px). Shown per row when `showArtwork` is on (artist pages). */
  artwork: string | null
  releaseTitle?: string
  releaseHref: string
}

export interface TrackListLabels extends PlatformLabels {
  play: string
  pause: string
  noPreview: string
  bpm: string
  share: string
  copied: string
  tapToPlay: string
  playAll: string
  stop: string
  count: string
}

/**
 * Listenable tracklist (release and artist pages), modelled on the Optimal Breaks Beatport lists:
 * Play all / Stop, per-row preview through the global queue, BPM + key, share link, Spotify / TIDAL / Beatport.
 * Shared links (?play=beatport:<id>) highlight the row and ask to tap play — never autoplay.
 */
export default function TrackList({
  tracks,
  queueKey,
  sharePath,
  showArtwork = false,
  lang,
  labels,
}: {
  tracks: TrackRow[]
  queueKey: string
  /** Page used for share links (current page). */
  sharePath: string
  showArtwork?: boolean
  lang: Lang
  labels: TrackListLabels
}) {
  const { current, playing, queueKey: activeKey, playQueue, toggleTrack, stop } = usePlayer()
  const [highlight, setHighlight] = useState<number | null>(null)
  const [copied, setCopied] = useState<number | null>(null)

  const queue: PlayerTrack[] = useMemo(
    () =>
      tracks
        .filter((t) => t.sampleUrl)
        .map((t) => ({
          id: t.id,
          title: t.title,
          mix: t.mix,
          artists: t.artists,
          artistLinks: t.artistLinks.map((a) => ({ name: a.name, href: `/${lang}/artists/${a.slug}` })),
          remixerLinks: t.remixerLinks.map((a) => ({ name: a.name, href: `/${lang}/artists/${a.slug}` })),
          artwork: t.artwork,
          sampleUrl: t.sampleUrl!,
          beatportUrl: t.beatportUrl,
          href: `${t.releaseHref}#t-${t.id}`,
        })),
    [tracks, lang],
  )
  const mine = activeKey === queueKey && current !== null

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('play')
    const m = p?.match(/^beatport:(-?\d+)$/)
    if (!m) return
    const id = Number(m[1])
    setHighlight(id)
    const el = document.getElementById(`t-${id}`)
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
  }, [])

  const share = async (id: number) => {
    const url = `${window.location.origin}${sharePath}?play=beatport:${id}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(id)
      setTimeout(() => setCopied(null), 1800)
    } catch {
      window.prompt(labels.share, url)
    }
  }

  const highlighted = highlight !== null ? queue.find((q) => q.id === highlight) : undefined

  return (
    <div className="tl">
      <div className="tl-head">
        <span className="tl-count">{labels.count}</span>
        {queue.length > 0 && (
          <button
            className={`btn${mine ? ' dark' : ''}`}
            onClick={() => (mine ? stop() : playQueue(queue, 0, queueKey))}
          >
            {mine ? labels.stop : labels.playAll}
          </button>
        )}
      </div>

      {highlighted && current?.id !== highlighted.id && (
        <button className="tap" onClick={() => toggleTrack(highlighted, queue, queueKey)}>
          ▶ {labels.tapToPlay}: {highlighted.title}
        </button>
      )}

      <ol className="tracks">
        {tracks.map((t) => {
          const q = queue.find((x) => x.id === t.id)
          const isCurrent = current?.id === t.id
          const isPlaying = isCurrent && playing
          return (
            <li
              key={t.id}
              id={`t-${t.id}`}
              className={`trk${isCurrent ? ' on' : ''}${highlight === t.id && !isCurrent ? ' hl' : ''}`}
            >
              <span className="pos">{t.position}</span>
              <button
                className="playbtn"
                disabled={!q}
                aria-label={q ? `${isPlaying ? labels.pause : labels.play}: ${t.title}` : labels.noPreview}
                title={q ? undefined : labels.noPreview}
                onClick={() => q && toggleTrack(q, queue, queueKey)}
              >
                {isPlaying ? '❚❚' : '▶'}
              </button>
              {showArtwork &&
                (t.artwork ? (
                  <Link href={t.releaseHref} tabIndex={-1} aria-hidden="true">
                    <img className="trk-art" src={t.artwork} alt="" loading="lazy" width={56} height={56} />
                  </Link>
                ) : (
                  <span className="trk-art ph" aria-hidden="true" />
                ))}
              <div className="t">
                <b>
                  {t.releaseTitle ? <Link href={`${t.releaseHref}#t-${t.id}`}>{t.title}</Link> : t.title}
                  {t.mix ? (
                    <span className="mix">
                      {' '}
                      <MixCredit mix={t.mix} remixers={t.remixerLinks} lang={lang} />
                    </span>
                  ) : null}
                </b>
                <span>
                  {t.artistLinks.length > 0
                    ? t.artistLinks.map((a, i) => (
                        <span key={`${a.slug}-${i}`}>
                          {i > 0 ? (i === t.artistLinks.length - 1 ? (lang === 'es' ? ' y ' : ' & ') : ', ') : null}
                          <Link href={`/${lang}/artists/${a.slug}`}>{a.name}</Link>
                        </span>
                      ))
                    : t.artists}
                  {t.releaseTitle ? (
                    <>
                      {' '}
                      <span className="sep">|</span> <Link href={t.releaseHref}>{t.releaseTitle}</Link>
                    </>
                  ) : null}
                </span>
              </div>
              <span className="chips-m">
                {t.bpm ? <span className="chip-bpm">{t.bpm}</span> : null}
                {t.key ? <span className="chip-key">{t.key}</span> : null}
                {t.length ? <span className="chip-len">{t.length}</span> : null}
              </span>
              <span className="acts">
                <button className="iconbtn" onClick={() => share(t.id)} title={labels.share}>
                  {copied === t.id ? labels.copied : '🔗'}
                </button>
                <PlatformLinks
                  title={t.title}
                  artists={t.artistNames}
                  spotifyUrl={t.spotifyUrl}
                  tidalUrl={t.tidalUrl}
                  beatportUrl={t.beatportUrl}
                  labels={labels}
                />
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function MixCredit({
  mix,
  remixers,
  lang,
}: {
  mix: string
  remixers: { name: string; slug: string }[]
  lang: Lang
}) {
  const linked = remixers.map((a) => ({ name: a.name, href: `/${lang}/artists/${a.slug}` }))
  const parts = splitLinkedNames(mix, linked)
  const hit = new Set(parts.filter((p): p is { name: string; href: string } => typeof p !== 'string').map((p) => p.href))
  const extra = linked.filter((a) => !hit.has(a.href))
  return (
    <>
      {parts.map((p, i) =>
        typeof p === 'string' ? (
          <span key={i}>{p}</span>
        ) : (
          <Link key={`${p.href}-${i}`} href={p.href}>
            {p.name}
          </Link>
        ),
      )}
      {extra.map((a, i) => (
        <span key={a.href}>
          {i === 0 && parts.length ? ' · ' : i > 0 ? ', ' : null}
          <Link href={a.href}>{a.name}</Link>
        </span>
      ))}
    </>
  )
}
