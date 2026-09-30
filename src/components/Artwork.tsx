import { artworkAt, colourFor } from '@/lib/format'

/**
 * Square cover. Uses the Beatport artwork when available; otherwise the
 * colour-block + record treatment from proposal 05 with the title set in condensed caps.
 */
export default function Artwork({
  src,
  title,
  size = 500,
  badge,
  eager = false,
}: {
  src: string | null
  title: string
  size?: number
  badge?: string
  eager?: boolean
}) {
  const url = artworkAt(src, size)
  return (
    <div className={`art${url ? '' : ' blank'}`} style={{ ['--c' as string]: colourFor(title) }}>
      {badge && <span className="badge">{badge}</span>}
      {url ? (
        <img src={url} alt={title} loading={eager ? 'eager' : 'lazy'} width={size} height={size} />
      ) : (
        <b>{title}</b>
      )}
    </div>
  )
}
