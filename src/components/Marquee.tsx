'use client'

import { useLayoutEffect, useRef } from 'react'

/** Survives the remount that happens when the language route changes. */
let carriedX = 0

/** Genre marquee from proposal 05: drifts on its own, speeds up and stretches with scroll velocity. */
export default function Marquee({ items }: { items: string[] }) {
  const track = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const tr = track.current
    if (!tr) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const spans = tr.querySelectorAll<HTMLSpanElement>('span')
    let x = carriedX
    let last = window.scrollY
    let v = 0
    let raf = 0
    const loop = () => {
      let dy = window.scrollY - last
      last = window.scrollY
      // A route change can move the scroll by a whole screen in one frame.
      // That is not a flick: cap it so the line does not slingshot.
      dy = Math.max(-120, Math.min(120, dy))
      v += (dy - v) * 0.1
      x -= 1.2 + Math.abs(v) * 0.6
      const half = tr.scrollWidth / 2
      if (half > 0 && -x > half) x += half
      tr.style.transform = `translateX(${x}px)`
      const w = Math.min(125, Math.max(62, 100 + v * 2.2))
      spans.forEach((s) => s.style.setProperty('--w', `${w}%`))
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      carriedX = x
      cancelAnimationFrame(raf)
    }
  }, [])

  const line = items.map((g, i) => (
    <span key={i}>
      {g} <i>✱</i>
    </span>
  ))

  return (
    <div className="marquee" aria-hidden="true">
      <div className="track" ref={track}>
        {line}
        {items.map((g, i) => (
          <span key={`b${i}`}>
            {g} <i>✱</i>
          </span>
        ))}
      </div>
    </div>
  )
}
