import type { MetadataRoute } from 'next'
import { artistsWithCounts, genres, getCatalog } from '@/lib/catalog'
import { artworkAt } from '@/lib/format'
import { SITE } from '@/lib/site'

export const revalidate = 3600

/** Every URL in both languages, with hreflang alternates (including x-default). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const c = await getCatalog()
  const now = new Date(c.updatedAt || Date.now())

  const entry = (
    path: string,
    priority: number,
    lastModified: Date = now,
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] = 'weekly',
    images?: string[],
  ): MetadataRoute.Sitemap =>
    (['en', 'es'] as const).map((lang) => ({
      url: `${SITE.url}/${lang}${path}`,
      lastModified,
      changeFrequency,
      priority,
      alternates: {
        languages: {
          en: `${SITE.url}/en${path}`,
          es: `${SITE.url}/es${path}`,
          'x-default': `${SITE.url}/en${path}`,
        },
      },
      ...(images?.length ? { images } : {}),
    }))

  const statics = [
    entry('', 1, now, 'daily'),
    entry('/releases', 0.9, now, 'daily'),
    entry('/artists', 0.8),
    entry('/genres', 0.5),
    entry('/shop', 0.5, now, 'monthly'),
    entry('/demos', 0.5, now, 'monthly'),
    entry('/about', 0.5, now, 'monthly'),
    entry('/podcast', 0.4, now, 'monthly'),
    entry('/links', 0.3, now, 'monthly'),
  ].flat()

  const releases = c.releases.flatMap((r) => {
    const published = new Date(r.releaseDate)
    const lastModified = Number.isNaN(published.getTime()) || published.getTime() > now.getTime() ? now : published
    const image = artworkAt(r.artwork, 1000)
    return entry(`/releases/${r.slug}`, 0.8, lastModified, 'monthly', image ? [image] : undefined)
  })
  const artists = artistsWithCounts(c).flatMap((a) => entry(`/artists/${a.slug}`, 0.6))
  const genreEntries = genres(c).flatMap((g) => entry(`/genres/${g.slug}`, 0.5))

  return [...statics, ...releases, ...artists, ...genreEntries]
}
