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
        <p>Sign in with the label password. Bookings, copy and links are managed from here.</p>
        {error ? <p className="adm-flash bad">Wrong password.</p> : null}
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
