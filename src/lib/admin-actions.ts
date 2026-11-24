'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { closeAdminSession, credentialsMatch, getAdminUser, openAdminSession } from './admin-auth'
import { bookingStatus, type BookingRow } from './admin-data'
import { readBookingsFile, readCatalogFile, writeBookingsFile, writeCatalogFile } from './catalog-store'

function refreshCatalog() {
  revalidatePath('/en', 'layout')
  revalidatePath('/es', 'layout')
  revalidatePath('/feed.xml')
}

async function gate() {
  if (!(await getAdminUser())) redirect('/administrator/login')
}

function textOrNull(en: string, es: string) {
  if (!en && !es) return null
  return { en, es }
}

function numId(formData: FormData): number | null {
  const n = Number(formData.get('id'))
  if (!Number.isSafeInteger(n) || n <= 0) return null
  return n
}

function bounded(formData: FormData, name: string, max: number): string | 'long' {
  const value = String(formData.get(name) ?? '')
    .replace(/\r\n/g, '\n')
    .trim()
  if (value.length > max) return 'long'
  return value
}

function optionalUrl(raw: string): string | null | 'bad' {
  const value = raw.trim()
  if (!value) return null
  if (value.length > 400) return 'bad'
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('..')) return value
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return 'bad'
    return url.toString()
  } catch {
    return 'bad'
  }
}

function urls(formData: FormData, names: string[]): Record<string, string | null> | 'bad' | 'long' {
  const out: Record<string, string | null> = {}
  for (const name of names) {
    const text = bounded(formData, name, 400)
    if (text === 'long') return 'long'
    const url = optionalUrl(text)
    if (url === 'bad') return 'bad'
    out[name] = url
  }
  return out
}

export async function signInAdmin(formData: FormData) {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  if (!credentialsMatch(email, password)) redirect('/administrator/login?error=1')
  const opened = await openAdminSession()
  if (!opened) redirect('/administrator/login?error=1')
  redirect('/administrator')
}

export async function signOutAdmin() {
  await closeAdminSession()
  redirect('/administrator/login')
}

export async function saveArtist(formData: FormData) {
  const id = numId(formData)
  if (!id) redirect('/administrator/artists?error=save')
  const back = `/administrator/artists/${id}`
  const bioEn = bounded(formData, 'bio_en', 8000)
  const bioEs = bounded(formData, 'bio_es', 8000)
  const country = bounded(formData, 'country', 80)
  if (bioEn === 'long' || bioEs === 'long' || country === 'long') redirect(`${back}?error=long`)
  const links = urls(formData, ['image_url', 'bandcamp_url', 'spotify_url', 'soundcloud_url', 'instagram_url'])
  if (links === 'bad') redirect(`${back}?error=url`)
  if (links === 'long') redirect(`${back}?error=long`)

  await gate()
  try {
    const catalog = await readCatalogFile()
    const artist = catalog.artists.find((a) => a.id === id)
    if (!artist) redirect(`${back}?error=save`)
    artist.bio = textOrNull(bioEn, bioEs)
    artist.country = country || null
    artist.image = links.image_url
    artist.links = {
      ...artist.links,
      bandcamp: links.bandcamp_url,
      spotify: links.spotify_url,
      soundcloud: links.soundcloud_url,
      instagram: links.instagram_url,
    }
    artist.roster = formData.get('is_roster') === 'on'
    await writeCatalogFile(catalog, `Admin: artist ${artist.name}`)
  } catch (err) {
    console.error('save artist', err instanceof Error ? err.message : err)
    redirect(`${back}?error=save`)
  }
  refreshCatalog()
  redirect(`${back}?saved=1`)
}

export async function saveRelease(formData: FormData) {
  const id = numId(formData)
  if (!id) redirect('/administrator/releases?error=save')
  const back = `/administrator/releases/${id}`
  const noteEn = bounded(formData, 'note_en', 8000)
  const noteEs = bounded(formData, 'note_es', 8000)
  if (noteEn === 'long' || noteEs === 'long') redirect(`${back}?error=long`)
  const links = urls(formData, ['bandcamp_url', 'spotify_url', 'tidal_url', 'apple_music_url'])
  if (links === 'bad') redirect(`${back}?error=url`)
  if (links === 'long') redirect(`${back}?error=long`)
  const featured = formData.get('is_featured') === 'on'

  await gate()
  try {
    const catalog = await readCatalogFile()
    const release = catalog.releases.find((r) => r.id === id)
    if (!release) redirect(`${back}?error=save`)
    if (featured) {
      for (const other of catalog.releases) {
        if (other.id !== id) other.featured = false
      }
    }
    release.note = textOrNull(noteEn, noteEs)
    release.featured = featured
    release.links = {
      ...release.links,
      bandcamp: links.bandcamp_url,
      spotify: links.spotify_url,
      tidal: links.tidal_url,
      apple: links.apple_music_url,
    }
    await writeCatalogFile(catalog, `Admin: release ${release.catalog || release.title}`)
  } catch (err) {
    console.error('save release', err instanceof Error ? err.message : err)
    redirect(`${back}?error=save`)
  }
  refreshCatalog()
  redirect(`${back}?saved=1`)
}

export async function saveTrack(formData: FormData) {
  const id = numId(formData)
  if (!id) redirect('/administrator/tracks?error=save')
  const back = `/administrator/tracks/${id}`
  const links = urls(formData, ['spotify_url', 'tidal_url'])
  if (links === 'bad') redirect(`${back}?error=url`)
  if (links === 'long') redirect(`${back}?error=long`)

  await gate()
  try {
    const catalog = await readCatalogFile()
    const track = catalog.tracks.find((t) => t.id === id)
    if (!track) redirect(`${back}?error=save`)
    track.spotifyUrl = links.spotify_url
    track.tidalUrl = links.tidal_url
    await writeCatalogFile(catalog, `Admin: track ${track.title}`)
  } catch (err) {
    console.error('save track', err instanceof Error ? err.message : err)
    redirect(`${back}?error=save`)
  }
  refreshCatalog()
  redirect(`${back}?saved=1`)
}

export async function saveBooking(formData: FormData) {
  const id = numId(formData)
  if (!id) redirect('/administrator/bookings?error=save')
  const back = '/administrator/bookings'
  const status = bookingStatus(String(formData.get('status') ?? ''))
  if (!status) redirect(`${back}?error=save`)
  const assigned = bounded(formData, 'assigned_artist', 120)
  const note = bounded(formData, 'admin_note', 2000)
  if (assigned === 'long' || note === 'long') redirect(`${back}?error=long`)

  await gate()
  try {
    const rows = await readBookingsFile<BookingRow>()
    const row = rows.find((item) => item.id === id)
    if (!row) redirect(`${back}?error=save`)
    row.status = status
    row.assigned_artist = assigned || null
    row.admin_note = note || null
    await writeBookingsFile(rows, `Admin: booking ${row.event_name}`)
  } catch (err) {
    console.error('save booking', err instanceof Error ? err.message : err)
    redirect(`${back}?error=save`)
  }
  redirect(`${back}?saved=1`)
}
