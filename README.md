# DIRTY KITCHEN RAVE — website

Official website of **Dirty Kitchen Rave (DKR)**, multi-genre bass label from London.
Design: proposal **05 "Drop"** (concrete, ink, hi-vis orange, Archivo variable from 62% to 125% width).
Languages: **English** (`/en`) and **Spanish** (`/es`).

Stack: Next.js 16 (App Router) · React 19 · TypeScript · plain CSS · Supabase (optional).

## 1. Run locally

```bash
npm install
cp .env.example .env.local      # optional; the site works without it
npm run dev                     # http://localhost:3000 -> redirects to /en or /es
```

Without Supabase the site reads **`data/catalog.seed.json`**. As of 30 Sept 2026 that file is the real Beatport catalogue: **413 releases, 1,571 tracks, 175 artists** (not the old 10-release sample). Session notes: **`docs/BITACORA.md`**.

## 2. Load the real catalogue from Beatport

The importer reads the public Beatport pages of the label (id 112835) and builds releases, tracks
(with the preview `sample_url`), artists and credits. Details and findings: **`docs/IMPORTER.md`**.

On this PC, `npm run import:beatport` does not finish: the Acttax proxy breaks TLS, and after that
Cloudflare answers 403 to Node. The 30 Sept load was read in a real browser and written with
`CatalogBuilder`. How, and the numbers: **`docs/IMPORTER.md`** and **`docs/BITACORA.md`**.

```bash
# quick test: first 150 tracks, print a summary, write nothing
npm run import:beatport -- --max-pages=1 --dry-run

# full catalogue into the JSON file (no database needed) — ~413 releases, takes several minutes
npm run import:beatport

# only new releases since the last import
npm run import:beatport -- --incremental
```

The JSON import replaces the sample file but **keeps editorial fields** already in it
(artist bios, roster flag, manual links, release notes, featured).

### With Supabase

1. Create a Supabase project and run `supabase/migrations/001_init.sql` in the SQL editor.
2. In `.env.local` set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.
3. `npm run import:beatport -- --supabase` (full) — the site now reads from the database.
4. Edit bios, roster, notes, featured releases and Bandcamp/Spotify links directly in Supabase:
   the importer never overwrites those columns.

### Daily sync (Vercel)

`vercel.json` schedules `GET /api/cron/beatport-sync` every day at 06:00 UTC. It reads the newest tracks
and the pre-orders, stores new releases in Supabase and revalidates the site.
Set `CRON_SECRET` (and the Supabase vars) in Vercel → Project → Environment Variables.
Manual run: `curl -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/cron/beatport-sync`.

## Listening (like Optimal Breaks)

- Every track with a Beatport `sample_url` is playable: release tracklists, the **Listen** list on each artist page
  (all their tracks and remixes on DKR, with cover), and the round ▶ on every release card.
- One global player with a queue: **Play all / Stop**, next / previous, auto-advance, lock-screen controls.
  It keeps playing while you navigate.
- Audio goes through **`/api/audio-proxy`** (Beatport hosts only, with HTTP Range support, required by iOS Safari),
  ported from Optimal Breaks.
- Each track shows **Spotify** (direct link if verified, otherwise a Spotify search), **TIDAL** (only with a verified
  link) and **Beatport** buttons, plus a share link `?play=beatport:<id>` (tap to play, never autoplay).
- Verified links come from `npm run match:streaming` (Spotify) and `npm run match:streaming -- --service=tidal`,
  which match **by ISRC / UPC** from Beatport (exact). Add `--supabase` to work on the database.
  Supabase needs `supabase/migrations/002_tidal_links.sql`.

## URL map

| URL | Page |
|---|---|
| `/` | Redirects to `/en` or `/es` (cookie `NEXT_LOCALE` → `Accept-Language` → English) |
| `/{lang}` | Home: latest drop, coming soon, drops, merch, crew, channels, demos |
| `/{lang}/releases` | Full catalogue with search and filters (genre, year, format) |
| `/{lang}/releases/{slug}` | Release: artwork, tracklist with Beatport previews, buy links, more from the artist |
| `/{lang}/artists` · `/{lang}/artists/{slug}` | Roster and artist page (releases + remixes on DKR) |
| `/{lang}/genres` · `/{lang}/genres/{slug}` | Genre index and releases per genre |
| `/{lang}/shop` · `/demos` · `/about` · `/podcast` | Content pages |
| `/{lang}/links` | Linktree replacement for the Instagram/TikTok bio |
| `/{lang}/legal/{notice,privacy,cookies}` | Legal (placeholder texts, noindex) |
| `/dkr0237` | Short link by catalogue number → release page |
| `/sitemap.xml` · `/robots.txt` · `/feed.xml` | SEO + RSS of new releases |
| `/api/cron/beatport-sync` | Daily Beatport sync (protected) |

Track sharing: `/{lang}/releases/{slug}?play=beatport:{trackId}` highlights the track and asks to tap play
(never autoplays). The player is global: previews keep playing while navigating.

## Project structure

```
src/
  proxy.ts                   Language redirect + short links (Next 16 "proxy", formerly middleware)
  app/
    globals.css icon.svg     Design system from proposal 05, favicon
    [lang]/                  All pages + layout (root <html lang>), error, 404, OG image
    api/cron/beatport-sync/  Daily incremental import
    sitemap.ts robots.ts feed.xml/route.ts
  components/                Nav, Footer, Player, TrackList, ReleasesExplorer, HeroDrop, Marquee…
  i18n/                      Locales + EN/ES dictionaries (all UI copy)
  lib/
    catalog.ts               Data entry point (seed JSON or Supabase) + selectors
    supabase.ts              Read adapter
    beatport/                Importer: scrape.ts (Beatport pages) · build.ts (→ Catalog) · sync.ts · sinks.ts (Supabase writes)
    types.ts view.ts format.ts site.ts
scripts/import-beatport.ts   CLI for the importer
data/catalog.seed.json       Catalogue used when Supabase is not configured
supabase/migrations/         001_init.sql
docs/IMPORTER.md             Beatport findings, field mapping, 30 Sept load
docs/BITACORA.md             What changed on 30 Sept 2026 (catalogue + language switch)
vercel.json                  Cron schedule
```

## Before launch

- Replace the legal placeholder texts in `src/i18n/dictionaries.ts` (`legal`).
- Confirm with the label that the WhatsApp number can be public (`src/lib/site.ts`, set `whatsapp: ''` to hide it).
- Deploy on Vercel with `NEXT_PUBLIC_SITE_URL=https://dirtykitchenrave.com`.
- Social links come from the label's Linktree (Sept 2026) and live in `src/lib/site.ts`.
