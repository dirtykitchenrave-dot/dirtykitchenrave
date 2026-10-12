'use client'

import { useEffect, useRef, useState } from 'react'
import type { Lang } from '@/i18n/config'
import type { ChannelTrack } from '@/lib/channels'
import { formatPodcastClock, formatPodcastDate } from '@/lib/podcast'
import { usePlayer } from './Player'

const PREVIEW = 5

function tidy(summary: string): string {
  return summary
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\bsource:\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export type ChannelSection = {
  id: string
  title: string
  lead: string
  href: string
  cta: string
  items: ChannelTrack[]
}

type Labels = {
  play: string
  pause: string
  seek: string
  error: string
  showAll: string
  showLess: string
  empty: string
  open: string
}

export function ChannelsBoard({
  lang,
  sections,
  labels,
}: {
  lang: Lang
  sections: ChannelSection[]
  labels: Labels
}) {
  const catalog = usePlayer()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const loadedUrl = useRef<string | null>(null)
  const openRef = useRef<string | null>(null)
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [more, setMore] = useState<Record<string, boolean>>({})
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [mediaDuration, setMediaDuration] = useState<number | null>(null)
  const [error, setError] = useState(false)
  openRef.current = openKey

  useEffect(() => {
    const a = new Audio()
    a.preload = 'none'
    audioRef.current = a
    const onTime = () => setCurrentTime(a.currentTime || 0)
    const onMeta = () => setMediaDuration(Number.isFinite(a.duration) ? a.duration : null)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('loadedmetadata', onMeta)
    a.addEventListener('durationchange', onMeta)
    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    return () => {
      a.pause()
      a.src = ''
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('loadedmetadata', onMeta)
      a.removeEventListener('durationchange', onMeta)
      a.removeEventListener('play', onPlay)
      a.removeEventListener('pause', onPause)
    }
  }, [])

  useEffect(() => {
    if (!catalog.playing) return
    audioRef.current?.pause()
    setOpenKey(null)
  }, [catalog.playing])

  function findOpen(): { section: ChannelSection; item: ChannelTrack; index: number } | null {
    if (!openKey) return null
    for (const section of sections) {
      const index = section.items.findIndex((item) => `${section.id}:${item.id}` === openKey)
      const item = section.items[index]
      if (item) return { section, item, index }
    }
    return null
  }

  async function start(item: ChannelTrack) {
    const audio = audioRef.current
    if (!audio || !item.audioUrl) return
    if (catalog.current) catalog.stop()
    setError(false)
    if (loadedUrl.current !== item.audioUrl) {
      loadedUrl.current = item.audioUrl
      setCurrentTime(0)
      setMediaDuration(item.durationSec)
      audio.src = item.audioUrl
    }
    try {
      await audio.play()
    } catch {
      setPlaying(false)
      setError(true)
    }
  }

  function openRow(section: ChannelSection, item: ChannelTrack) {
    const key = `${section.id}:${item.id}`
    if (openKey === key) {
      audioRef.current?.pause()
      setOpenKey(null)
      return
    }
    setOpenKey(key)
    setError(false)
    if (item.audioUrl) void start(item)
    else {
      audioRef.current?.pause()
      if (catalog.current) catalog.stop()
    }
  }

  function onSeek(item: ChannelTrack, value: number) {
    const audio = audioRef.current
    if (!audio || !item.audioUrl) return
    const apply = () => {
      audio.currentTime = value
      setCurrentTime(value)
    }
    if (loadedUrl.current !== item.audioUrl) {
      void start(item).then(() => {
        const a = audioRef.current
        if (!a) return
        if (a.readyState >= 1) apply()
        else a.addEventListener('loadedmetadata', apply, { once: true })
      })
      return
    }
    apply()
  }

  function toggleMore(section: ChannelSection) {
    const opening = !more[section.id]
    if (!opening && openKey?.startsWith(`${section.id}:`)) {
      const idx = section.items.findIndex((item) => `${section.id}:${item.id}` === openKey)
      if (idx >= PREVIEW) {
        audioRef.current?.pause()
        setOpenKey(null)
      }
    }
    setMore((m) => ({ ...m, [section.id]: opening }))
  }

  const opened = findOpen()

  return (
    <>
      {sections.map((section) => {
        const shown = more[section.id] ? section.items : section.items.slice(0, PREVIEW)
        return (
          <section key={section.id} id={section.id}>
            <div className="ch-head">
              <div>
                <h2>{section.title}</h2>
                <p>{section.lead}</p>
              </div>
              <div className="ch-side">
                {section.items.length > 0 ? <span className="ch-count">{section.items.length}</span> : null}
                <a href={section.href} target="_blank" rel="noopener noreferrer">
                  {section.cta}
                </a>
              </div>
            </div>
            {section.items.length === 0 ? (
              <p className="ch-empty">{labels.empty}</p>
            ) : (
              <ol className="ch-list">
                {shown.map((item) => {
                  const index = section.items.findIndex((row) => row.id === item.id)
                  const num = section.items.length - index
                  const key = `${section.id}:${item.id}`
                  const open = openKey === key
                  const rowPlaying = open && !!item.audioUrl && playing && loadedUrl.current === item.audioUrl
                  const duration =
                    open && mediaDuration && Number.isFinite(mediaDuration) ? mediaDuration : item.durationSec || 0
                  return (
                    <li key={item.id} className={open ? 'on' : undefined}>
                      <button
                        type="button"
                        className="ch-row"
                        aria-expanded={open}
                        onClick={() => openRow(section, item)}
                      >
                        <span className="num">{num}</span>
                        <span className="name">
                          <b>{item.title}</b>
                          {item.publishedAt ? <span>{formatPodcastDate(item.publishedAt, lang)}</span> : null}
                        </span>
                        <span className="len">{item.durationSec ? formatPodcastClock(item.durationSec) : ''}</span>
                        <span className={`chev${open ? ' up' : ''}`} aria-hidden="true" />
                      </button>
                      {open ? (
                        <div className="ch-panel">
                          {tidy(item.summary) ? <p className="ch-summary">{tidy(item.summary)}</p> : null}
                          {item.audioUrl ? (
                            <div className="pc-transport">
                              <button
                                type="button"
                                className="playbtn pc-go"
                                aria-label={`${rowPlaying ? labels.pause : labels.play}: ${item.title}`}
                                onClick={() => (rowPlaying ? audioRef.current?.pause() : void start(item))}
                              >
                                {rowPlaying ? '❚❚' : '▶'}
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
                                onChange={(e) => onSeek(item, Number(e.target.value))}
                              />
                            </div>
                          ) : item.videoId ? (
                            <iframe
                              className="ch-video"
                              title={item.title}
                              src={`https://www.youtube-nocookie.com/embed/${item.videoId}?rel=0&autoplay=1`}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                            />
                          ) : null}
                          {error && opened?.item.id === item.id ? (
                            <p className="pc-error" role="alert">
                              {labels.error}
                            </p>
                          ) : null}
                          {item.pageUrl ? (
                            <a className="ch-out" href={item.pageUrl} target="_blank" rel="noopener noreferrer">
                              {labels.open}
                            </a>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  )
                })}
              </ol>
            )}
            {section.items.length > PREVIEW ? (
              <button
                type="button"
                className="ch-more"
                aria-expanded={!!more[section.id]}
                onClick={() => toggleMore(section)}
              >
                {more[section.id] ? labels.showLess : labels.showAll.replace('{n}', String(section.items.length))}
              </button>
            ) : null}
          </section>
        )
      })}
    </>
  )
}
