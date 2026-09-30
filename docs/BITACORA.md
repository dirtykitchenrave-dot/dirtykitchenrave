# Bitácora — Dirty Kitchen Rave

30 sep 2026. Lo que se hizo en la web y por qué.

## Fuente

Sello en Beatport, id **112835**:

`https://www.beatport.com/label/dirty-kitchen-rave/112835/releases`

Esa pestaña de lanzamientos solo deja en el HTML los **preorders** (11). El resto lo pide el navegador a `api.beatport.com`. El catálogo se saca de `/tracks` (1.571 temas, 150 por página) y de la ficha `/release/<slug>/<id>` (ahí está el número de catálogo). Detalle de campos: `docs/IMPORTER.md`.

## Catálogo real

`data/catalog.seed.json`. No hay `.env.local`, así que la web lee ese archivo.

| | |
|---|---|
| Lanzamientos | 413, todos con número de catálogo |
| Temas | 1.571, todos con previa |
| Artistas | 175 |
| Formatos | 258 singles, 92 EPs, 16 álbumes, 47 recopilatorios |

Se conservó lo editorial que ya estaba: Afghan Headspin (id 30700) sigue en el roster y con su bio en español e inglés.

Los cinco más nuevos:

| Catálogo | Fecha | Título |
|---|---|---|
| DKR0360 | 23 oct 2026 | Slam |
| DKR0363 | 22 oct 2026 | Rah Rah Stomp / Warehouse Rave |
| DKRLP055 | 21 oct 2026 | Electro Express V2 |
| DKR0358 | 16 oct 2026 | That Is The Boogeyman EP |
| DKR0357 | 15 oct 2026 | Outside |

En la home, el hero es el último **ya publicado**. El 30 sep era **DKR0350 Switch / Buck Rogers**. Los de octubre (11) salen en «Próximamente». Comprobado en `http://localhost:3000/es` y en `/es/releases` (ahí están Slam y Rah Rah).

`npm run import:beatport` no termina desde este PC:

1. El proxy de Acttax tumba el TLS (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`). El reintento de esa misma llamada lleva `NODE_TLS_REJECT_UNAUTHORIZED=0`.
2. Cloudflare responde **403** («Just a moment…») al `fetch` de Node. El HTML con `__NEXT_DATA__` no llega.
3. La API `api.beatport.com/v4` pide credenciales (401). No sirve.

La carga se hizo con el navegador, que sí pasa Cloudflare: 11 páginas de temas y 413 fichas de lanzamiento, y luego `CatalogBuilder` (el mismo que usa el importador), guardando bios y roster.

## Cambio de idioma

Al pulsar EN/ES la página se iba sola unos **700 px** (la altura del hero). El navegador recolocaba el scroll para no perder lo que había debajo, y `scroll-behavior: smooth` en `html` lo animaba. La marquesina de géneros lee esa velocidad: el texto se estiraba y salía disparado. A la vez, «Listen» / «Escuchar» cambiaba de ancho y el botón EN/ES se desplazaba unos 20 px.

Arreglo, en `src/app/globals.css` y `src/components/Marquee.tsx`:

- `html` con `scroll-behavior: auto`. Un scroll suave en `html` anima cada cambio de ruta.
- `body` con `overflow-anchor: none`. Así el cambio de idioma no empuja el scroll.
- El botón Listen/Escuchar tiene `min-width: 6.4rem`, el mismo hueco en los dos idiomas.
- La marquesina ignora saltos de más de 120 px por frame y guarda la posición al remontar (`useLayoutEffect`), para no volver a cero ni dispararse.

Comprobado en la home y en Lanzamientos: el scroll se queda en 0 y EN/ES no se mueve. El logo sigue en el centro de la rejilla; no va en posición absoluta, porque en anchos justos tapaba Discord.

## Reproductor

Al dar a play la barra no se movía: `/api/audio-proxy` devolvía **504** en ~50 ms. El `fetch` de Node a `geo-samples.beatport.com` cae con `UNABLE_TO_VERIFY_LEAF_SIGNATURE` (proxy de Acttax). Esa llamada reintenta por `https` sin verificar el certificado; el resto del proceso sigue verificando TLS. En Vercel el primer `fetch` vale y no entra el reintento.

Comprobado en `http://localhost:3000/es`: preview de Roller Coaster, la barra pasó de 0 a ~5 % en 2,5 s y siguió. El proxy responde 200, `audio/mpeg`, `Content-Length` del mp3.

30 sep, tarde. Al cambiar de idioma Next trata `/es/…` y `/en/…` como otra ruta y sube al inicio. El enlace EN/ES lleva `scroll={false}` y, al soltar el clic, se guarda `scrollY` para devolverlo en el mismo sitio (`src/components/Nav.tsx`). Un salto de página (Lanzamientos, Artistas…) sigue yendo arriba.

## TLS del proxy de audio: solo en local

El reintento sin verificar certificado de `/api/audio-proxy` (`src/lib/audio-upstream.ts`) queda limitado a desarrollo:

- `next dev`: activo, para trabajar detrás del proxy de Acttax.
- `next start` en este PC: solo con `ALLOW_INSECURE_UPSTREAM_TLS=1` en `.env.local`.
- Vercel (`process.env.VERCEL`): nunca. Un error de certificado en producción falla con 502 en vez de saltarse la verificación.

Cuando se usa, el servidor lo avisa una vez en consola.

## Pendiente: ¿pasa el servidor el Cloudflare de Beatport?

Desde este PC, el `fetch` de Node recibe 403 de Cloudflare. Si en Vercel pasa lo mismo, el cron diario (`/api/cron/beatport-sync`) no traerá lanzamientos nuevos.

Para saberlo, tras el primer despliegue:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/cron/beatport-probe
```

- `"verdict": "ok"`: el cron diario funciona. No hay que hacer nada más.
- `"verdict": "cloudflare"`: Vercel también está bloqueado. Opciones, por orden de preferencia:
  1. Pedir a Beatport acceso a su API oficial (v4) como sello. Es lo más estable.
  2. Un GitHub Action programado con navegador real (Playwright) que genere el catálogo y lo suba al repo o a Supabase. Cloudflare puede volver a bloquearlo.
  3. Carga manual periódica desde el navegador, como la del 30 sep, con el mismo `CatalogBuilder`.

Referencia: Optimal Breaks hace scraping de Beatport desde el servidor. Si allí funciona en Vercel, lo esperable es `ok`.
