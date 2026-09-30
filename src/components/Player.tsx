'use client'

import Link from 'next/link'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { Lang } from '@/i18n/config'
import { splitLinkedNames } from '@/lib/format'
import { proxiedAudioUrl } from '@/lib/audio-url'
import PlatformLinks from './PlatformLinks'

export interface PlayerTrack {
  id: number
  title: string
  mix: string
  artists: string
  /** Internal artist pages. When set, the bar links each name instead of the plain string. */
  artistLinks?: { name: string; href: string }[]
  remixerLinks?: { name: string; href: string }[]
  artwork: string | null
  sampleUrl: string
  beatportUrl: string | null
  spotifyUrl?: string | null
  tidalUrl?: string | null
  /** Names used to search Spotify / TIDAL when there is no direct link. */
  artistNames?: string[]
  /** Page to go back to from the player bar (release page, with #t-<id>). */
  href?: string
}

interface PlayerLabels {
  play: string
  pause: string
  close: string
  buy: string
  share: string
  copied: string
  openSpotify: string
  searchSpotify: string
  openTidal: string
  searchTidal: string
  openBeatport: string
  nowPlaying: string
  next: string
  prev: string
}

interface PlayerState {
  current: PlayerTrack | null
  playing: boolean
  queueKey: string | null
  /** Play a list starting at `index`. `key` identifies the list (e.g. "release:123") for Play all / Stop. */
  playQueue: (queue: PlayerTrack[], index: number, key: string) => void
  /** Row button: toggles pause if it's the current track, otherwise starts the queue at that track. */
  toggleTrack: (track: PlayerTrack, queue: PlayerTrack[], key: string) => void
  stop: () => void
}

const Ctx = createContext<PlayerState | null>(null)

export function usePlayer(): PlayerState {
  const v = useContext(Ctx)
  if (!v) throw new Error('usePlayer must be used inside <PlayerProvider>')
  return v
}

/**
 * One global <audio> element for the whole site (the [lang] layout is not remounted on navigation),
 * so the Beatport preview keeps playing while the visitor browses. Queue with next/prev and auto-advance,
 * like the Optimal Breaks deck player. Audio goes through /api/audio-proxy (Range support for iOS).
 */
export function PlayerProvider({
  children,
  labels,
  lang,
}: {
  children: React.ReactNode
  labels: PlayerLabels
  lang: Lang
}) {
  const audio = useRef<HTMLAudioElement | null>(null)
  const shell = useRef<HTMLDivElement | null>(null)
  const [queue, setQueue] = useState<PlayerTrack[]>([])
  const [index, setIndex] = useState(0)
  const [queueKey, setQueueKey] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<number | null>(null)
  const current = queue[index] || null

  // refs so audio event handlers always see the latest queue
  const qRef = useRef(queue)
  const iRef = useRef(index)
  qRef.current = queue
  iRef.current = index

  const load = useCallback((q: PlayerTrack[], i: number) => {
    const a = audio.current
    const t = q[i]
    if (!a || !t) return
    a.src = proxiedAudioUrl(t.sampleUrl)
    setProgress(0)
    void a.play().catch(() => setPlaying(false))
  }, [])

  const goTo = useCallback(
    (i: number) => {
      const q = qRef.current
      if (i < 0 || i >= q.length) return
      setIndex(i)
      load(q, i)
    },
    [load],
  )

  useEffect(() => {
    const a = new Audio()
    a.preload = 'none'
    audio.current = a
    const onTime = () => setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnd = () => {
      const next = iRef.current + 1
      if (next < qRef.current.length) {
        setIndex(next)
        a.src = proxiedAudioUrl(qRef.current[next].sampleUrl)
        void a.play().catch(() => setPlaying(false))
      } else {
        setPlaying(false)
      }
    }
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    a.addEventListener('ended', onEnd)
    return () => {
      a.pause()
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('play', onPlay)
      a.removeEventListener('pause', onPause)
      a.removeEventListener('ended', onEnd)
    }
  }, [])

  const playQueue = useCallback(
    (q: PlayerTrack[], i: number, key: string) => {
      if (!q.length) return
      setQueue(q)
      setIndex(i)
      setQueueKey(key)
      qRef.current = q
      iRef.current = i
      load(q, i)
    },
    [load],
  )

  const toggleTrack = useCallback(
    (t: PlayerTrack, q: PlayerTrack[], key: string) => {
      const a = audio.current
      if (a && current?.id === t.id) {
        if (a.paused) void a.play().catch(() => setPlaying(false))
        else a.pause()
        return
      }
      const i = Math.max(0, q.findIndex((x) => x.id === t.id))
      playQueue(q.length ? q : [t], q.length ? i : 0, key)
    },
    [current, playQueue],
  )

  const stop = useCallback(() => {
    audio.current?.pause()
    setQueue([])
    setIndex(0)
    setQueueKey(null)
    setPlaying(false)
  }, [])

  // reserve exactly the bar's height so the cards don't sit underneath it
  useEffect(() => {
    const el = shell.current
    if (!current || !el) {
      document.body.style.setProperty('--player-h', '0px')
      return
    }
    const apply = () =>
      document.body.style.setProperty('--player-h', `${Math.ceil(el.getBoundingClientRect().height)}px`)
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => {
      ro.disconnect()
      document.body.style.setProperty('--player-h', '0px')
    }
  }, [current])

  // lock screen / hardware keys
  useEffect(() => {
    if (!('mediaSession' in navigator) || !current) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.mix ? `${current.title} (${current.mix})` : current.title,
      artist: current.artists,
      album: 'Dirty Kitchen Rave',
      artwork: current.artwork ? [{ src: current.artwork, sizes: '250x250', type: 'image/jpeg' }] : [],
    })
    navigator.mediaSession.setActionHandler('play', () => void audio.current?.play())
    navigator.mediaSession.setActionHandler('pause', () => audio.current?.pause())
    navigator.mediaSession.setActionHandler('nexttrack', () => goTo(iRef.current + 1))
    navigator.mediaSession.setActionHandler('previoustrack', () => goTo(iRef.current - 1))
  }, [current, goTo])

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audio.current
    if (!a || !a.duration) return
    const r = e.currentTarget.getBoundingClientRect()
    a.currentTime = ((e.clientX - r.left) / r.width) * a.duration
  }

  const copyLink = async () => {
    if (!current) return
    const path = (current.href || window.location.pathname).split('#')[0]
    const url = new URL(path, window.location.origin)
    url.searchParams.set('play', `beatport:${current.id}`)
    const text = url.toString()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current)
      copiedTimer.current = window.setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt(labels.share, text)
    }
  }

  const toggleCurrent = () => {
    const a = audio.current
    if (!a) return
    if (a.paused) void a.play().catch(() => setPlaying(false))
    else a.pause()
  }

  return (
    <Ctx.Provider value={{ current, playing, queueKey, playQueue, toggleTrack, stop }}>
      {children}
      {current && (
        <div className="player" role="region" aria-label={labels.nowPlaying} ref={shell}>
          <div className="bar" onClick={seek} aria-hidden="true">
            <i style={{ ['--p' as string]: `${progress}%` }} />
          </div>
          {current.artwork ? <img src={current.artwork} alt="" /> : <span className="ph" aria-hidden="true" />}
          <div className="ctrls">
            <button className="sk" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label={labels.prev}>
              ⏮
            </button>
            <button className="pb" onClick={toggleCurrent} aria-label={playing ? labels.pause : labels.play}>
              {playing ? '❚❚' : '▶'}
            </button>
            <button
              className="sk"
              onClick={() => goTo(index + 1)}
              disabled={index >= queue.length - 1}
              aria-label={labels.next}
            >
              ⏭
            </button>
          </div>
          <div className="who">
            <b>
              {current.href ? <Link href={current.href}>{current.title}</Link> : current.title}
              {current.mix ? (
                <>
                  {' ('}
                  {splitLinkedNames(current.mix, current.remixerLinks || []).map((p, i) =>
                    typeof p === 'string' ? (
                      <span key={i}>{p}</span>
                    ) : (
                      <Link key={`${p.href}-${i}`} href={p.href}>
                        {p.name}
                      </Link>
                    ),
                  )}
                  {')'}
                </>
              ) : null}
            </b>
            <span>
              {current.artistLinks && current.artistLinks.length > 0
                ? current.artistLinks.map((a, i) => (
                    <span key={a.href}>
                      {i > 0 ? (i === current.artistLinks!.length - 1 ? (lang === 'es' ? ' y ' : ' & ') : ', ') : null}
                      <Link href={a.href}>{a.name}</Link>
                    </span>
                  ))
                : current.artists}
              {queue.length > 1 ? `  ${index + 1}/${queue.length}` : ''}
            </span>
          </div>
          <div className="out">
            <button
              type="button"
              className={copied ? 'plat sh ok' : 'plat sh'}
              onClick={() => void copyLink()}
              title={copied ? labels.copied : labels.share}
              aria-label={copied ? labels.copied : labels.share}
            >
              {copied ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              )}
            </button>
            <PlatformLinks
              title={current.mix ? `${current.title.trim()} (${current.mix.trim()})` : current.title.trim()}
              artists={
                current.artistNames && current.artistNames.length
                  ? current.artistNames
                  : current.artistLinks?.map((a) => a.name) || (current.artists ? [current.artists] : [])
              }
              spotifyUrl={current.spotifyUrl}
              tidalUrl={current.tidalUrl}
              beatportUrl={current.beatportUrl}
              labels={labels}
            />
          </div>
          <button className="x" onClick={stop} aria-label={labels.close}>
            ×
          </button>
        </div>
      )}
    </Ctx.Provider>
  )
}
