# Beatport importer

**Status: implemented** in `src/lib/beatport/` + `scripts/import-beatport.ts` + `src/app/api/cron/beatport-sync`.
Full catalogue loaded 30 Sept 2026: **413 releases, 1,571 tracks**, all with catalogue number and preview.

From this PC, `npm run import:beatport` does not get the HTML. First the Acttax proxy fails TLS
(`UNABLE_TO_VERIFY_LEAF_SIGNATURE`; retry that one call with `NODE_TLS_REJECT_UNAUTHORIZED=0`).
Then Cloudflare answers **403 Just a moment…** to Node's `fetch`, so `__NEXT_DATA__` never arrives.
A real browser on the same machine gets 200. The 30 Sept load was taken from those pages
(11 track pages + one request per release) and built with `CatalogBuilder`.

Goal: fill the catalogue with the **whole** Dirty Kitchen Rave
catalogue from Beatport, and keep it up to date as new releases come out. The website already reads
from Supabase as soon as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
(or from `data/catalog.seed.json` when they are not).

Reference implementation to reuse: Optimal Breaks
`E:\Acttax Dropbox\Narciso Pardo\Eskala IA\W - OPTIMAL BREAKS\weboptimalbreaks\src\lib\beatport-next-data-tracks.ts`
(`extractNextData`, `pickFromTrackBlob`, `normalizeBeatportTrackBlob`) and
`scripts/lib/remixer-credits.mjs` (remixer credits from `remixers[]` + `mix_name`).

## Load of 30 Sept 2026

Done. File: `data/catalog.seed.json` (~1.2 MB). No Supabase on this machine, so the site reads that file.

| | |
|---|---|
| Releases | 413, every one with `catalog_number` |
| Tracks | 1,571, every one with `sample_url` |
| Artists | 175 |
| Formats | 258 singles, 92 EPs, 16 albums, 47 compilations |
| Pre-orders | 11, all already present in the track listing |
| Editorial kept | Afghan Headspin (id 30700): `roster: true` and the ES/EN bio |

Newest rows (Beatport order, newest first):

| Catalogue | Date | Title |
|---|---|---|
| DKR0360 | 2026-10-23 | Slam |
| DKR0363 | 2026-10-22 | Rah Rah Stomp / Warehouse Rave |
| DKRLP055 | 2026-10-21 | Electro Express V2 |
| DKR0358 | 2026-10-16 | That Is The Boogeyman EP |
| DKR0357 | 2026-10-15 | Outside |

The home hero is the latest release **already out**, not the newest pre-order. On 30 Sept that was **DKR0350 Switch / Buck Rogers**. October dates show under Coming soon.

The nested `release` on a track does **not** include `catalog_number` (only `id, name, slug, image, label`). The number, the UPC and the release artists come from `/release/<slug>/<id>`.

`npm run import:beatport` from Node, on this PC:

1. `fetch failed` / `UNABLE_TO_VERIFY_LEAF_SIGNATURE` (Acttax proxy). Same command again with `NODE_TLS_REJECT_UNAUTHORIZED=0` for that process only.
2. Then Cloudflare **403** `Just a moment…`. Node never sees `__NEXT_DATA__`.
3. `api.beatport.com/v4/catalog/tracks/?label_id=112835` answers **401** (no credentials). Do not use it.

What worked: a normal browser, already past Cloudflare, `fetch` of the same paths with `credentials: 'include'`. Eleven track pages (`per_page=150`) plus 413 release pages, six at a time, zero errors. Those blobs went through `CatalogBuilder` and `mergeEditorial`.

## What we found on Beatport (30 Sept 2026)

Label: `https://www.beatport.com/label/dirty-kitchen-rave/112835` (label id **112835**).

| Page (server-rendered `__NEXT_DATA__`) | What it contains |
|---|---|
| `/label/dirty-kitchen-rave/112835` | query `releases-label_id 112835 per_page 21 …` → **count 413 releases** (21 per page), plus label top 10 and top 20 |
| `/label/dirty-kitchen-rave/112835/tracks?page=N&per_page=150` | query `tracks` → **count 1,571 tracks**, 150 per page, **full track objects** |
| `/label/dirty-kitchen-rave/112835/releases?per_page=150` | ⚠️ only the **pre-orders** are server-rendered (`preorder=true`, 11 results). The rest of the list is fetched client-side from `api.beatport.com/v4` with a session token. **Do not rely on this page.** |
| `/release/<slug>/<id>` | release detail + its tracks |

Latest catalogue numbers seen: `DKR0363`, `DKR0360` (Slam, AndrewFx, 23 Oct 2026), `DKRLP055` (albums use `DKRLP`).

### Release object (from the listing)
`id, name, slug, catalog_number, new_release_date, publish_date, pre_order, pre_order_date, upc,
track_count, image.dynamic_uri ("…/image_size/{w}x{h}/….jpg"), artists[{id,name,slug,image}], remixers[],
label{id,name}, bpm_range{min,max}, exclusive, desc`.

### Track object (from `/tracks`)
Same fields the Optimal Breaks helper already reads: `id, slug, name, mix_name, artists[], remixers[],
bpm, key{name}, genre{name}, length, isrc, sample_url, publish_date, release{id,name,slug,image,…}`.

## Recommended strategy

1. **Full import** (`npm run import:beatport -- --full`):
   - Walk `/label/dirty-kitchen-rave/112835/tracks?page=1..11&per_page=150`, parse `__NEXT_DATA__`.
   - Group tracks by `release.id`. That gives every release (413) with its tracks (1,571) in ~11 requests.
   - For release-level fields missing on the track blob (`catalog_number`, `upc`, full `artists`, type),
     fetch `/release/<slug>/<id>` once per release (throttle ~1 req/s).
   - Upsert `artists`, `releases`, `tracks`, `release_artists`, `track_artists` with the **service role key**
     (server-side only, never in `NEXT_PUBLIC_*`).
2. **Daily sync** (Vercel Cron or GitHub Action):
   - Page 1 of `/tracks` + the pre-orders on `/releases` (server-rendered) → insert anything new.
   - Pre-orders are stored with their future `release_date`; the site shows them as "Pre-order / Coming soon"
     automatically until the date passes.
   - Revalidate: the pages use `revalidate = 3600`; optionally call `revalidatePath('/[lang]', 'layout')`
     from an authenticated route after the sync.

## Field mapping

| DB column | Source |
|---|---|
| `releases.slug` | `slugify(catalog_number + '-' + name)` → `dkr0237-romero` (fallback `slugify(name)-<id>`) |
| `releases.type` | `DKRLP…` or ≥ 6 tracks with many artists → `album`/`compilation`; 3–5 tracks → `ep`; else `single` |
| `releases.genres` | distinct `track.genre.name` of its tracks, most frequent first |
| `releases.artwork_url` | `image.dynamic_uri` (keep `{w}x{h}`, the site resizes) |
| `releases.release_date` | `new_release_date` or `publish_date` |
| `tracks.sample_url` | `sample_url` (preview played by the site's global player) |
| `tracks.music_key` | `key.name` |
| `release_artists` / `track_artists` role | `artists[]` → `primary`, `remixers[]` → `remixer` |

**Never overwrite** editorial columns on update: `bio_en, bio_es, is_roster, soundcloud_url,
instagram_url, note_en, note_es, is_featured` (and `bandcamp_url` once set by hand).

## Enrichment (optional, after the import)

- **Spotify**: Client Credentials flow → `GET /v1/search?type=album&q=upc:<UPC>` for releases,
  `q=isrc:<ISRC>` for tracks. Exact match, safe to automate.
- **Apple Music**: `https://itunes.apple.com/lookup?upc=<UPC>&entity=album`.
- **Bandcamp**: no API. Scrape `https://dirtykitchenrave.bandcamp.com/music`, match by normalised
  title + artist. Leave unmatched ones for manual entry.

## Env vars the importer needs

```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=      # server only
SPOTIFY_CLIENT_ID=              # optional
SPOTIFY_CLIENT_SECRET=          # optional
```
