'use client'

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="adm-login">
      <div className="adm-card">
        <span className="adm-stamp">Backstage</span>
        <h1>No se ha podido cargar</h1>
        <p>La base no ha respondido. Prueba otra vez en un momento.</p>
        <button className="adm-btn" type="button" onClick={() => reset()}>
          Reintentar
        </button>
      </div>
    </main>
  )
}
