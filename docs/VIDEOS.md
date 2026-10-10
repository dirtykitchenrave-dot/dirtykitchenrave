# Vídeos para redes («Crear vídeo»)

Cualquier visitante puede convertir un tema en un vídeo para Instagram, Facebook, TikTok o YouTube. Es la misma herramienta que los botones **R** y **F** de Optimal Breaks (allí solo para admins), con la marca DKR y abierta a todos.

> Octubre 2026. Portado de Optimal Breaks (`src/lib/reel-renderer.ts` → aquí `src/lib/video-renderer.ts`).

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

## Diseño

Marca DKR: tinta `#101113`, naranja hi-vis `#ff5b14`, hormigón `#c7c5c0`, blanco `#f4f1ea` y **Archivo variable** (titulares a 125 % de ancho). Texto siempre en inglés.

- Cabecera **DIRTY KITCHEN RAVE** y etiqueta naranja con el **número de catálogo · género** (ficha de lanzamiento) o el **título del lanzamiento** (lista del artista).
- Marquesina de hormigón arriba y naranja abajo (artista • título).
- La carátula cae como una funda con cinta adhesiva, sale el vinilo girando y entra el brazo del tocadiscos; «● NOW PLAYING».
- Título en tiras de papel, artistas, **tono · duración · BPM**, sello naranja girando con el BPM, aviso **FULL TRACK · DIRTYKITCHENRAVE.COM** y ecualizador.
- Final: sello **LISTEN NOW** + DIRTYKITCHENRAVE.COM.
- Vertical dentro de la zona segura de Instagram (escala 0,8, marco centrado); horizontal con funda a la izquierda y textos a la derecha.
- Sin carátula (o si Beatport falla) la funda muestra **DKR**.

## Piezas

| Pieza | Archivo | Qué hace |
|---|---|---|
| Botón + ventana | `src/components/VideoMaker.tsx` | 🎬 en cada fila de `TrackList`. Pide la carátula (1400 px y, si falla, 500 px) a `/api/image-proxy`, llama a `renderReel` (importado al pulsar: no pesa en la carga) y muestra vista previa y botones. Los botones de compartir son toques nuevos, así que `navigator.share({ files })` funciona después del render. |
| Render | `src/lib/video-renderer.ts` | Canvas 2D + **WebCodecs H.264** + **`mp4-muxer`** (15 s, 30 fps). Sin H.264 prueba VP9; sin WebCodecs, `MediaRecorder` en tiempo real (puede salir WebM). Layouts `VERTICAL` y `HORIZONTAL` con todas las posiciones; colores y textos de marca arriba del archivo. |
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
