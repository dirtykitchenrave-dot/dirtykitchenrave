/** Client-safe: Beatport preview URLs go through our /api/audio-proxy (Range support for iOS). */
export function proxiedAudioUrl(sampleUrl: string): string {
  try {
    const host = new URL(sampleUrl).hostname.toLowerCase()
    if (host === 'geo-samples.beatport.com' || host === 'geo-media.beatport.com') {
      return `/api/audio-proxy?url=${encodeURIComponent(sampleUrl)}`
    }
  } catch {
    /* relative or invalid: use as is */
  }
  return sampleUrl
}

/** Spotify link: verified track URL when we have it, otherwise a search for "artists title". */
export function spotifyHref(url: string | null | undefined, title: string, artists: string[]): { href: string; direct: boolean } {
  const direct = (url || '').trim()
  if (direct) return { href: direct, direct: true }
  const q = `${artists.join(' ')} ${title}`.trim()
  return { href: `https://open.spotify.com/search/${encodeURIComponent(q)}`, direct: false }
}

/** TIDAL link: verified track URL when we have it, otherwise a search. Every track gets a link. */
export function tidalHref(
  url: string | null | undefined,
  title: string,
  artists: string[],
  mix?: string | null,
): { href: string; direct: boolean } {
  const direct = (url || '').trim()
  if (direct) return { href: direct, direct: true }
  const mixBit = mix && !/^original(\s+mix)?$/i.test(mix.trim()) ? mix.trim() : ''
  const q = `${artists.join(' ')} ${title} ${mixBit}`.replace(/\s+/g, ' ').trim()
  return { href: `https://listen.tidal.com/search?q=${encodeURIComponent(q)}`, direct: false }
}
