'use client'

import { useEffect, useState } from 'react'

export type ViewMode = 'large' | 'compact' | 'list'

const STORAGE_KEY = 'dkr-catalog-view'

export function useCatalogView(): [ViewMode, (next: ViewMode) => void] {
  const [view, setView] = useState<ViewMode>('compact')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'large' || saved === 'compact' || saved === 'list') setView(saved)
    } catch {
      /* private mode */
    }
  }, [])

  const choose = (next: ViewMode) => {
    setView(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* private mode */
    }
  }

  return [view, choose]
}

export default function ViewToggle({
  view,
  setView,
  labels,
}: {
  view: ViewMode
  setView: (next: ViewMode) => void
  labels: { label: string; large: string; compact: string; list: string }
}) {
  return (
    <div className="view-toggle" role="group" aria-label={labels.label}>
      <button type="button" aria-pressed={view === 'large'} title={labels.large} onClick={() => setView('large')}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <rect x="1" y="1" width="6" height="6" />
          <rect x="9" y="1" width="6" height="6" />
          <rect x="1" y="9" width="6" height="6" />
          <rect x="9" y="9" width="6" height="6" />
        </svg>
        <span>{labels.large}</span>
      </button>
      <button type="button" aria-pressed={view === 'compact'} title={labels.compact} onClick={() => setView('compact')}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <rect x="1" y="1" width="3.5" height="3.5" />
          <rect x="6.25" y="1" width="3.5" height="3.5" />
          <rect x="11.5" y="1" width="3.5" height="3.5" />
          <rect x="1" y="6.25" width="3.5" height="3.5" />
          <rect x="6.25" y="6.25" width="3.5" height="3.5" />
          <rect x="11.5" y="6.25" width="3.5" height="3.5" />
          <rect x="1" y="11.5" width="3.5" height="3.5" />
          <rect x="6.25" y="11.5" width="3.5" height="3.5" />
          <rect x="11.5" y="11.5" width="3.5" height="3.5" />
        </svg>
        <span>{labels.compact}</span>
      </button>
      <button type="button" aria-pressed={view === 'list'} title={labels.list} onClick={() => setView('list')}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <rect x="1" y="2" width="14" height="2.5" />
          <rect x="1" y="6.75" width="14" height="2.5" />
          <rect x="1" y="11.5" width="14" height="2.5" />
        </svg>
        <span>{labels.list}</span>
      </button>
    </div>
  )
}
