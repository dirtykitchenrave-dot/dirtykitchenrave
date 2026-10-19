'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServer, getAdminUser } from './admin-auth'
import { bookingStatus, tidalColumn } from './admin-data'
import { serviceClient } from './beatport/sinks'

function refreshCatalog() {
  revalidatePath('/en', 'layout')
  revalidatePath('/es', 'layout')
  revalidatePath('/feed.xml')
}

async function gate() {
  if (!(await getAdminUser())) redirect('/administrator/login')
  return serviceClient()
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
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') ?? '')
  const supabase = await createSupabaseServer()
  if (!supabase || !email || !password) redirect('/administrator/login?error=1')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  const role = (data.user?.app_metadata as { role?: string } | undefined)?.role
  if (error || role !== 'admin') {
    if (data.session) await supabase.auth.signOut()
    redirect('/administrator/login?error=1')
  }
  redirect('/administrator')
}

export async function signOutAdmin() {
  const supabase = await createSupabaseServer()
  if (supabase) await supabase.auth.signOut()
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

  const client = await gate()
  const { error } = await client
    .from('artists')
    .update({
      bio_en: bioEn || null,
      bio_es: bioEs || null,
      country: country || null,
      image_url: links.image_url,
      bandcamp_url: links.bandcamp_url,
      spotify_url: links.spotify_url,
      soundcloud_url: links.soundcloud_url,
      instagram_url: links.instagram_url,
      is_roster: formData.get('is_roster') === 'on',
    })
    .eq('id', id)
  if (error) redirect(`${back}?error=save`)
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
  const names = (await tidalColumn())
    ? ['bandcamp_url', 'spotify_url', 'tidal_url', 'apple_music_url']
    : ['bandcamp_url', 'spotify_url', 'apple_music_url']
  const links = urls(formData, names)
  if (links === 'bad') redirect(`${back}?error=url`)
  if (links === 'long') redirect(`${back}?error=long`)
  const featured = formData.get('is_featured') === 'on'

  const client = await gate()
  if (featured) {
    const { error } = await client.from('releases').update({ is_featured: false }).neq('id', id)
    if (error) redirect(`${back}?error=save`)
  }
  const { error } = await client
    .from('releases')
    .update({
      note_en: noteEn || null,
      note_es: noteEs || null,
      is_featured: featured,
      ...links,
    })
    .eq('id', id)
  if (error) redirect(`${back}?error=save`)
  refreshCatalog()
  redirect(`${back}?saved=1`)
}

export async function saveTrack(formData: FormData) {
  const id = numId(formData)
  if (!id) redirect('/administrator/tracks?error=save')
  const back = `/administrator/tracks/${id}`
  const tidal = await tidalColumn()
  const links = urls(formData, tidal ? ['spotify_url', 'tidal_url'] : ['spotify_url'])
  if (links === 'bad') redirect(`${back}?error=url`)
  if (links === 'long') redirect(`${back}?error=long`)

  const client = await gate()
  const { error } = await client
    .from('tracks')
    .update(tidal ? { spotify_url: links.spotify_url, tidal_url: links.tidal_url } : { spotify_url: links.spotify_url })
    .eq('id', id)
  if (error) redirect(`${back}?error=save`)
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

  const client = await gate()
  const { error } = await client
    .from('booking_requests')
    .update({
      status,
      assigned_artist: assigned || null,
      admin_note: note || null,
    })
    .eq('id', id)
  if (error) redirect(`${back}?error=save`)
  redirect(`${back}?saved=1`)
}
