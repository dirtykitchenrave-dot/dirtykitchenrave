import { redirect } from 'next/navigation'
import { signInAdmin } from '@/lib/admin-actions'
import { getAdminUser } from '@/lib/admin-auth'

export const metadata = { title: 'Entrar' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getAdminUser()) redirect('/administrator')
  const { error } = await searchParams

  return (
    <main className="adm-login">
      <form className="adm-card" action={signInAdmin}>
        <span className="adm-stamp">Backstage</span>
        <h1>DKR Admin</h1>
        <p>Entra con la cuenta del sello. Desde aquí se gestionan reservas, textos y enlaces.</p>
        {error ? <p className="adm-flash bad">Email o contraseña incorrectos, o esa cuenta no es admin.</p> : null}
        <label>
          Email
          <input name="email" type="email" autoComplete="username" required maxLength={160} />
        </label>
        <label>
          Contraseña
          <input name="password" type="password" autoComplete="current-password" required maxLength={200} />
        </label>
        <button className="adm-btn" type="submit">
          Entrar
        </button>
      </form>
    </main>
  )
}
