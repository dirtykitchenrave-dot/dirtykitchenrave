'use client'

import { useEffect, useRef, useState } from 'react'
import type { Lang } from '@/i18n/config'
import { formatPodcastClock, formatPodcastDate, type PodcastEpisode, type PodcastShow } from '@/lib/podcast'
import { usePlayer } from './Player'

export type PodcastLabels = {
  episodes: string
  play: string
  pause: string
  nowPlaying: string
  seek: string
  error: string
  episode: string
  openEpisode: string
}

export function PodcastPlayer({
  lang,
  show,
  labels,
}: {
  lang: Lang
  show: PodcastShow
  labels: PodcastLabels
}) {
  const catalog = usePlayer()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const loadedUrl = useRef<string | null>(null)
  const episodesRef = useRef(show.episodes)
  const currentIdRef = useRef(show.episodes[0]?.id ?? '')
  const [currentId, setCurrentId] = useState(show.episodes[0]?.id ?? '')
  episodesRef.current = show.episodes
  currentIdRef.current = currentId
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [mediaDuration, setMediaDuration] = useState<number | null>(null)
  const [error, setError] = useState(false)
  const [artOk, setArtOk] = useState(true)

  const current = show.episodes.find((ep) => ep.id === currentId) || show.episodes[0]
  const duration = mediaDuration && Number.isFinite(mediaDuration) ? mediaDuration : current?.durationSec || 0

  useEffect(() => {
    const a = new Audio()
    a.preload = 'none'
    audioRef.current = a
    const onTime = () => setCurrentTime(a.currentTime || 0)
    const onMeta = () => setMediaDuration(Number.isFinite(a.duration) ? a.duration : null)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnd = () => {
      setPlaying(false)
      const list = episodesRef.current
      const i = list.findIndex((ep) => ep.id === currentIdRef.current)
      const next = i >= 0 ? list[i + 1] : undefined
      if (!next) return
      currentIdRef.current = next.id
      loadedUrl.current = next.audioUrl
      setCurrentId(next.id)
      setCurrentTime(0)
      setMediaDuration(next.durationSec)
      a.src = next.audioUrl
      void a.play().catch(() => setPlaying(false))
    }
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('loadedmetadata', onMeta)
    a.addEventListener('durationchange', onMeta)
    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    a.addEventListener('ended', onEnd)
    return () => {
      a.pause()
      a.src = ''
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('loadedmetadata', onMeta)
      a.removeEventListener('durationchange', onMeta)
      a.removeEventListener('play', onPlay)
      a.removeEventListener('pause', onPause)
      a.removeEventListener('ended', onEnd)
    }
  }, [])

  useEffect(() => {
    if (!catalog.playing) return
    audioRef.current?.pause()
  }, [catalog.playing])

  useEffect(() => {
    if (!current || !playing || !('mediaSession' in navigator)) return
    const art = show.artwork
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: 'Dirty Kitchen Rave',
      album: show.title,
      artwork: art ? [{ src: art, sizes: '512x512', type: art.endsWith('.png') ? 'image/png' : 'image/jpeg' }] : [],
    })
    const audio = audioRef.current
    navigator.mediaSession.setActionHandler('play', () => void audio?.play())
    navigator.mediaSession.setActionHandler('pause', () => audio?.pause())
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      const i = show.episodes.findIndex((ep) => ep.id === current.id)
      const prev = show.episodes[i - 1]
      if (prev) void start(prev)
    })
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      const i = show.episodes.findIndex((ep) => ep.id === current.id)
      const next = show.episodes[i + 1]
      if (next) void start(next)
    })
  }, [current, playing, show.artwork, show.episodes, show.title])

  async function start(ep: PodcastEpisode) {
    const audio = audioRef.current
    if (!audio) return
    if (catalog.current) catalog.stop()
    setError(false)
    currentIdRef.current = ep.id
    setCurrentId(ep.id)
    if (loadedUrl.current !== ep.audioUrl) {
      loadedUrl.current = ep.audioUrl
      setCurrentTime(0)
      setMediaDuration(ep.durationSec)
      audio.src = ep.audioUrl
    }
    try {
      await audio.play()
    } catch {
      setPlaying(false)
      setError(true)
    }
  }

  function toggle(ep: PodcastEpisode) {
    const audio = audioRef.current
    if (audio && ep.id === current?.id && loadedUrl.current === ep.audioUrl && !audio.paused) {
      audio.pause()
      return
    }
    void start(ep)
  }

  function onSeek(value: number) {
    const audio = audioRef.current
    if (!audio || !current) return
    const apply = () => {
      audio.currentTime = value
      setCurrentTime(value)
    }
    if (loadedUrl.current !== current.audioUrl) {
      void start(current).then(() => {
        const a = audioRef.current
        if (!a) return
        if (a.readyState >= 1) apply()
        else a.addEventListener('loadedmetadata', apply, { once: true })
      })
      return
    }
    apply()
  }

  if (!current) return null
  const isThisPlaying = playing && loadedUrl.current === current.audioUrl

  return (
    <>
      <section className="pc-stage">
        <div className="pc-art">
          {show.artwork && artOk ? (
            <img src={show.artwork} alt="" width={512} height={512} onError={() => setArtOk(false)} />
          ) : (
            <b>DKR</b>
          )}
        </div>
        <div className="pc-now">
          <p className="pc-kicker">{isThisPlaying ? labels.nowPlaying : labels.episode}</p>
          <h2 className="pc-title">{current.title}</h2>
          <p className="pc-meta">
            {current.episode != null ? <span>#{current.episode}</span> : null}
            {current.publishedAt ? <span>{formatPodcastDate(current.publishedAt, lang)}</span> : null}
            {current.durationSec ? <span>{formatPodcastClock(current.durationSec)}</span> : null}
            {current.pageUrl ? (
              <a href={current.pageUrl} target="_blank" rel="noopener noreferrer">
                {labels.openEpisode}
              </a>
            ) : null}
          </p>
          {current.summary ? <p className="pc-summary">{current.summary}</p> : null}
          <div className="pc-transport">
            <button
              type="button"
              className="playbtn pc-go"
              aria-label={`${isThisPlaying ? labels.pause : labels.play}: ${current.title}`}
              onClick={() => toggle(current)}
            >
              {isThisPlaying ? '❚❚' : '▶'}
            </button>
            <span className="pc-times">
              {formatPodcastClock(currentTime)} / {formatPodcastClock(duration)}
            </span>
            <input
              className="pc-seek"
              type="range"
              min={0}
              max={duration || 0}
              step={1}
              value={Math.min(currentTime, duration || 0)}
              aria-label={labels.seek}
              disabled={!duration}
              onChange={(e) => onSeek(Number(e.target.value))}
            />
          </div>
          {error ? (
            <p className="pc-error" role="alert">
              {labels.error}
            </p>
          ) : null}
        </div>
      </section>
      <section className="pc-list">
        <div className="pc-list-head">
          <h2>{labels.episodes}</h2>
          <span>{show.episodes.length}</span>
        </div>
        <ol>
          {show.episodes.map((ep) => {
            const on = ep.id === current.id
            const rowPlaying = on && isThisPlaying
            return (
              <li key={ep.id}>
                <button
                  type="button"
                  className="pc-ep"
                  aria-current={on ? 'true' : undefined}
                  aria-label={`${rowPlaying ? labels.pause : labels.play}: ${ep.title}`}
                  onClick={() => toggle(ep)}
                >
                  <span className="num">{ep.episode ?? '–'}</span>
                  <span className="name">
                    <b>{ep.title}</b>
                    {ep.publishedAt ? <span>{formatPodcastDate(ep.publishedAt, lang)}</span> : null}
                  </span>
                  <span className="len">{ep.durationSec ? formatPodcastClock(ep.durationSec) : ''}</span>
                  <span className="mark" aria-hidden="true">
                    {rowPlaying ? '❚❚' : '▶'}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </section>
    </>
  )
}
