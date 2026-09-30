import { artistNames, getCatalog, releasedReleases } from '@/lib/catalog'
import { artworkAt, joinNames } from '@/lib/format'
import { SITE } from '@/lib/site'

export const revalidate = 3600

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** RSS feed of the latest 50 releases (English URLs). */
export async function GET() {
  const c = await getCatalog()
  const items = releasedReleases(c)
    .slice(0, 50)
    .map((r) => {
      const url = `${SITE.url}/en/releases/${r.slug}`
      const by = joinNames(artistNames(c, r), 'en')
      const img = artworkAt(r.artwork, 500)
      const [y, m, d] = r.releaseDate.split('-').map(Number)
      return `    <item>
      <title>${esc(`${r.title} – ${by}${r.catalog ? ` [${r.catalog}]` : ''}`)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(Date.UTC(y, m - 1, d)).toUTCString()}</pubDate>
      <description>${esc(`${r.title} by ${by}. ${r.genres.join(', ')}`)}</description>${
        img ? `\n      <enclosure url="${esc(img)}" type="image/jpeg" length="0" />` : ''
      }
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Dirty Kitchen Rave releases</title>
    <link>${SITE.url}/en/releases</link>
    <description>New releases from Dirty Kitchen Rave, multi-genre bass label from London.</description>
    <language>en</language>
${items}
  </channel>
</rss>`

  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
}
