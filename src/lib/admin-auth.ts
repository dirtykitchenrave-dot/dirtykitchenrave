import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

function relaxLocalTls() {
  if (!process.env.VERCEL && process.env.NODE_ENV === 'development') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  }
}

/** Cookie session for the admin. Null when Supabase is not configured. */
export async function createSupabaseServer() {
  relaxLocalTls()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  const cookieStore = await cookies()
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          /* A Server Component cannot write cookies. The proxy refreshes the session. */
        }
      },
    },
  })
}

export type AdminUser = { id: string; email: string }

/** Signed-in user whose app_metadata.role is admin. user_metadata is not trusted. */
export const getAdminUser = cache(async (): Promise<AdminUser | null> => {
  const supabase = await createSupabaseServer()
  if (!supabase) return null
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  const role = (data.user.app_metadata as { role?: string }).role
  if (role !== 'admin') return null
  return { id: data.user.id, email: data.user.email || '' }
})
