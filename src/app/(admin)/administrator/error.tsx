'use client'

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="adm-login">
      <div className="adm-card">
        <span className="adm-stamp">Backstage</span>
        <h1>Could not load</h1>
        <p>The database did not respond. Try again in a moment.</p>
        <button className="adm-btn" type="button" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </main>
  )
}
