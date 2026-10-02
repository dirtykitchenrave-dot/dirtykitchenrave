import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: { absolute: '404 | Dirty Kitchen Rave' },
  description: 'That page does not exist or has moved. Esa página no existe o se ha movido.',
  robots: { index: false, follow: false },
  openGraph: {
    title: { absolute: '404 | Dirty Kitchen Rave' },
    description: 'That page does not exist or has moved.',
    siteName: 'Dirty Kitchen Rave',
  },
  twitter: {
    card: 'summary',
    title: { absolute: '404 | Dirty Kitchen Rave' },
    description: 'That page does not exist or has moved.',
  },
}

/** 404 inside /en or /es. not-found does not receive params, so it speaks both languages. */
export default function NotFound() {
  return (
    <section className="demo pad">
      <h1>404</h1>
      <p>
        Not on the menu. That page doesn&apos;t exist or has moved.
        <br />
        Esto no está en la carta. Esa página no existe o se ha movido.
      </p>
      <div className="btns" style={{ justifyContent: 'center' }}>
        <Link className="btn dark" href="/en">
          Home
        </Link>
        <Link className="btn dark" href="/es">
          Inicio
        </Link>
      </div>
    </section>
  )
}
