import Link from 'next/link'

/** 404 inside /en or /es. not-found does not receive params, so it speaks both languages. */
export default function NotFound() {
  return (
    <section className="demo pad">
      <h2>404</h2>
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
