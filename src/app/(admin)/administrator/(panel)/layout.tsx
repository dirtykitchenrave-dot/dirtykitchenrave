import { redirect } from 'next/navigation'
import AdminShell from '@/components/admin/AdminShell'
import { signOutAdmin } from '@/lib/admin-actions'
import { getAdminUser } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getAdminUser()
  if (!user) redirect('/administrator/login')

  return (
    <AdminShell
      email={user.email}
      logout={
        <form action={signOutAdmin}>
          <button className="adm-logout" type="submit">
            Log out
          </button>
        </form>
      }
    >
      {children}
    </AdminShell>
  )
}
