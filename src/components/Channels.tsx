import type { Dictionary } from '@/i18n/dictionaries'
import { LINKS } from '@/lib/site'

/** Row of listening channels. Channels without a URL in lib/site.ts are hidden. */
export default function Channels({ d }: { d: Dictionary }) {
  const items = [
    { label: 'Beatport', sub: d.channels.beatport, href: LINKS.beatport },
    { label: 'Bandcamp', sub: d.channels.bandcamp, href: LINKS.bandcamp },
    { label: 'Juno', sub: d.channels.juno, href: LINKS.juno },
    { label: 'Podcast', sub: d.channels.podcast, href: LINKS.podcast },
    { label: 'Spotify', sub: d.channels.spotify, href: LINKS.spotify },
    { label: 'SoundCloud', sub: d.channels.soundcloud, href: LINKS.soundcloud },
    { label: 'Twitch', sub: d.channels.twitch, href: LINKS.twitch },
    { label: 'Discord', sub: d.channels.discord, href: LINKS.discord },
  ].filter((i) => i.href)
  // 8 channels -> 2 rows of 4; up to 6 -> one row
  const cols = items.length > 6 ? Math.ceil(items.length / 2) : items.length

  return (
    <section>
      <div className="channels" style={{ ['--n' as string]: cols }}>
        {items.map((i) => (
          <a key={i.label} href={i.href} target="_blank" rel="noopener noreferrer">
            {i.label}
            <small>{i.sub}</small>
          </a>
        ))}
      </div>
    </section>
  )
}
