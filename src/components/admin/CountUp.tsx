'use client'

import { useEffect, useState } from 'react'

export function CountUp({ target }: { target: number }) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || target <= 0) {
      setValue(target)
      return
    }
    let start = 0
    const step = Math.max(1, Math.ceil(target / 36))
    const id = window.setInterval(() => {
      start += step
      if (start >= target) {
        setValue(target)
        window.clearInterval(id)
      } else setValue(start)
    }, 16)
    return () => window.clearInterval(id)
  }, [target])
  return <>{value.toLocaleString('es-ES')}</>
}
