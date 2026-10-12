'use client'

import { useState } from 'react'

export type YouTubeClip = { id: string; title: string }

export function YouTubeShelf({ videos, label }: { videos: YouTubeClip[]; label: string }) {
  const first = videos[0]
  const [active, setActive] = useState(first?.id ?? '')
  const [play, setPlay] = useState(false)
  const current = videos.find((v) => v.id === active) ?? first
  if (!current) return null
  const more = videos.slice(1)

  return (
    <>
      <div className="ch-embed yt">
        <iframe
          key={current.id}
          title={current.title}
          src={`https://www.youtube-nocookie.com/embed/${current.id}?rel=0${play ? '&autoplay=1' : ''}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      {more.length > 0 ? (
        <div className="yt-rail" role="list" aria-label={label}>
          {more.map((v) => (
            <button
              key={v.id}
              type="button"
              role="listitem"
              className={v.id === current.id ? 'on' : undefined}
              aria-current={v.id === current.id ? 'true' : undefined}
              onClick={() => {
                setActive(v.id)
                setPlay(true)
              }}
            >
              <img
                src={`https://i.ytimg.com/vi/${v.id}/hq720.jpg`}
                alt=""
                onError={(e) => {
                  e.currentTarget.src = `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`
                }}
              />
              <span className="yt-play" aria-hidden="true">
                ▶
              </span>
              <span>{v.title}</span>
            </button>
          ))}
        </div>
      ) : null}
    </>
  )
}
