'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Lang } from '@/i18n/config'
import type { ExplorerItem } from '@/lib/view'
import type { ReleaseType } from '@/lib/types'
import ReleaseCard, { type ReleaseCardData } from './ReleaseCard'
import ViewToggle, { useCatalogView, type ViewMode } from './ViewToggle'

const PAGE = 24

/** Renders a slice of the catalogue and grows it. Used by the explorer and genre pages. */
export function PagedReleases({
  items,
  lang,
  upcomingLabel,
  playLabel,
  moreLabel,
  view,
}: {
  items: ReleaseCardData[]
  lang: Lang
  upcomingLabel: string
  playLabel: string
  moreLabel: string
  /** Omit on genre pages so they keep the regular four-column grid. */
  view?: ViewMode
}) {
  const [limit, setLimit] = useState(PAGE)
  useEffect(() => setLimit(PAGE), [items])

  const visible = items.slice(0, limit)
  return (
    <>
      <div className={view ? `drops view-${view}` : 'drops'} style={{ borderTop: 0 }}>
        {visible.map((r) => (
          <ReleaseCard
            key={r.slug}
            r={r}
            href={`/${lang}/releases/${r.slug}`}
            upcomingLabel={upcomingLabel}
            playLabel={playLabel}
          />
        ))}
      </div>
      {items.length > limit && (
        <div className="more">
          <button className="btn" onClick={() => setLimit((n) => n + PAGE)}>
            {moreLabel}
          </button>
        </div>
      )}
    </>
  )
}

interface Labels {
  search: string
  allGenres: string
  allYears: string
  allTypes: string
  types: Record<ReleaseType, string>
  one: string
  many: string
  empty: string
  clear: string
  upcoming: string
  play: string
  more: string
  views: { label: string; large: string; compact: string; list: string }
}

/** Full catalogue with client-side search and filters (genre chips, year, format). */
export default function ReleasesExplorer({
  lang,
  items,
  genres,
  labels,
}: {
  lang: Lang
  items: ExplorerItem[]
  genres: { slug: string; name: string; title?: string }[]
  labels: Labels
}) {
  const [q, setQ] = useState('')
  const [genre, setGenre] = useState('')
  const [year, setYear] = useState('')
  const [type, setType] = useState('')
  const [view, setView] = useCatalogView()

  const years = useMemo(() => [...new Set(items.map((i) => i.year))].sort().reverse(), [items])
  const types = useMemo(() => [...new Set(items.map((i) => i.type))], [items])

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return items.filter(
      (i) =>
        (!needle || i.search.includes(needle)) &&
        (!genre || i.genreSlugs.includes(genre)) &&
        (!year || i.year === year) &&
        (!type || i.type === type),
    )
  }, [items, q, genre, year, type])

  const clear = () => {
    setQ('')
    setGenre('')
    setYear('')
    setType('')
  }

  return (
    <>
      <div className="filters">
        <div className="row1">
          <label className="sr-only" htmlFor="rel-search">
            {labels.search}
          </label>
          <input
            id="rel-search"
            type="search"
            placeholder={labels.search}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {types.length > 1 && (
            <select aria-label={labels.allTypes} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">{labels.allTypes}</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {labels.types[t]}
                </option>
              ))}
            </select>
          )}
          <div className="filter-tools">
            <span className="count" aria-live="polite">
              {shown.length} {shown.length === 1 ? labels.one : labels.many}
            </span>
            <ViewToggle view={view} setView={setView} labels={labels.views} />
          </div>
        </div>
        {years.length > 1 && (
          <div className="chips" role="group" aria-label={labels.allYears}>
            <button aria-pressed={year === ''} onClick={() => setYear('')}>
              {labels.allYears}
            </button>
            {years.map((y) => (
              <button key={y} aria-pressed={year === y} onClick={() => setYear(y)}>
                {y}
              </button>
            ))}
          </div>
        )}
        {genres.length > 0 && (
          <div className="chips" role="group" aria-label={labels.allGenres}>
            <button aria-pressed={genre === ''} onClick={() => setGenre('')}>
              {labels.allGenres}
            </button>
            {genres.map((g) => (
              <button key={g.slug} title={g.title || g.name} aria-pressed={genre === g.slug} onClick={() => setGenre(g.slug)}>
                {g.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {shown.length ? (
        <PagedReleases
          items={shown}
          lang={lang}
          upcomingLabel={labels.upcoming}
          playLabel={labels.play}
          moreLabel={labels.more}
          view={view}
        />
      ) : (
        <div className="empty">
          <p>{labels.empty}</p>
          <button className="btn" onClick={clear}>
            {labels.clear}
          </button>
        </div>
      )}
    </>
  )
}
