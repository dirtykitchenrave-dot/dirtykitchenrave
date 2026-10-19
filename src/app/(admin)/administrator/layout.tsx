import '@fontsource-variable/archivo/wdth.css'
import '../../globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'Admin | Dirty Kitchen Rave', template: '%s | DKR Admin' },
  robots: { index: false, follow: false },
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="adm-body">{children}</body>
    </html>
  )
}
