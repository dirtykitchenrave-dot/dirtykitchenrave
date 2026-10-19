'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'

const NAV = [
  { href: '/administrator', label: 'Dashboard', icon: '◉' },
  { href: '/administrator/bookings', label: 'Reservas', icon: '✉' },
  { href: '/administrator/artists', label: 'Artistas', icon: '♫' },
  { href: '/administrator/releases', label: 'Lanzamientos', icon: '◈' },
  { href: '/administrator/tracks', label: 'Temas', icon: '♪' },
  { href: '/administrator/plays', label: 'Escuchas', icon: '▶' },
]

function bare(pathname: string) {
  return pathname.replace(/^\/(en|es)(?=\/)/, '')
}

export default function AdminShell({
  email,
  logout,
  children,
}: {
  email: string
  logout: ReactNode
  children: ReactNode
}) {
  const pathname = bare(usePathname() || '')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="adm">
      <button
        type="button"
        className={`adm-scrim${open ? ' on' : ''}`}
        aria-label="Cerrar menú"
        tabIndex={open ? 0 : -1}
        onClick={() => setOpen(false)}
      />
      <aside id="adm-nav" className={`adm-side${open ? ' on' : ''}`}>
        <div className="adm-brand-row">
          <Link href="/administrator" className="adm-brand">
            DKR // ADMIN
          </Link>
          <button type="button" className="adm-x" aria-label="Cerrar menú" onClick={() => setOpen(false)}>
            ✕
          </button>
        </div>
        <nav aria-label="Administración">
          {NAV.map((item) => {
            const active = item.href === '/administrator' ? pathname === '/administrator' : pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link key={item.href} href={item.href} className={active ? 'on' : undefined} aria-current={active ? 'page' : undefined}>
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
      <div className="adm-main">
        <header className="adm-top">
          <button
            type="button"
            className="adm-burger"
            aria-expanded={open}
            aria-controls="adm-nav"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? '✕' : '☰'}
          </button>
          <span className="adm-top-title">Dirty Kitchen Rave // Panel</span>
          <span className="adm-email">{email}</span>
          {logout}
        </header>
        <div className="adm-content">{children}</div>
      </div>
    </div>
  )
}
