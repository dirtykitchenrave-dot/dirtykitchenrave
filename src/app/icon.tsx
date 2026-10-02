import { ImageResponse } from 'next/og'

/**
 * Tab icon at 192px (a multiple of 48, which is what Google accepts).
 * The full wordmark lives in apple-icon.png; it does not read at 16px.
 */
export const size = { width: 192, height: 192 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#101113',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f4f1ea',
            fontSize: 108,
            fontWeight: 800,
            letterSpacing: -6,
          }}
        >
          DK
        </div>
        <div style={{ height: 22, background: '#ff5b14', display: 'flex' }} />
      </div>
    ),
    { ...size },
  )
}
