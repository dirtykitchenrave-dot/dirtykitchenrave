'use client'

import { useEffect } from 'react'

/** Error boundary for every page under /en and /es. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <section className="demo pad">
      <h2>Oops</h2>
      <p>
        Something burnt in the kitchen. Try again in a moment.
        <br />
        Algo se ha quemado en la cocina. Vuelve a intentarlo en un momento.
      </p>
      <button className="btn dark" onClick={reset}>
        Retry / Reintentar
      </button>
    </section>
  )
}
