import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { cache } from 'react'

const COOKIE = 'dkr_admin'
const MAX_AGE_S = 60 * 60 * 24 * 14

function secret() {
  return process.env.ADMIN_SESSION_SECRET || ''
}

function sign(exp: number) {
  const body = `v1.${exp}`
  const mac = createHmac('sha256', secret()).update(body).digest('base64url')
  return `${body}.${mac}`
}

function validToken(token: string) {
  const key = secret()
  if (!key) return false
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== 'v1') return false
  const exp = Number(parts[1])
  if (!Number.isFinite(exp) || exp < Date.now()) return false
  const expected = createHmac('sha256', key).update(`${parts[0]}.${parts[1]}`).digest('base64url')
  const a = Buffer.from(parts[2])
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/** The only admin account. The password stays in ADMIN_PASSWORD. */
export const ADMIN_EMAIL = 'dirtykitchenrave@gmail.com'

export type AdminUser = { id: string; email: string }

function same(given: string, expected: string) {
  if (!expected || !given || given.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected))
}

export async function openAdminSession() {
  const key = secret()
  const password = process.env.ADMIN_PASSWORD || ''
  if (!key || !password) return false
  const exp = Date.now() + MAX_AGE_S * 1000
  const jar = await cookies()
  jar.set(COOKIE, sign(exp), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_S,
  })
  return true
}

export async function closeAdminSession() {
  const jar = await cookies()
  jar.set(COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 })
}

/** Signed-in label session. The password lives in ADMIN_PASSWORD, not in a user table. */
export const getAdminUser = cache(async (): Promise<AdminUser | null> => {
  if (!secret() || !process.env.ADMIN_PASSWORD) return null
  const token = (await cookies()).get(COOKIE)?.value || ''
  if (!token || !validToken(token)) return null
  return { id: 'label', email: ADMIN_EMAIL }
})

export function credentialsMatch(email: string, password: string) {
  const expectedEmail = (process.env.ADMIN_EMAIL || ADMIN_EMAIL).trim().toLowerCase()
  const givenEmail = email.trim().toLowerCase()
  return same(givenEmail, expectedEmail) && same(password, process.env.ADMIN_PASSWORD || '')
}
