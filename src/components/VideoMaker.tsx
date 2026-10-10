'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { artworkAt } from '@/lib/format'
import type { ReelFormat } from '@/lib/video-renderer'

export interface VideoLabels {
  button: string
  title: string
  vertical: string
  verticalHint: string
  horizontal: string
  horizontalHint: string
  creating: string
  ready: string
  noSound: string
  instagram: string
  facebook: string
  download: string
  again: string
  close: string
  error: string
  desktopHint: string
}

export interface VideoTrack {
  id: number
  title: string
  mix: string
  artists: string
  bpm: number | null
  key: string | null
  length: string | null
  artwork: string | null
}

type Stage = 'pick' | 'busy' | 'ready' | 'error'

/** Beatport artwork through our proxy (same origin → the canvas stays exportable). */
async function loadArtwork(src: string | null): Promise<string | null> {
  if (!src) return null
  const sizes = [1400, 500]
  for (const size of sizes) {
    const url = artworkAt(src, size)
    if (!url) continue
    try {
      const res = await fetch(`/api/image-proxy?url=${encodeURIComponent(url)}`)
      if (!res.ok) continue
      return URL.createObjectURL(await res.blob())
    } catch {
      /* next size */
    }
  }
  return null
}

function fileName(t: VideoTrack, format: ReelFormat, ext: string) {
  const base = `${t.artists} - ${t.title}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return `dkr-${base || t.id}-${format === 'vertical' ? '9x16' : '16x9'}.${ext}`
}

/**
 * «Create video» (any visitor). Opens a sheet: pick vertical (Reels/Stories/TikTok) or
 * horizontal (Facebook/YouTube) → the MP4 is drawn in the browser (`src/lib/video-renderer.ts`,
 * no server, no audio) → preview + Share to Instagram / Share to Facebook / Download.
 * The share buttons are fresh taps, so `navigator.share({ files })` is allowed after the render.
 */
export default function VideoMaker({
  track,
  kicker,
  sharePath,
  labels,
}: {
  track: VideoTrack
  /** Small label above the title (catalogue number · genre, release title…). */
  kicker: string
  /** Track link path (`/en/releases/x?play=beatport:id`), copied for the post / story sticker. */
  sharePath: string
  labels: VideoLabels
}) {
  const [open, setOpen] = useState(false)
  const [stage, setStage] = useState<Stage>('pick')
  const [format, setFormat] = useState<ReelFormat>('vertical')
  const [pct, setPct] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const reset = useCallback(() => {
    setStage('pick')
    setPct(0)
    setFile(null)
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old)
      return null
    })
  }, [])

  const close = useCallback(() => {
    if (stage === 'busy') return
    setOpen(false)
    reset()
  }, [reset, stage])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    dialogRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  const create = async (f: ReelFormat) => {
    setFormat(f)
    setStage('busy')
    setPct(0)
    let art: string | null = null
    try {
      navigator.clipboard?.writeText(`${window.location.origin}${sharePath}`).catch(() => undefined)
      art = await loadArtwork(track.artwork)
      const { renderReel } = await import('@/lib/video-renderer')
      const mix = /^original( mix)?$/i.test(track.mix.trim()) ? '' : track.mix.trim()
      const result = await renderReel(
        {
          title: `${track.title}${mix ? ` (${mix})` : ''}`.slice(0, 90),
          artists: track.artists,
          meta: [track.key, track.length, track.bpm ? `${Math.round(track.bpm)} BPM` : null]
            .filter(Boolean)
            .join(' · ')
            .toUpperCase(),
          kicker: kicker.toUpperCase().slice(0, 28),
          artwork: art,
          lang: 'en',
          bpm: track.bpm ?? undefined,
        },
        { format: f, onProgress: (r) => setPct(Math.round(r * 100)) },
      )
      const out = new File([result.blob], fileName(track, f, result.ext), { type: result.mime })
      setFile(out)
      setPreview(URL.createObjectURL(out))
      setStage('ready')
    } catch (err) {
      console.error('[video]', err)
      setStage('error')
    } finally {
      if (art) URL.revokeObjectURL(art)
    }
  }

  const download = () => {
    if (!file || !preview) return
    const a = document.createElement('a')
    a.href = preview
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const canShareFile = () => {
    try {
      return !!file && !!navigator.canShare?.({ files: [file] })
    } catch {
      return false
    }
  }

  /** Mobile: system share sheet (pick Instagram / Facebook there). Desktop: download + open the site. */
  const shareTo = async (site: 'instagram' | 'facebook') => {
    if (!file) return
    if (canShareFile()) {
      try {
        await navigator.share({ files: [file], title: `${track.title} — Dirty Kitchen Rave` })
      } catch {
        /* cancelled */
      }
      return
    }
    download()
    window.open(site === 'instagram' ? 'https://www.instagram.com/' : 'https://www.facebook.com/', '_blank', 'noopener')
  }

  return (
    <>
      <button
        className="iconbtn vm-trigger"
        onClick={() => setOpen(true)}
        title={labels.button}
        aria-label={`${labels.button}: ${track.title}`}
        aria-haspopup="dialog"
      >
        🎬
      </button>
      {open && (
        <div className="vm-backdrop" onClick={close}>
          <div
            ref={dialogRef}
            className="vm"
            role="dialog"
            aria-modal="true"
            aria-label={labels.title}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vm-head">
              <div>
                <p className="vm-kicker">{labels.title}</p>
                <p className="vm-track">
                  <b>{track.title}</b> <span>{track.artists}</span>
                </p>
              </div>
              <button className="vm-x" onClick={close} disabled={stage === 'busy'} aria-label={labels.close}>
                ✕
              </button>
            </div>

            {stage === 'pick' && (
              <div className="vm-pick">
                <button className="vm-opt" onClick={() => create('vertical')}>
                  <span className="vm-shape v" aria-hidden="true" />
                  <b>{labels.vertical}</b>
                  <small>{labels.verticalHint}</small>
                </button>
                <button className="vm-opt" onClick={() => create('horizontal')}>
                  <span className="vm-shape h" aria-hidden="true" />
                  <b>{labels.horizontal}</b>
                  <small>{labels.horizontalHint}</small>
                </button>
              </div>
            )}

            {stage === 'busy' && (
              <div className="vm-busy" aria-live="polite">
                <p>
                  {labels.creating} <b>{pct}%</b>
                </p>
                <div className="vm-bar">
                  <span style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}

            {stage === 'ready' && preview && (
              <div className="vm-ready">
                <video
                  className={`vm-video ${format === 'vertical' ? 'v' : 'h'}`}
                  src={preview}
                  autoPlay
                  muted
                  loop
                  playsInline
                />
                <p className="vm-note">
                  <b>{labels.ready}.</b> {labels.noSound}
                </p>
                {!canShareFile() && <p className="vm-note">{labels.desktopHint}</p>}
                <div className="btns vm-actions">
                  <button className="btn" onClick={() => shareTo('instagram')}>
                    {labels.instagram}
                  </button>
                  <button className="btn" onClick={() => shareTo('facebook')}>
                    {labels.facebook}
                  </button>
                  <button className="btn dark" onClick={download}>
                    {labels.download}
                  </button>
                  <button className="btn ghost" onClick={reset}>
                    {labels.again}
                  </button>
                </div>
              </div>
            )}

            {stage === 'error' && (
              <div className="vm-busy">
                <p>{labels.error}</p>
                <div className="btns">
                  <button className="btn ghost" onClick={reset}>
                    {labels.again}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
