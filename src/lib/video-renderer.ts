// ============================================
// DIRTY KITCHEN RAVE — vídeo de un tema para redes (render en el navegador)
//
// Botón «Crear vídeo» de `TrackList` (cualquier visitante). Genera un MP4 SIN
// AUDIO (~15 s): `vertical` 1080×1920 (Reels / Stories / TikTok) u
// `horizontal` 1920×1080 (Facebook / YouTube). El audio lo añade quien lo
// publica con la música oficial del tema en la red social.
//
// Todo ocurre en el cliente: Canvas 2D dibuja cada fotograma y WebCodecs
// (VideoEncoder H.264) + `mp4-muxer` lo empaquetan, más rápido que tiempo
// real y sin coste de servidor. Sin WebCodecs cae a MediaRecorder.
// Mismo motor que Optimal Breaks (`src/lib/reel-renderer.ts`), diseño propio
// «DROP»: cuenta atrás 3·2·1·DROP, hormigón, bandas de peligro, carátula en
// tiras, título con el eje de anchura de Archivo latiendo al BPM, ficha
// KEY · BPM · TIME, osciloscopio y cortina final «LISTEN NOW».
// ============================================

export type ReelData = {
  title: string
  artists: string
  meta: string
  kicker: string
  /** data: URL (o mismo origen) de la carátula cuadrada. */
  artwork: string | null
  lang: 'es' | 'en'
  /** Pulso visual. Sin audio, solo marca el ritmo de la animación. */
  bpm?: number
}

export type ReelFormat = 'vertical' | 'horizontal'

export type ReelOptions = {
  /** `vertical` 1080×1920 (Reels/Stories/TikTok, por defecto) u `horizontal` 1920×1080 (Facebook/YouTube). */
  format?: ReelFormat
  durationSec?: number
  fps?: number
  onProgress?: (ratio: number) => void
}

export type ReelResult = { blob: Blob; mime: string; ext: 'mp4' | 'webm' }

// Tamaño del lienzo del render en curso (lo fija `renderReel` según el formato).
// Un render cada vez: los botones R y F no se lanzan en paralelo.
let W = 1080
let H = 1920
const PAPER = '#f4f1ea'
const INK = '#101113'
/** Naranja hi-vis DKR (papel del rojo de Optimal Breaks). */
const RED = '#ff5b14'
/** Hormigón DKR (papel del amarillo de Optimal Breaks). */
const YELLOW = '#c7c5c0'
// Archivo variable: titulares anchos (125 %) y el resto a ancho normal.
const HEAD = "expanded 900 {s}px 'Archivo Variable', 'Archivo', 'Arial Black', sans-serif"
const MONO = "{w} {s}px 'Archivo Variable', 'Archivo', system-ui, sans-serif"

// ---------- utilidades de animación ----------
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3)
const easeBack = (x: number) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}
function hash(a: number, b: number) {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return s - Math.floor(s)
}
const font = (tpl: string, size: number, weight = 700) =>
  tpl.replace('{s}', String(Math.round(size))).replace('{w}', String(weight))

/** Parte un texto en líneas que caben en `maxW`, bajando el tamaño si hace falta. */
function fitLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  tpl: string,
  maxW: number,
  sizes: number[],
  maxLines: number,
): { lines: string[]; size: number } {
  const words = text.split(/\s+/).filter(Boolean)
  for (const size of sizes) {
    ctx.font = font(tpl, size)
    const lines: string[] = []
    let cur = ''
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w
      if (ctx.measureText(next).width <= maxW) cur = next
      else {
        if (cur) lines.push(cur)
        cur = w
      }
    }
    if (cur) lines.push(cur)
    const fits = lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= maxW)
    if (fits) return { lines, size }
  }
  // Último recurso: el tamaño más pequeño y recorte con «…».
  const size = sizes[sizes.length - 1]
  ctx.font = font(tpl, size)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (ctx.measureText(next).width <= maxW) cur = next
    else {
      lines.push(cur)
      cur = w
      if (lines.length === maxLines) break
    }
  }
  if (lines.length < maxLines && cur) lines.push(cur)
  let last = lines[maxLines - 1] ?? ''
  while (last && ctx.measureText(`${last}…`).width > maxW) last = last.slice(0, -1)
  if (lines.length >= maxLines) lines[maxLines - 1] = `${last}…`
  return { lines: lines.slice(0, maxLines), size }
}

/** Texto con interletrado manual (Safari no tiene `ctx.letterSpacing` en todas las versiones). */
function spacedText(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, spacing: number) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width)
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1)
  let x = cx - total / 2
  // Alineación izquierda por letra: con 'center' una fuente proporcional
  // (Archivo) deja huecos irregulares («F M INOR»).
  const align = ctx.textAlign
  ctx.textAlign = 'left'
  ;[...text].forEach((ch, i) => {
    ctx.fillText(ch, x, y)
    x += widths[i] + spacing
  })
  ctx.textAlign = align
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('artwork load failed'))
    img.src = src
  })
}

function makeGrain(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  const d = g.createImageData(256, 256)
  for (let i = 0; i < d.data.length; i += 4) {
    const v = Math.random() * 255
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v
    d.data[i + 3] = 255
  }
  g.putImageData(d, 0, 0)
  return c
}

type Assets = {
  art: HTMLImageElement | null
  grain: HTMLCanvasElement
  /** Hormigón pre-horneado (textura) del tamaño del lienzo. */
  concrete: HTMLCanvasElement
}

// ============================================
// Diseño «DROP» (propio de DKR, no el de Optimal Breaks):
// cuenta atrás 3·2·1·DROP → hormigón claro, bandas de peligro, carátula en
// tiras, título que se ensancha en cada golpe (eje de anchura de Archivo),
// ficha técnica KEY · BPM · TIME, osciloscopio → cortina negra «LISTEN NOW».
// ============================================

const CONCRETE = YELLOW // #c7c5c0
const CONCRETE_DARK = '#b3b1ab'
const WHITE = '#fafaf8'
const GREY = '#5a5c60'

/** Momento del «drop»: aquí arranca la rejilla de golpes. */
const DROP_T = 1.6

type Layout = {
  BAND_TOP_Y: number
  BAND_BOTTOM_Y: number
  /** Carátula: x, y, lado. */
  COVER: [number, number, number]
  /** Texto vertical de catálogo (x, y centro). */
  CAT_X: number
  CAT_Y: number
  /** Columna de textos: x izquierda, ancho. */
  COL_X: number
  COL_W: number
  TITLE_Y: number
  TITLE_SIZES: number[]
  SPEC_H: number
  WAVE_H: number
  /** Gap entre bloques. */
  GAP: number
  /** Tarjeta final. */
  END_COVER: [number, number, number]
  END_TEXT_X: number
  END_TEXT_Y: number
  END_ALIGN: CanvasTextAlign
  END_SIZE: number
}

const VERTICAL: Layout = {
  BAND_TOP_Y: 262,
  BAND_BOTTOM_Y: 1572,
  COVER: [250, 352, 640],
  CAT_X: 168,
  CAT_Y: 672,
  COL_X: 120,
  COL_W: 840,
  TITLE_Y: 1040,
  TITLE_SIZES: [104, 92, 80, 70, 60, 52],
  SPEC_H: 104,
  WAVE_H: 64,
  GAP: 22,
  END_COVER: [330, 420, 420],
  END_TEXT_X: 540,
  END_TEXT_Y: 980,
  END_ALIGN: 'center',
  END_SIZE: 150,
}

const HORIZONTAL: Layout = {
  BAND_TOP_Y: 112,
  BAND_BOTTOM_Y: 972,
  COVER: [190, 222, 600],
  CAT_X: 112,
  CAT_Y: 522,
  COL_X: 880,
  COL_W: 880,
  TITLE_Y: 250,
  TITLE_SIZES: [100, 88, 76, 66, 56, 48],
  SPEC_H: 100,
  WAVE_H: 60,
  GAP: 22,
  END_COVER: [230, 290, 480],
  END_TEXT_X: 820,
  END_TEXT_Y: 400,
  END_ALIGN: 'left',
  END_SIZE: 150,
}

let L: Layout = VERTICAL

/** Fuente Archivo con ancho variable (palabras clave de font-stretch). */
type Stretch = 'condensed' | 'semi-condensed' | 'normal' | 'semi-expanded' | 'expanded'
const archivo = (stretch: Stretch, weight: number, size: number) =>
  `${stretch} ${weight} ${Math.round(size)}px 'Archivo Variable', 'Archivo', 'Arial Black', sans-serif`

const TITLE_TPL = "expanded 900 {s}px 'Archivo Variable', 'Archivo', 'Arial Black', sans-serif"

/** Ancho del título según la fase del golpe: ancho en el golpe, se estrecha después. */
function stretchFor(phase01: number, active: boolean): Stretch {
  if (!active) return 'semi-expanded'
  if (phase01 < 0.14) return 'expanded'
  if (phase01 < 0.3) return 'semi-expanded'
  if (phase01 < 0.55) return 'normal'
  return 'semi-condensed'
}

/** Franjas de peligro diagonales (naranja/tinta) en un rectángulo. */
function hazard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, offset: number) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.fillStyle = RED
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = INK
  const step = 36
  const start = x - h - (((offset % step) + step) % step) - step
  for (let sx = start; sx < x + w + h; sx += step) {
    ctx.beginPath()
    ctx.moveTo(sx, y + h)
    ctx.lineTo(sx + step / 2, y + h)
    ctx.lineTo(sx + step / 2 + h, y)
    ctx.lineTo(sx + h, y)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

/** Banda: franjas de peligro arriba y abajo + texto en bucle sobre naranja. */
function band(ctx: CanvasRenderingContext2D, y: number, rot: number, text: string, offset: number, slideIn: number) {
  if (slideIn <= 0) return
  ctx.save()
  ctx.translate(W / 2 + (1 - easeOut(slideIn)) * (rot < 0 ? -W : W) * 1.2, y)
  ctx.rotate(rot)
  const h = 72
  const sw = W * 1.6
  ctx.fillStyle = RED
  ctx.fillRect(-sw / 2, -h / 2, sw, h)
  hazard(ctx, -sw / 2, -h / 2 - 14, sw, 14, offset * 0.6)
  hazard(ctx, -sw / 2, h / 2, sw, 14, -offset * 0.6)
  ctx.font = archivo('expanded', 900, 30)
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillStyle = INK
  const unit = `${text}   ▲   `
  const uw = ctx.measureText(unit).width
  let x = -sw / 2 - (((offset % uw) + uw) % uw)
  while (x < sw / 2) {
    ctx.fillText(unit, x, 2)
    x += uw
  }
  ctx.restore()
}

/** Carátula en N tiras horizontales: entran alternando lados y se montan; glitch opcional. */
function drawCoverStrips(
  ctx: CanvasRenderingContext2D,
  art: HTMLImageElement | null,
  x: number,
  y: number,
  s: number,
  t: number,
  enterT: number,
  glitch: number,
  seed: number,
) {
  const n = 5
  const sh = s / n
  // sombra dura naranja + marco tinta (cuando ya han entrado casi todas)
  const all = prog(t, enterT + 0.35, enterT + 0.55)
  if (all > 0) {
    ctx.globalAlpha = all
    ctx.fillStyle = RED
    ctx.fillRect(x + 26, y + 26, s, s)
    ctx.globalAlpha = 1
  }
  for (let i = 0; i < n; i++) {
    const p = easeOut(prog(t, enterT + i * 0.07, enterT + i * 0.07 + 0.32))
    if (p <= 0) continue
    const dir = i % 2 ? 1 : -1
    let dx = (1 - p) * dir * (W * 0.9)
    if (glitch > 0) dx += (hash(seed, i) - 0.5) * 70 * glitch
    const sy = y + i * sh
    ctx.save()
    ctx.beginPath()
    ctx.rect(x + dx, sy, s, sh + 0.5)
    ctx.clip()
    if (art) {
      ctx.drawImage(art, x + dx, y, s, s)
    } else {
      ctx.fillStyle = INK
      ctx.fillRect(x + dx, y, s, s)
      ctx.fillStyle = RED
      ctx.font = archivo('expanded', 900, s * 0.3)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('DKR', x + dx + s / 2, y + s / 2, s - 60)
      ctx.textAlign = 'start'
    }
    ctx.restore()
  }
  if (all > 0) {
    ctx.globalAlpha = all
    ctx.strokeStyle = INK
    ctx.lineWidth = 10
    ctx.strokeRect(x - 5, y - 5, s + 10, s + 10)
    ctx.globalAlpha = 1
  }
}

/** Casilla de la ficha técnica. */
function specCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  hot: boolean,
  flash: number,
) {
  ctx.fillStyle = hot ? (flash > 0.5 ? INK : RED) : WHITE
  ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = INK
  ctx.lineWidth = 5
  ctx.strokeRect(x, y, w, h)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillStyle = hot ? (flash > 0.5 ? RED : INK) : GREY
  ctx.font = archivo('expanded', 800, 18)
  ctx.fillText(label, x + 16, y + 12)
  ctx.fillStyle = hot && flash > 0.5 ? RED : INK
  let size = h * 0.46
  ctx.font = archivo('semi-expanded', 900, size)
  while (ctx.measureText(value).width > w - 32 && size > 18) {
    size -= 2
    ctx.font = archivo('semi-expanded', 900, size)
  }
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(value, x + 16, y + h - 16)
}

/** Línea de osciloscopio que late con el golpe. */
function scope(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number, env: number, alpha: number) {
  if (alpha <= 0) return
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = INK
  ctx.fillRect(x, y, w, h)
  // rejilla
  ctx.strokeStyle = 'rgba(199,197,192,0.18)'
  ctx.lineWidth = 1
  for (let gx = x; gx <= x + w; gx += 40) {
    ctx.beginPath()
    ctx.moveTo(gx, y)
    ctx.lineTo(gx, y + h)
    ctx.stroke()
  }
  const mid = y + h / 2
  const amp = (h / 2 - 6) * (0.25 + 0.75 * env)
  ctx.strokeStyle = RED
  ctx.lineWidth = 4
  ctx.beginPath()
  for (let i = 0; i <= w; i += 4) {
    const k = i / w
    const v =
      Math.sin(k * 22 + t * 9) * 0.55 + Math.sin(k * 61 - t * 13) * 0.3 + Math.sin(k * 140 + t * 31) * 0.15
    const win = Math.sin(Math.PI * k)
    const py = mid + v * amp * win
    if (i === 0) ctx.moveTo(x + i, py)
    else ctx.lineTo(x + i, py)
  }
  ctx.stroke()
  ctx.restore()
}

/** Dibuja el fotograma del instante `t` (segundos). Determinista salvo el grano. */
export function drawReelFrame(
  ctx: CanvasRenderingContext2D,
  t: number,
  data: ReelData,
  assets: Assets,
  durationSec: number,
) {
  const bpm = data.bpm && data.bpm > 60 && data.bpm < 200 ? data.bpm : 132
  const beat = 60 / bpm
  const beatsIn = Math.max(0, t - DROP_T) / beat
  const phase01 = beatsIn % 1
  const beatPhase = phase01 * beat
  const endT = durationSec - 3.4
  const live = t >= DROP_T && t < endT
  const kick = live ? Math.exp(-beatPhase / 0.09) : 0
  const env = Math.exp(-beatPhase / (beat * 0.5))
  const horizontal = W > H
  const [cx, cy, cs] = L.COVER

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = 1
  ctx.textAlign = 'start'

  // ---------- 1. Cuenta atrás 3·2·1·DROP sobre negro ----------
  if (t < DROP_T) {
    ctx.fillStyle = INK
    ctx.fillRect(0, 0, W, H)
    const marks: [string, number][] = [
      ['3', 0.12],
      ['2', 0.5],
      ['1', 0.88],
      ['DROP', 1.22],
    ]
    let cur: [string, number] | null = null
    for (const m of marks) if (t >= m[1]) cur = m
    if (cur) {
      const lt = t - cur[1]
      const p = easeOut(clamp(lt / 0.14))
      const isDrop = cur[0] === 'DROP'
      const s = 1.5 - 0.5 * p
      ctx.save()
      ctx.translate(W / 2, H / 2)
      ctx.scale(s, s)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const size = isDrop ? (horizontal ? 330 : 250) : horizontal ? 620 : 760
      ctx.font = archivo(isDrop ? 'expanded' : 'condensed', 900, size)
      ctx.fillStyle = isDrop ? RED : CONCRETE
      ctx.fillText(cur[0], 0, size * 0.04, W - 80)
      ctx.restore()
      // contorno «eco» del número anterior
      ctx.save()
      ctx.globalAlpha = 0.18 * (1 - p)
      ctx.strokeStyle = CONCRETE
      ctx.lineWidth = 4
      ctx.translate(W / 2, H / 2)
      ctx.scale(s * 1.25, s * 1.25)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = archivo(isDrop ? 'expanded' : 'condensed', 900, size)
      ctx.strokeText(cur[0], 0, size * 0.04, W - 80)
      ctx.restore()
    }
    // pequeña firma
    ctx.font = archivo('expanded', 800, 26)
    ctx.textAlign = 'center'
    ctx.fillStyle = GREY
    ctx.fillText('DIRTY KITCHEN RAVE  ·  LONDON', W / 2, H - (horizontal ? 90 : 330))
    hazard(ctx, 0, horizontal ? 0 : 200, W, 18, t * 220)
    hazard(ctx, 0, horizontal ? H - 18 : H - 218, W, 18, -t * 220)
    grainOverlay(ctx, assets)
    return
  }

  // ---------- 2. Escena principal sobre hormigón ----------
  ctx.drawImage(assets.concrete, 0, 0)

  // flash blanco + sacudida al caer el drop
  const dropLt = t - DROP_T
  const shake = dropLt < 0.35 ? (1 - dropLt / 0.35) * 26 : 0
  ctx.save()
  const z = 1 + 0.012 * kick
  ctx.translate(W / 2 + (hash(Math.floor(t * 60), 1) - 0.5) * shake, H / 2 + (hash(Math.floor(t * 60), 2) - 0.5) * shake)
  ctx.scale(z, z)
  ctx.translate(-W / 2, -H / 2)

  // letras gigantes «DKR» de hormigón oscuro que se desplazan
  ctx.save()
  ctx.fillStyle = CONCRETE_DARK
  ctx.globalAlpha = 0.55
  ctx.font = archivo('expanded', 900, horizontal ? 520 : 460)
  ctx.textBaseline = 'alphabetic'
  const gw = ctx.measureText('DKR ').width
  const gy = horizontal ? H - 70 : H - 250
  for (let gx = -((t * 30) % gw) - gw; gx < W; gx += gw) ctx.fillText('DKR ', gx, gy)
  ctx.restore()

  // texto vertical de catálogo (contorno)
  ctx.save()
  ctx.translate(L.CAT_X, L.CAT_Y)
  ctx.rotate(-Math.PI / 2)
  ctx.font = archivo('expanded', 900, horizontal ? 84 : 92)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.strokeStyle = INK
  ctx.lineWidth = 3
  ctx.globalAlpha = 0.9 * prog(t, DROP_T + 0.2, DROP_T + 0.6)
  ctx.strokeText(data.kicker || 'DIRTY KITCHEN RAVE', (1 - easeOut(prog(t, DROP_T + 0.2, DROP_T + 0.8))) * 600, 0, cs + 120)
  ctx.restore()

  // carátula en tiras (+ glitch cada 8 golpes)
  const glitchOn = live && Math.floor(beatsIn) % 8 === 7 && phase01 > 0.5 && phase01 < 0.72 ? 1 : 0
  const coverPulse = 1 + 0.015 * kick
  ctx.save()
  ctx.translate(cx + cs / 2, cy + cs / 2)
  ctx.rotate(((-1.6 + 0.6 * Math.sin(t * 0.7)) * Math.PI) / 180)
  ctx.scale(coverPulse, coverPulse)
  ctx.translate(-(cx + cs / 2), -(cy + cs / 2))
  drawCoverStrips(ctx, assets.art, cx, cy, cs, t, DROP_T + 0.05, glitchOn, Math.floor(beatsIn))
  ctx.restore()

  // etiqueta «● REC»/catálogo pegada a la carátula
  {
    const p = prog(t, DROP_T + 0.6, DROP_T + 0.85)
    if (p > 0) {
      const label = (data.kicker || 'DKR').toUpperCase()
      ctx.save()
      ctx.font = archivo('expanded', 900, 26)
      const lw = ctx.measureText(label).width + 70
      const lx = cx + cs - lw + 30
      const ly = cy - 26 - (1 - easeOut(p)) * 80
      ctx.globalAlpha = p
      ctx.fillStyle = INK
      ctx.fillRect(lx, ly, lw, 52)
      ctx.fillStyle = RED
      ctx.beginPath()
      ctx.arc(lx + 24, ly + 26, 9, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = WHITE
      ctx.textBaseline = 'middle'
      ctx.fillText(label, lx + 44, ly + 28)
      ctx.restore()
    }
  }

  // ---------- columna de textos ----------
  const textFade = 1 - prog(t, endT - 0.05, endT + 0.15)
  let y = L.TITLE_Y
  const colX = L.COL_X
  const colW = L.COL_W
  ctx.save()
  ctx.globalAlpha = textFade

  // título: medido en «expanded» (el más ancho) y dibujado con el ancho del golpe
  const title = data.title.toUpperCase()
  const fit = fitLines(ctx, title, TITLE_TPL, colW, L.TITLE_SIZES, 2)
  const stretch = stretchFor(phase01, live)
  const lineH = fit.size * 0.98
  fit.lines.forEach((line, i) => {
    const t0 = DROP_T + 0.7 + i * beat
    const p = prog(t, t0, t0 + 0.16)
    if (p <= 0) return
    ctx.save()
    ctx.translate(colX, y + fit.size * 0.84 + i * lineH)
    const sx = 1 + 0.25 * (1 - easeOut(p))
    ctx.scale(sx, 1)
    ctx.globalAlpha = textFade * p
    ctx.font = archivo(stretch, 900, fit.size)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = RED
    ctx.fillText(line, 6, 6)
    ctx.fillStyle = INK
    ctx.fillText(line, 0, 0)
    ctx.restore()
  })
  y += fit.lines.length * lineH + L.GAP + 4

  // artistas sobre subrayado de marcador naranja
  if (data.artists) {
    const t0 = DROP_T + 0.7 + fit.lines.length * beat
    const p = prog(t, t0, t0 + 0.3)
    if (p > 0) {
      let size = horizontal ? 40 : 44
      ctx.font = archivo('semi-expanded', 800, size)
      while (ctx.measureText(data.artists).width > colW - 30 && size > 24) {
        size -= 2
        ctx.font = archivo('semi-expanded', 800, size)
      }
      const aw = Math.min(colW, ctx.measureText(data.artists).width + 30)
      ctx.fillStyle = RED
      ctx.fillRect(colX - 8, y + size * 0.22, (aw + 16) * easeOut(p), size * 0.92)
      ctx.fillStyle = INK
      ctx.textBaseline = 'alphabetic'
      ctx.textAlign = 'left'
      ctx.globalAlpha = textFade * p
      ctx.fillText(data.artists, colX + 6, y + size)
      ctx.globalAlpha = textFade
      y += size + L.GAP + 14
    }
  }

  // ficha técnica KEY · BPM · TIME
  {
    const t0 = DROP_T + 0.9 + (fit.lines.length + 1) * beat
    const parts = (data.meta || '').split('·').map((s) => s.trim()).filter(Boolean)
    const key = parts.find((p) => !/BPM$/.test(p) && !/^\d+:\d\d$/.test(p)) || '—'
    const time = parts.find((p) => /^\d+:\d\d$/.test(p)) || '—'
    const cells: [string, string, boolean][] = [
      ['KEY', key, false],
      ['BPM', data.bpm ? String(Math.round(bpm)) : '—', true],
      ['TIME', time, false],
    ]
    const gap = 14
    const cw = (colW - gap * 2) / 3
    cells.forEach(([label, value, hot], i) => {
      const p = easeOut(prog(t, t0 + i * 0.08, t0 + i * 0.08 + 0.25))
      if (p <= 0) return
      ctx.save()
      ctx.globalAlpha = textFade * p
      ctx.translate(0, (1 - p) * 40)
      specCell(ctx, colX + i * (cw + gap), y, cw, L.SPEC_H, label, value, hot, hot && live ? kick : 0)
      ctx.restore()
    })
    y += L.SPEC_H + L.GAP
  }

  // osciloscopio
  scope(ctx, colX, y, colW, L.WAVE_H, t, live ? env : 0.3, textFade * prog(t, DROP_T + 1.4, DROP_T + 1.8))
  ctx.restore()

  // bandas de peligro
  band(ctx, L.BAND_TOP_Y, -0.03, `DIRTY KITCHEN RAVE   ▲   ${data.kicker || 'LONDON'}   ▲   LONDON`, t * 150, prog(t, DROP_T, DROP_T + 0.35))
  band(ctx, L.BAND_BOTTOM_Y, 0.025, `FULL TRACK  →  DIRTYKITCHENRAVE.COM`, -t * 130, prog(t, DROP_T + 0.15, DROP_T + 0.5))

  ctx.restore() // fin cámara

  // flash del drop
  if (dropLt < 0.12) {
    ctx.globalAlpha = 0.85 * (1 - dropLt / 0.12)
    ctx.fillStyle = WHITE
    ctx.fillRect(0, 0, W, H)
    ctx.globalAlpha = 1
  }

  // ---------- 3. Cortina negra + «LISTEN NOW» ----------
  if (t >= endT) {
    const p = easeOut(prog(t, endT, endT + 0.32))
    const top = H * (1 - p)
    ctx.fillStyle = INK
    ctx.fillRect(0, top, W, H - top)
    hazard(ctx, 0, top - 20, W, 20, t * 260)
    if (p > 0.6) {
      const q = prog(t, endT + 0.25, endT + 0.5)
      const [ex, ey, es] = L.END_COVER
      ctx.save()
      ctx.globalAlpha = q
      ctx.fillStyle = RED
      ctx.fillRect(ex + 18, ey + 18, es, es)
      if (assets.art) ctx.drawImage(assets.art, ex, ey, es, es)
      else {
        ctx.fillStyle = '#1d1e21'
        ctx.fillRect(ex, ey, es, es)
      }
      ctx.strokeStyle = CONCRETE
      ctx.lineWidth = 6
      ctx.strokeRect(ex, ey, es, es)
      ctx.restore()
      const b = Math.max(0, t - (endT + 0.45)) / beat
      const st = stretchFor(b % 1, true)
      const q2 = prog(t, endT + 0.45, endT + 0.65)
      ctx.save()
      ctx.globalAlpha = q2
      ctx.textAlign = L.END_ALIGN
      ctx.textBaseline = 'alphabetic'
      const maxW = horizontal ? W - L.END_TEXT_X - 120 : W - 160
      let size = L.END_SIZE
      ctx.font = archivo('expanded', 900, size)
      while (ctx.measureText('LISTEN').width > maxW && size > 60) {
        size -= 4
        ctx.font = archivo('expanded', 900, size)
      }
      ctx.font = archivo(st, 900, size)
      ctx.fillStyle = RED
      ctx.fillText('LISTEN', L.END_TEXT_X, L.END_TEXT_Y + size)
      ctx.fillStyle = CONCRETE
      ctx.fillText('NOW', L.END_TEXT_X, L.END_TEXT_Y + size * 2)
      ctx.font = archivo('expanded', 800, 30)
      ctx.fillStyle = WHITE
      ctx.fillText('DIRTYKITCHENRAVE.COM', L.END_TEXT_X, L.END_TEXT_Y + size * 2 + 80)
      ctx.font = archivo('semi-expanded', 700, 26)
      ctx.fillStyle = GREY
      const credit = `${data.artists ? `${data.artists} — ` : ''}${data.title}`
      ctx.fillText(credit, L.END_TEXT_X, L.END_TEXT_Y + size * 2 + 130, maxW)
      ctx.restore()
    }
  }

  grainOverlay(ctx, assets)
}

function grainOverlay(ctx: CanvasRenderingContext2D, assets: Assets) {
  ctx.save()
  ctx.globalAlpha = 0.08
  ctx.globalCompositeOperation = 'overlay'
  const pat = ctx.createPattern(assets.grain, 'repeat')!
  ctx.translate(Math.floor(Math.random() * 256), Math.floor(Math.random() * 256))
  ctx.fillStyle = pat
  ctx.fillRect(-256, -256, W + 512, H + 512)
  ctx.restore()
}

/** Hormigón pre-horneado: base, manchas, poros y arañazos. Una vez por render. */
function makeConcrete(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  g.fillStyle = CONCRETE
  g.fillRect(0, 0, W, H)
  for (let i = 0; i < 26; i++) {
    const x = hash(i, 1) * W
    const y = hash(i, 2) * H
    const r = 120 + hash(i, 3) * 420
    const gr = g.createRadialGradient(x, y, 0, x, y, r)
    const dark = hash(i, 4) > 0.5
    gr.addColorStop(0, dark ? 'rgba(90,92,96,0.16)' : 'rgba(250,250,248,0.22)')
    gr.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = gr
    g.fillRect(x - r, y - r, r * 2, r * 2)
  }
  const d = g.getImageData(0, 0, W, H)
  for (let i = 0; i < d.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 22
    d.data[i] += n
    d.data[i + 1] += n
    d.data[i + 2] += n
  }
  g.putImageData(d, 0, 0)
  g.fillStyle = 'rgba(70,72,76,0.35)'
  for (let i = 0; i < 900; i++) {
    g.beginPath()
    g.arc(hash(i, 9) * W, hash(i, 10) * H, 0.8 + hash(i, 11) * 2.2, 0, Math.PI * 2)
    g.fill()
  }
  g.strokeStyle = 'rgba(70,72,76,0.18)'
  g.lineWidth = 1.2
  for (let i = 0; i < 14; i++) {
    let x = hash(i, 20) * W
    let y = hash(i, 21) * H
    g.beginPath()
    g.moveTo(x, y)
    for (let k = 0; k < 8; k++) {
      x += (hash(i, 30 + k) - 0.5) * 120
      y += (hash(i, 40 + k) - 0.3) * 90
      g.lineTo(x, y)
    }
    g.stroke()
  }
  return c
}

async function prepare(data: ReelData): Promise<Assets> {
  if (typeof document !== 'undefined' && document.fonts) {
    await Promise.all([
      document.fonts.load(archivo('expanded', 900, 60)),
      document.fonts.load(archivo('condensed', 900, 60)),
      document.fonts.load(archivo('normal', 800, 30)),
    ]).catch(() => undefined)
  }
  let art: HTMLImageElement | null = null
  if (data.artwork) art = await loadImage(data.artwork).catch(() => null)
  return { art, grain: makeGrain(), concrete: makeConcrete() }
}

const AVC_CODECS = ['avc1.640028', 'avc1.4d0028', 'avc1.42e028']

async function pickEncoderConfig(fps: number): Promise<VideoEncoderConfig | null> {
  if (typeof VideoEncoder === 'undefined') return null
  const candidates: VideoEncoderConfig[] = [
    ...AVC_CODECS.map((codec) => ({
      codec,
      width: W,
      height: H,
      bitrate: 8_000_000,
      framerate: fps,
      avc: { format: 'avc' as const },
    })),
    // Solo para entornos sin H.264 (p. ej. Chromium de pruebas): VP9 en MP4.
    { codec: 'vp09.00.40.08', width: W, height: H, bitrate: 8_000_000, framerate: fps },
  ]
  for (const cfg of candidates) {
    try {
      const r = await VideoEncoder.isConfigSupported(cfg)
      if (r.supported) return cfg
    } catch {
      /* siguiente */
    }
  }
  return null
}

/** Renderiza el reel completo y devuelve el vídeo. */
export async function renderReel(data: ReelData, opts: ReelOptions = {}): Promise<ReelResult> {
  const fps = opts.fps ?? 30
  const durationSec = opts.durationSec ?? 15
  const total = Math.round(durationSec * fps)
  const horizontal = opts.format === 'horizontal'
  W = horizontal ? 1920 : 1080
  H = horizontal ? 1080 : 1920
  L = horizontal ? HORIZONTAL : VERTICAL
  const assets = await prepare(data)

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d', { alpha: false })!

  const cfg = await pickEncoderConfig(fps)
  if (cfg) {
    const { Muxer, ArrayBufferTarget } = await import('mp4-muxer')
    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: cfg.codec.startsWith('avc') ? 'avc' : 'vp9', width: W, height: H, frameRate: fps },
      fastStart: 'in-memory',
    })
    let failure: unknown = null
    const encoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => {
        failure = e
      },
    })
    encoder.configure(cfg)
    for (let i = 0; i < total; i++) {
      if (failure) throw failure
      drawReelFrame(ctx, i / fps, data, assets, durationSec)
      const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) })
      encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 })
      frame.close()
      while (encoder.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 4))
      if (i % 10 === 0) {
        opts.onProgress?.(i / total)
        await new Promise((r) => setTimeout(r, 0)) // deja respirar a la UI
      }
    }
    await encoder.flush()
    encoder.close()
    if (failure) throw failure
    muxer.finalize()
    opts.onProgress?.(1)
    return { blob: new Blob([muxer.target.buffer], { type: 'video/mp4' }), mime: 'video/mp4', ext: 'mp4' }
  }

  // ----- Plan B: MediaRecorder (tiempo real) -----
  const mime = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(
    (m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m),
  )
  if (!mime) throw new Error('Este navegador no puede generar vídeo')
  const stream = canvas.captureStream(fps)
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 })
  const chunks: Blob[] = []
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  const done = new Promise<void>((r) => (rec.onstop = () => r()))
  rec.start(250)
  const t0 = performance.now()
  await new Promise<void>((resolve) => {
    const tick = () => {
      const t = (performance.now() - t0) / 1000
      if (t >= durationSec) return resolve()
      drawReelFrame(ctx, t, data, assets, durationSec)
      opts.onProgress?.(t / durationSec)
      requestAnimationFrame(tick)
    }
    tick()
  })
  rec.stop()
  await done
  const type = mime.split(';')[0]
  return { blob: new Blob(chunks, { type }), mime: type, ext: type === 'video/mp4' ? 'mp4' : 'webm' }
}
