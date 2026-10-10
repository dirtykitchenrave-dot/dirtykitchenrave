# Vídeos para redes («Crear vídeo»)

Cualquier visitante puede convertir un tema en un vídeo para Instagram, Facebook, TikTok o YouTube. Usa el mismo motor que los botones **R** y **F** de Optimal Breaks (allí solo para admins), pero con un **diseño propio de DKR** («DROP») y abierto a todos.

> Octubre 2026. Motor portado de Optimal Breaks (`src/lib/reel-renderer.ts` → aquí `src/lib/video-renderer.ts`); el dibujo es otro.

## Cómo se usa

1. En cualquier tracklist (ficha de lanzamiento o lista **Listen** de un artista), en la fila del tema, pulsar **🎬** («Create video» / «Crear vídeo»).
2. Se abre una ventana con dos opciones:
   - **Vertical** — 9:16, 1080×1920: Reels, Stories, TikTok.
   - **Horizontal** — 16:9, 1920×1080: Facebook, YouTube.
3. Barra de progreso «Creating your video… N %» (unos segundos en un móvil u ordenador normal).
4. Sale la **vista previa** del vídeo (en bucle, sin sonido) y cuatro botones:
   - **Share to Instagram** / **Share to Facebook**: en el móvil abren el menú de compartir del sistema con el MP4 (ahí se elige la app). En el ordenador no hay menú de compartir con archivos: se descarga el vídeo y se abre instagram.com o facebook.com para subirlo.
   - **Download**: guarda el MP4.
   - **Make another**: vuelve a elegir formato.
5. Al crear el vídeo se copia el **enlace del tema** (`…/releases/<slug>?play=beatport:<id>`) para pegarlo en el post o en el sticker de enlace de una historia.

El vídeo **no lleva sonido**: quien lo publica añade la música oficial del tema desde Instagram o Facebook (así el post enlaza al tema y al artista y no hay problemas de derechos). La animación late al **BPM** del tema.

## Diseño «DROP» (propio de DKR)

Mismo motor que Optimal Breaks, pero **diseño distinto** (decisión del sello, 10 oct 2026: sin vinilo, brazo de tocadiscos ni cintas adhesivas, para que no se parezca). Sale de la propuesta 05 «Drop» de la web: hormigón `#c7c5c0`, tinta `#101113`, naranja hi-vis `#ff5b14`, blanco `#fafaf8` y **Archivo variable** con su eje de anchura. Texto siempre en inglés.

| Tiempo | Qué pasa |
|---|---|
| 0–1,6 s | Cuenta atrás **3 · 2 · 1** (Archivo estrecha, hormigón sobre negro) y **DROP** ancho en naranja, con franjas de peligro arriba y abajo. |
| 1,6 s | **El drop**: flash blanco, sacudida de cámara y corte al fondo de **hormigón** (textura con manchas, poros y grietas, pre-horneada). Aquí empieza la rejilla de golpes al BPM. |
| 1,6–3 s | Entran las dos **bandas de peligro** (arriba: DIRTY KITCHEN RAVE ▲ catálogo ▲ LONDON; abajo: FULL TRACK → DIRTYKITCHENRAVE.COM). La **carátula llega en 5 tiras** que entran alternando lados y se montan; sombra dura naranja y marco tinta. Etiqueta «● catálogo» y catálogo en vertical (contorno) al lado. |
| desde ~2,3 s | **Título gigante** que respira con el golpe: en cada beat pasa a `expanded` (125 %) y se va estrechando hasta `semi-condensed` (eje de anchura de Archivo). **Artistas** sobre subrayado de marcador naranja. **Ficha técnica** en casillas KEY · BPM · TIME (la del BPM, naranja, parpadea en cada golpe). **Osciloscopio** naranja sobre negro que late. |
| todo el rato | Golpe de cámara en cada beat, «DKR» gigante de hormigón oscuro desplazándose al fondo, glitch de tiras de la carátula cada 8 golpes, grano. |
| últimos 3,4 s | **Cortina negra** que sube con franja de peligro → carátula + **LISTEN / NOW** enorme (también late con el ancho) + DIRTYKITCHENRAVE.COM + crédito. |

- Vertical (1080×1920): todo dentro de la zona que Instagram no tapa (x ≈ 120–960, y ≈ 230–1610).
- Horizontal (1920×1080): carátula a la izquierda, título + ficha + osciloscopio a la derecha.
- Sin carátula (o si Beatport falla): la funda muestra **DKR** en naranja.
- Nota técnica: el ancho variable se pide con las palabras clave de `font-stretch` en `ctx.font` (`condensed` … `expanded`). Si un navegador no las aplica en canvas, el título sale a ancho normal (sin romperse).

## Piezas

| Pieza | Archivo | Qué hace |
|---|---|---|
| Botón + ventana | `src/components/VideoMaker.tsx` | 🎬 en cada fila de `TrackList`. Pide la carátula (1400 px y, si falla, 500 px) a `/api/image-proxy`, llama a `renderReel` (importado al pulsar: no pesa en la carga) y muestra vista previa y botones. Los botones de compartir son toques nuevos, así que `navigator.share({ files })` funciona después del render. |
| Render | `src/lib/video-renderer.ts` | Canvas 2D + **WebCodecs H.264** + **`mp4-muxer`** (15 s, 30 fps). Sin H.264 prueba VP9; sin WebCodecs, `MediaRecorder` en tiempo real (puede salir WebM). Diseño «DROP» en `drawReelFrame`; posiciones en los layouts `VERTICAL` y `HORIZONTAL`; momento del drop en `DROP_T`; colores arriba del archivo. |
| Proxy de carátulas | `src/app/api/image-proxy/route.ts` | Sirve la carátula de `geo-media.beatport.com` desde nuestro dominio. Una imagen de otro dominio sin CORS «mancha» el canvas y el navegador no deja codificar el vídeo. Solo hosts de Beatport, máx. 6 MB, caché 1 día. |
| Textos | `src/i18n/dictionaries.ts` → `release.video` | EN/ES de la ventana (los textos del vídeo van siempre en inglés). Llegan a `TrackList` por `trackListLabels` (`src/lib/view.ts`). |
| Estilos | `src/app/globals.css` → `.vm-*` | Ventana con borde de tinta y sombra naranja, mismos `.btn` del sitio. |
| Kicker | `src/app/[lang]/releases/[slug]/page.tsx` | `videoKicker` = catálogo · género (o el título). |
| Dependencia | `package.json` | `mp4-muxer` 5.2.1 (exacta). Su autor recomienda migrar a Mediabunny algún día. |

Sin servidor de vídeo y sin coste por vídeo: lo dibuja el dispositivo de quien pulsa. No se usa Runway ni IA.

## Comprobado (10 oct 2026)

- `npx tsc --noEmit` y `next build` sin errores.
- Con `next start` y un Pixel 7 emulado (Playwright): 🎬 → Vertical → progreso → vista previa → «Share to Instagram» entrega `dkr-AndrewFx-Slam-9x16.mp4` (1080×1920, 15 s) al menú de compartir y el enlace `?play=beatport:<id>` queda copiado; «Make another» → Horizontal (1920×1080) igual. En ese entorno no había salida a Beatport, así que la carátula salió como «DKR»; en producción el proxy sí la descarga.

## Pendiente de probar en un móvil real

- [ ] iPhone (Safari) y Android (Chrome): menú de compartir con Instagram (Reel e Historia), Facebook y «Guardar vídeo».
- [ ] Carátula real a 1400 px a través de `/api/image-proxy`.
- [ ] Ordenador: «Download» y «Share to …» (descarga + abre la web de la red).
