import { redirect } from 'next/navigation'
import { signInAdmin } from '@/lib/admin-actions'
import { getAdminUser } from '@/lib/admin-auth'

export const metadata = { title: 'Sign in' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getAdminUser()) redirect('/administrator')
  const { error } = await searchParams

  return (
    <main className="adm-login">
      <form className="adm-card" action={signInAdmin}>
        <span className="adm-stamp">Backstage</span>
        <h1>DKR Admin</h1>
        <p>Sign in with the label account. Bookings, copy and links are managed from here.</p>
        {error ? <p className="adm-flash bad">Wrong email or password, or this account is not an admin.</p> : null}
        <label>
          Email
          <input name="email" type="email" autoComplete="username" required maxLength={160} />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required maxLength={200} />
        </label>
        <button className="adm-btn" type="submit">
          Sign in
        </button>
      </form>
    </main>
  )
}
