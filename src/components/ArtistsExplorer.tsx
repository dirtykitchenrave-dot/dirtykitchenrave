'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { Lang } from '@/i18n/config'
import Artwork from './Artwork'
import ViewToggle, { useCatalogView } from './ViewToggle'

export interface ArtistCardItem {
  id: number
  slug: string
  name: string
  image: string | null
  /** Already translated, e.g. "Label manager, 12 lanzamientos". */
  meta: string
}

interface Labels {
  search: string
  one: string
  many: string
  empty: string
  clear: string
  views: { label: string; large: string; compact: string; list: string }
}

function fold(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/** Artist grid with a text search on the name. */
export default function ArtistsExplorer({
  lang,
  artists,
  labels,
}: {
  lang: Lang
  artists: ArtistCardItem[]
  labels: Labels
}) {
  const [q, setQ] = useState('')
  const [view, setView] = useCatalogView()
  const needle = fold(q.trim())
  const shown = useMemo(
    () => (needle ? artists.filter((a) => fold(a.name).includes(needle)) : artists),
    [artists, needle],
  )

  return (
    <>
      <div className="filters">
        <div className="row1">
          <label className="sr-only" htmlFor="art-search">
            {labels.search}
          </label>
          <input
            id="art-search"
            type="search"
            placeholder={labels.search}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="filter-tools">
            <span className="count" aria-live="polite">
              {shown.length} {shown.length === 1 ? labels.one : labels.many}
            </span>
            <ViewToggle view={view} setView={setView} labels={labels.views} />
          </div>
        </div>
      </div>

      {shown.length ? (
        <div className={`artist-grid view-${view}`} style={{ borderTop: 0 }}>
          {shown.map((a) => (
            <Link key={a.id} className="artist-card" href={`/${lang}/artists/${a.slug}`}>
              <Artwork src={a.image} title={a.name} size={500} />
              <h3>{a.name}</h3>
              <span>{a.meta}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty">
          <p>{labels.empty}</p>
          <button className="btn" onClick={() => setQ('')}>
            {labels.clear}
          </button>
        </div>
      )}
    </>
  )
}
