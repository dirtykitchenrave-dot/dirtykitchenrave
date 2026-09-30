import { ImageResponse } from 'next/og'

/** Default social share image (release pages use their own artwork via generateMetadata). */
export const alt = 'Dirty Kitchen Rave — multi-genre bass label, London'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpengraphImage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const tagline = lang === 'es' ? 'Sello de bass multigénero · Londres' : 'Multi-genre bass label · London'
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#c7c5c0',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            width: '58%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 56,
            borderRight: '6px solid #101113',
          }}
        >
          <div style={{ fontSize: 200, fontWeight: 900, lineHeight: 0.85, color: '#101113', letterSpacing: -6 }}>DKR</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 58, fontWeight: 900, color: '#101113', textTransform: 'uppercase', lineHeight: 1 }}>
              Dirty Kitchen Rave
            </div>
            <div style={{ fontSize: 30, color: '#101113', marginTop: 16 }}>{tagline}</div>
          </div>
        </div>
        <div style={{ width: '42%', background: '#ff5b14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              width: 360,
              height: 360,
              borderRadius: 360,
              background: '#1b1c1f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ width: 120, height: 120, borderRadius: 120, background: '#ff5b14', display: 'flex' }} />
          </div>
        </div>
      </div>
    ),
    size,
  )
}
