import { spotifyHref } from '@/lib/audio-url'

/**
 * Round platform buttons with brand logos (ported from Optimal Breaks, TrackShareButton.tsx).
 * - Spotify: always shown. Direct track link when verified (spotifyUrl), otherwise a Spotify search.
 * - TIDAL: only with a verified link (its breaks catalogue is limited; no empty searches).
 * - Beatport: the track page.
 */

const SPOTIFY =
  'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z'
const TIDAL =
  'M12.012 3.992L8.008 7.996 4.004 3.992 0 7.996 4.004 12l4.004-4.004L12.012 12l-4.004 4.004 4.004 4.004 4.004-4.004L12.012 12l4.004-4.004-4.004-4.004zM16.042 7.996l3.979-3.979L24 7.996l-3.979 3.979z'
const BEATPORT =
  'M21.429 17.055a7.114 7.114 0 0 1-.794 3.246 6.917 6.917 0 0 1-2.181 2.492 6.698 6.698 0 0 1-3.063 1.163 6.653 6.653 0 0 1-3.239-.434 6.796 6.796 0 0 1-2.668-1.932 7.03 7.03 0 0 1-1.481-2.983 7.124 7.124 0 0 1 .049-3.345 7.015 7.015 0 0 1 1.566-2.937l-4.626 4.73-2.421-2.479 5.201-5.265a3.791 3.791 0 0 0 1.066-2.675V0h3.41v6.613a7.172 7.172 0 0 1-.519 2.794 7.02 7.02 0 0 1-1.559 2.353l-.153.156a6.768 6.768 0 0 1 3.49-1.725 6.687 6.687 0 0 1 3.845.5 6.873 6.873 0 0 1 2.959 2.564 7.118 7.118 0 0 1 1.118 3.8Zm-3.089 0a3.89 3.89 0 0 0-.611-2.133 3.752 3.752 0 0 0-1.666-1.424 3.65 3.65 0 0 0-2.158-.233 3.704 3.704 0 0 0-1.92 1.037 3.852 3.852 0 0 0-1.031 1.955 3.908 3.908 0 0 0 .205 2.213c.282.7.76 1.299 1.374 1.721a3.672 3.672 0 0 0 2.076.647 3.637 3.637 0 0 0 2.635-1.096c.347-.351.622-.77.81-1.231.188-.461.285-.956.286-1.456Z'

export interface PlatformLabels {
  openSpotify: string
  searchSpotify: string
  openTidal: string
  openBeatport: string
}

function Btn({ href, cls, label, path }: { href: string; cls: string; label: string; path: string }) {
  return (
    <a className={`plat ${cls}`} href={href} target="_blank" rel="noopener noreferrer" title={label} aria-label={label}>
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d={path} />
      </svg>
    </a>
  )
}

export default function PlatformLinks({
  title,
  artists,
  spotifyUrl,
  tidalUrl,
  beatportUrl,
  labels,
}: {
  title: string
  artists: string[]
  spotifyUrl?: string | null
  tidalUrl?: string | null
  beatportUrl?: string | null
  labels: PlatformLabels
}) {
  const sp = spotifyHref(spotifyUrl, title, artists)
  return (
    <span className="plats">
      <Btn href={sp.href} cls="sp" label={sp.direct ? labels.openSpotify : labels.searchSpotify} path={SPOTIFY} />
      {tidalUrl ? <Btn href={tidalUrl} cls="td" label={labels.openTidal} path={TIDAL} /> : null}
      {beatportUrl ? <Btn href={beatportUrl} cls="bp" label={labels.openBeatport} path={BEATPORT} /> : null}
    </span>
  )
}
