export type ReleaseType = 'single' | 'ep' | 'album' | 'compilation'

export interface Links {
  beatport?: string | null
  bandcamp?: string | null
  spotify?: string | null
  tidal?: string | null
  apple?: string | null
  soundcloud?: string | null
  instagram?: string | null
}

export interface Localized {
  en: string
  es: string
}

export interface Artist {
  /** Beatport artist id. Negative ids are placeholders in the seed file. */
  id: number
  slug: string
  name: string
  image: string | null
  country: string | null
  bio: Localized | null
  links: Links
  /** Editorial flag: part of the core roster (shown first on /artists). */
  roster: boolean
}

export interface Track {
  /** Beatport track id. Negative ids are placeholders in the seed file. */
  id: number
  releaseId: number
  position: number
  title: string
  mix: string
  bpm: number | null
  key: string | null
  genre: string | null
  length: string | null
  isrc: string | null
  /** Beatport preview clip (sample_url). */
  sampleUrl: string | null
  beatportUrl: string | null
  /** Verified Spotify track URL (scripts/match-streaming.ts). Without it the UI links to a Spotify search. */
  spotifyUrl: string | null
  /** Verified TIDAL track URL. The TIDAL button only shows when this exists. */
  tidalUrl?: string | null
  artistIds: number[]
  remixerIds: number[]
}

export interface Release {
  /** Beatport release id. Negative ids are placeholders in the seed file. */
  id: number
  slug: string
  catalog: string | null
  title: string
  type: ReleaseType
  /** YYYY-MM-DD */
  releaseDate: string
  artwork: string | null
  genres: string[]
  artistIds: number[]
  remixerIds: number[]
  upc: string | null
  series: string | null
  links: Links
  note: Localized | null
  featured: boolean
}

export interface Catalog {
  updatedAt: string
  releases: Release[]
  tracks: Track[]
  artists: Artist[]
}

export interface Genre {
  slug: string
  name: string
  count: number
}
