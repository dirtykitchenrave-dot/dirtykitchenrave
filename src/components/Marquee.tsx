'use client'

import { useLayoutEffect, useRef } from 'react'

/** Survives the remount that happens when the language route changes. */
let carriedX = 0

/**
 * Genre marquee from proposal 05. It drifts at a constant speed.
 * Scroll velocity used to speed it up and change font-stretch; a mouse-wheel
 * notch is a big jump in one frame, the line changed width, and the loop point
 * slipped, so the text lurched. Width stays fixed.
 */
export default function Marquee({ items }: { items: string[] }) {
  const track = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const tr = track.current
    if (!tr) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let x = carriedX
    let raf = 0
    const loop = () => {
      x -= 1.2
      const half = tr.scrollWidth / 2
      if (half > 0) {
        while (-x >= half) x += half
        while (x > 0) x -= half
      }
      tr.style.transform = `translateX(${x}px)`
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
