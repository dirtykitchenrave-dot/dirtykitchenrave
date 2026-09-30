import type { Lang } from '@/i18n/config'
import type { Release } from './types'

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Today as YYYY-MM-DD in UTC. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function isUpcoming(r: Pick<Release, 'releaseDate'>): boolean {
  return r.releaseDate > todayIso()
}

export function formatDate(iso: string, lang: Lang, style: 'short' | 'long' = 'short'): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const date = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-ES' : 'en-GB', {
    day: '2-digit',
    month: style === 'long' ? 'long' : 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

/** "DKR0237" -> "0237", "DKRLP055" -> "LP055". Used for the giant number on the hero. */
export function catalogNumber(catalog: string | null): string {
  if (!catalog) return 'DKR'
  const m = catalog.match(/^DKR(.+)$/i)
  return m ? m[1] : catalog
}

export function joinNames(names: string[], lang: Lang): string {
  if (names.length <= 1) return names.join('')
  const and = lang === 'es' ? ' y ' : ' & '
  return names.slice(0, -1).join(', ') + and + names[names.length - 1]
}

export type LinkedName = { name: string; href: string }

/** Splits `text` so each known name can be rendered as its own link. Longer names win. */
export function splitLinkedNames(text: string, names: LinkedName[]): Array<string | LinkedName> {
  const sorted = [...names].filter((n) => n.name).sort((a, b) => b.name.length - a.name.length)
  let parts: Array<string | LinkedName> = [text]
  const boundary = (s: string, i: number, len: number) => {
    const before = i > 0 ? s[i - 1] : ''
    const after = i + len < s.length ? s[i + len] : ''
    return !/[\p{L}\p{N}]/u.test(before) && !/[\p{L}\p{N}]/u.test(after)
  }
  for (const n of sorted) {
    const next: Array<string | LinkedName> = []
    const key = n.name.toLowerCase()
    for (const p of parts) {
      if (typeof p !== 'string') {
        next.push(p)
        continue
      }
      const lower = p.toLowerCase()
      let from = 0
      let hit = false
      for (let i = lower.indexOf(key, from); i >= 0; i = lower.indexOf(key, from)) {
        if (!boundary(p, i, n.name.length)) {
          from = i + 1
          continue
        }
        hit = true
        if (i > from) next.push(p.slice(from, i))
        next.push({ name: p.slice(i, i + n.name.length), href: n.href })
        from = i + n.name.length
      }
      if (!hit) next.push(p)
      else if (from < p.length) next.push(p.slice(from))
    }
    parts = next
  }
  return parts
}

const PALETTE = ['#FF5B14', '#FAFAF8', '#9FA8FF', '#E6FF5B', '#FF9ECF', '#5BE0FF', '#B8F2C8']

/** Stable colour for releases/artists that have no artwork yet. */
export function colourFor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

/** Beatport dynamic image URLs contain {w}x{h}; fixed ones contain image_size/NNNxNNN. */
export function artworkAt(url: string | null, size: number): string | null {
  if (!url) return null
  return url
    .replace(/\{w\}/g, String(size))
    .replace(/\{h\}/g, String(size))
    .replace(/image_size\/\d+x\d+\//, `image_size/${size}x${size}/`)
}
