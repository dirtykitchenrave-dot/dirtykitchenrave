# Bitácora — Dirty Kitchen Rave

30 sep 2026. Lo que se hizo en la web y por qué.

## Fuente

Sello en Beatport, id **112835**:

`https://www.beatport.com/label/dirty-kitchen-rave/112835/releases`

Esa pestaña de lanzamientos solo deja en el HTML los **preorders** (11). El resto lo pide el navegador a `api.beatport.com`. El catálogo se saca de `/tracks` (1.571 temas, 150 por página) y de la ficha `/release/<slug>/<id>` (ahí está el número de catálogo). Detalle de campos: `docs/IMPORTER.md`.

## Catálogo real

`data/catalog.seed.json`. El 1 oct 2026 ese archivo se volcó a Supabase; con las variables puestas, la web lee Postgres (ver más abajo).

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

Comprobado en la home y en Lanzamientos: el scroll se queda en 0 y EN/ES no se mueve. El bloque del logo sigue en la celda central de la rejilla; no va en posición absoluta, porque en anchos justos tapaba Discord. Qué lleva ese bloque (iniciales + gráfico) está más abajo.

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

## Biografías: no se escriben aquí

Las fichas de artista no llevan bio propia. Si el slug existe en Optimal Breaks, al lado de Beatport hay un enlace **Bio** a `https://www.optimalbreaks.com/{idioma}/artists/{slug}` (sin `nofollow`: el sello enlaza hacia la bio). Lista fija en `src/lib/site.ts` (`OPTIMAL_BREAKS_ARTISTS`), cruzada el 30 sep 2026: 66 de 175. El cruce de JSON se quedó en 63; Ondamike, Devis Hard y TT Beats tienen ficha viva en la base de Optimal Breaks (sin archivo en `data/artists/`) y también van en la lista. Quien no tiene página allí (por ejemplo -Urbano-) sigue con «Biografía próximamente» y sin ese enlace, para no mandar a un 404.

Si hay bio en Optimal, el texto bajo el nombre dice «La biografía está en Optimal Breaks» (`bioElsewhere`). Si no, «Biografía próximamente» (`noBio`). Commit `7a9417c`.

## Barra: iniciales DKR y el logo gráfico

Decisión del cliente, 30 sep noche. Probamos el nombre completo «Dirty Kitchen Rave» con la misma tipografía ancha de las iniciales, al lado del gráfico. No funciona: en la celda central choca con «Demos» y «El sello», y el nombre largo no gustó. Se queda **DKR** y el gráfico, los dos, en escritorio y en móvil.

- Tipografía: Archivo, peso 900, `font-stretch: 125%`, `letter-spacing: -0.02em`.
- Escritorio: `font-size: 3.5rem`. Las letras quedan más altas que el bloque de letras del gráfico (el gráfico mide `3.15rem` de alto; los chorreos de abajo no cuentan).
- Móvil (hasta 960 px): `2.1rem` y el gráfico a `2.35rem`. A 3.5rem el conjunto tapa EN/ES. El menú móvil arranca en `4.15rem` bajo la barra.
- Imagen: `public/images/logo copia.png` (720×476, PNG con transparencia). En el `src` va codificada: `/images/logo%20copia.png`. Las letras blancas van dentro de una forma negra: `mix-blend-mode: multiply` las borraría. No usarlo.
- Favicon (2 oct): el de antes era un SVG con «DKR» y un disco (`icon.svg`). Ahora es el mismo logo, centrado en un PNG cuadrado de 512 px con fondo transparente: `src/app/icon.png`. Next lo sirve en `/icon.png`. El JSON-LD de la home apunta ahí.
- Commits: `e500d96` (DKR junto al gráfico), `7a9417c` (el tamaño).

## Enlaces internos

Nombre de artista, título de lanzamiento o álbum, y género que llevan a una página nuestra son enlace interno. Beatport, Spotify, Bandcamp y el resto siguen fuera.

Rutas: `/{lang}/artists/{slug}`, `/{lang}/releases/{slug}`, `/{lang}/genres/{slug}`. En español los nombres van con « y »; en inglés con « & ».

La tarjeta de lanzamiento tiene una capa `.drop-link` encima (`z-index: 1`) para que el resto de la tarjeta abra el drop. Artista, título y género van con `position: relative; z-index: 2` para poder pulsarlos. En la ficha, el título del tema enlaza al lanzamiento (`#t-id`); en la página del propio lanzamiento el título no se enlaza a sí mismo. «Various Artists» en recopilatorios se queda en texto plano (no hay slug). En el crédito de remezcla («Gruv42 Remix», «Gruv42 & Madam Bliss Remix») cada nombre con ficha es enlace (`splitLinkedNames` en `src/lib/format.ts`).

## Rejilla de artistas

Las fotos de `/artists` son cuadradas e iguales. `repeat(4, 1fr)` dejaba columnas distintas: un nombre largo (Habitfromthelot) y el `border-right` solo en tres de las cuatro ensanchaban unas fotos. Ahora es `minmax(0, 1fr)`, la tarjeta tiene `min-width: 0`, la foto es `aspect-ratio: 1`, y el separador es `box-shadow: inset -2px` (la última columna no lo lleva). En móvil, dos columnas. Las fotos de Beatport suelen ser apaisadas y se recortan con `object-fit: cover`.

## El «0350» de la home

No es el tema número 350. `catalogNumber()` quita el prefijo `DKR`: **DKR0350** se ve como **0350**. El 30 sep era el último ya publicado (Switch / Buck Rogers, Phrenetic). El anterior es DKR0349. Los de octubre, con fecha futura, van a «Próximamente». Un código `DKRLP…` se muestra como `LP055`.

El 1 oct por la noche el hero ya muestra **0351**: Roller Coaster Hands In The Air, Afghan Headspin, salida 01 oct 2026.

## TIDAL

El botón de TIDAL solo sale si hay URL verificada (`tidalUrl`). No hay búsqueda de reserva. Commit `bae45fd`.

## Consola en `/artists` (no es un fallo de la web)

En el navegador de Cursor, React avisa de hidratación en el nombre del artista (`data-cursor-ref` en el HTML del servidor, que el cliente no pinta). Lo inyecta el navegador del editor. En Chrome o Safari normal no pasa. No poner `suppressHydrationWarning`.

## Git

El 30 sep noche el código estaba en **Eskaladigital** / `dirtykitchenravetest` (público), HEAD `7a9417c`.

El 1 oct 2026 el remoto `origin` pasó a la cuenta del cliente: [github.com/dirtykitchenrave-dot/dirtykitchenrave](https://github.com/dirtykitchenrave-dot/dirtykitchenrave), rama `main`, el mismo `7a9417c`. El repo del cliente estaba vacío; se subió el historial, sin force. El repo de Eskaladigital sigue en GitHub, pero este clon ya no apunta ahí.

El 1 oct por la noche el repo del cliente quedó conectado a un proyecto de Vercel (Create Deployment sobre `main`). El de pruebas [dirtykitchenravetest.vercel.app](https://dirtykitchenravetest.vercel.app) sigue en el equipo **ESKALADIGITAL**, ligado al repo antiguo. El dominio `dirtykitchenrave.com` sigue en Linktree.

`.env.local` no se sube. Conectar GitHub a Vercel no copia Supabase. En Vercel hay que pegar a mano `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`. Si no están, el deploy lee `data/catalog.seed.json` (el mismo catálogo). Si están y el build pilló las tablas vacías, hace falta otro deploy ahora que ya hay 175 / 413 / 1.571.

## Supabase (1 oct 2026)

Proyecto `qsfynssmtuwufwqtbmra`. `001_init.sql` está aplicada. La clave anónima lee las cinco tablas y no puede insertar.

`002_tidal_links.sql` no está: faltan `releases.tidal_url` y `tracks.tidal_url`. El JSON no trae URLs de TIDAL ni de Spotify, así que la web no las usa todavía.

Carga desde `data/catalog.seed.json`: 175 artistas, 413 lanzamientos, 1.571 temas, 626 créditos de lanzamiento y 2.019 de tema. Afghan Headspin (30700) sigue en el roster y con la bio. Con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `getCatalog()` (`src/lib/catalog.ts`) deja el JSON y lee Postgres (`src/lib/supabase.ts`).

## Un cambio en Supabase no sale al momento (1 oct 2026, noche)

La base está conectada. La web publicada no la lee en cada visita.

Las páginas del catálogo (home, releases, artists, géneros, ficha, sitemap, feed) llevan `export const revalidate = 3600`. Next las genera en el build y las guarda **una hora**. Un insert o un update en Supabase no aparece en dirtykitchenrave.com en el acto.

Sale solo cuando pasa una de estas tres cosas:

1. **Pasa hasta una hora** y entra alguien: Next regenera esa página con lo que haya entonces en Postgres.
2. **El cron de Beatport** termina bien. `vercel.json` llama a `/api/cron/beatport-sync` a las **06:00 UTC** cada día. Si escribe releases nuevos, al final hace `revalidatePath('/', 'layout')` y vacía la caché sin deploy (`src/app/api/cron/beatport-sync/route.ts`). Hace falta `CRON_SECRET` y que Vercel lo mande como `Authorization: Bearer …`.
3. **Un deploy nuevo.** El build vuelve a leer Supabase y publica ese catálogo.

Hace falta deploy, y no basta con esperar la hora, en dos casos:

- En Vercel **no** están `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Entonces `getCatalog()` no toca Postgres y la web sirve `data/catalog.seed.json`, el que se horneó en el build. Un cambio en la base no se entera nunca.
- El deploy se hizo con las tablas vacías. Ese HTML vacío se queda hasta el siguiente deploy (o hasta que el cron o la hora regeneren, si las claves sí estaban).

En local (`next dev`) cada recarga lee Supabase al momento. El `revalidate` no congela el dev.

Optimal Breaks no es el mismo circuito. Allí el listado público también va cacheado, pero **5 minutos** (`createCachedSupabase(300)` con la etiqueta `public-catalog`). Al guardar un artista desde el admin se llama `revalidatePublicCatalog()` / `revalidateArtistSlug()` y la web pública se entera en ese instante, sin deploy. Dirty Kitchen no tiene admin ni ese «guardar y refrescar». El único vaciado a propósito es el cron de Beatport.

## Vistas del catálogo (1 oct 2026, noche)

Pedido: el mismo control que Optimal Breaks en `/en/artists`. En Dirty Kitchen va en **`/{lang}/releases` y `/{lang}/artists`**. La home y las páginas de género no lo tienen: siguen con la rejilla de cuatro columnas de `.drops`.

Abre en **compacto**. Al lado del buscador hay tres botones (icono + texto; en móvil, solo icono):

| | Inglés | Español | Lanzamientos (ancho) | Artistas (ancho) |
|---|---|---|---|---|
| Compacto (defecto) | Compact | Compacto | 5 columnas | 6 columnas |
| Grande | Large | Grande | 2 columnas | 3 columnas |
| Lista | List | Lista | una fila: carátula, título, catálogo, género, fecha | una fila: foto, nombre, nº de releases |

En la lista de lanzamientos el sello «Pre-order» / «Preventa» no va encima de la carátula pequeña: va en la fila de datos (`.pre`). El ▶ de la preview sigue sonando en las tres vistas.

La elección se guarda en `localStorage` (`dkr-catalog-view`) y vale para las dos páginas. Archivos: `src/components/ViewToggle.tsx`, `ReleasesExplorer.tsx`, `ArtistsExplorer.tsx`, `ReleaseCard.tsx`, `src/app/globals.css`, textos en `src/i18n/dictionaries.ts` (`views`).

Commit `8236ece`. La sección «Rejilla de artistas» de arriba describe el arreglo del 30 sep (fotos cuadradas). En `/artists` esa rejilla de 4 ya no es la que se ve: la página siempre añade `view-compact`, `view-large` o `view-list`.

## Analítica (1 oct 2026)

GA4 `G-5J2B7LM2K9` en `NEXT_PUBLIC_GA_MEASUREMENT_ID`. Molde Optimal: Consent Mode v2 en el primer HTML (default `denied`, lee `dkr_cookie_preferences`) y `<GoogleAnalytics>` de `@next/third-parties`. En local (`next dev`) el tag no se carga. En Vercel hay que pegar la variable a mano; si no está, el deploy sale sin medir. Al aceptar, el banner manda `page_view` (el del primer paint salió denegado).

## Search Console (1 oct 2026)

Verificación HTML en `public/googlecd8334c6f7400874.html`, servida en la raíz del dominio. Search Console la pide en `https://…/googlecd8334c6f7400874.html`.

## Home, noche del 1 oct 2026

Tres cambios de la home. El primero salió en `a66d1c2`. El play de la carátula y el drop repetido al principio de Drops salen en el commit siguiente, junto con el favicon del logo.

### Nombre del sello en el hero

El titular era una sola línea ancha: «Dirty Kitchen Rave. Multi-genre bass, London.» Pedido: el nombre del sello un poco más grande, en su propia línea, como H1, con la Archivo condensada del wordmark del pie, y un tamaño que se vea en móvil y en escritorio.

Quedó así:

- H1: «Dirty Kitchen Rave». Archivo, peso 900, `font-stretch: 62%`, mayúsculas. El tamaño es `clamp(2.15rem, 10.6cqi, 5.6rem)`: llena la columna del hero (en 1440 px sale a una línea, unos 71 px; en un móvil de 390 px también, unos 37 px).
- Debajo, el lema en la tipo ancha de antes (`font-stretch: 125%`): «Multi-genre bass, London.» / «Bass multigénero, Londres.»
- Textos en `src/i18n/dictionaries.ts` (`home.h1` y `home.tagline`). Maquetación en `src/components/HeroDrop.tsx` y `src/app/globals.css` (`.hero-copy`, `.hero h1`, `.hero-tag`).

Gustó. Commit `a66d1c2` en [github.com/dirtykitchenrave-dot/dirtykitchenrave](https://github.com/dirtykitchenrave-dot/dirtykitchenrave), rama `main`. Si el push pide cuenta, es **dirtykitchenrave-dot**, no Eskaladigital. Las dos fotos sueltas de la raíz (`Foto 30-9-26, …png`) no entraron en el commit.

### El play de la carátula

La mitad naranja del hero ya era un enlace al último drop, pero no se veía: ni botón ni play. Se probó una pastilla naranja con el título encima de la foto; el título es largo, se salía de la carátula y pisaba el vinilo. Se dejó un círculo naranja con ▶ (`.hero-open`), a la izquierda del centro de la funda para no caer sobre el disco.

El círculo no reproduce el audio. Es parte del mismo enlace: pulsarlo, o pulsar la imagen, abre la ficha. Comprobado en escritorio y en móvil; el clic fue a `/en/releases/dkr0351-roller-coaster-hands-in-the-air`. El play que sí suena sigue siendo el de las tarjetas de Drops.

### El mismo drop, el primero de Drops

La rejilla de Drops quitaba el del hero (`r.id !== latest.id`) para no repetirlo. Pedido: que salga también abajo, el primero. Ahora va el primero y la lista sigue en ocho. «Próximamente» no cambia. El 1 oct por la noche el primero es Roller Coaster Hands In The Air.

Esos dos cambios van en el mismo commit que el favicon: `src/components/HeroDrop.tsx`, `src/app/globals.css`, `src/app/[lang]/page.tsx`. Las dos fotos sueltas de la raíz siguen fuera del repo.

### Cómo se miró en local

El puerto 3000 lo tenía otra web (Serveco). Esta arrancó en `http://localhost:3001`. El `fetch` a Supabase cae por el proxy de Acttax; ese `next dev` llevó `NODE_TLS_REJECT_UNAUTHORIZED=0`. El primer intento chocó con un `EPERM` al renombrar archivos de `.next` (Dropbox). El segundo servidor sí sirvió la home.

## Foto de Lucas (2 oct 2026)

La ficha de Beatport (id 4092) es un homónimo: la foto que salía no es la de este Lucas. Se usa el mismo retrato que [optimalbreaks.com/es/artists/lucas](https://www.optimalbreaks.com/es/artists/lucas): `public/images/artists/lucas.webp`. En el JSON y en Supabase (`artists.image_url` del id 4092) la URL es `/images/artists/lucas.webp`.

El cron de Beatport, al reimportar, volvía a escribir `image_url` con la de Beatport. Ahora, si la foto guardada no es de `beatport.com`, se queda (`src/lib/beatport/sinks.ts`).
