-- DIRTY KITCHEN RAVE — initial schema
-- Ids are Beatport ids (release, track, artist) so the importer can upsert safely.
-- Editorial columns (bios, links, featured, notes) are never overwritten by the importer.

create table if not exists public.artists (
  id              bigint primary key,            -- Beatport artist id
  slug            text not null unique,
  name            text not null,
  image_url       text,
  country         text,
  bio_en          text,                          -- editorial
  bio_es          text,                          -- editorial
  beatport_url    text,
  bandcamp_url    text,                          -- editorial / enrichment
  spotify_url     text,                          -- enrichment
  soundcloud_url  text,                          -- editorial
  instagram_url   text,                          -- editorial
  is_roster       boolean not null default false,-- editorial
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.releases (
  id               bigint primary key,           -- Beatport release id
  slug             text not null unique,         -- "dkr0237-romero"
  catalog_number   text unique,                  -- "DKR0237"
  title            text not null,
  type             text not null default 'single' check (type in ('single','ep','album','compilation')),
  release_date     date not null,
  artwork_url      text,                         -- Beatport dynamic_uri with {w}x{h}
  genres           text[] not null default '{}',
  upc              text,
  series           text,
  beatport_url     text,
  bandcamp_url     text,                         -- enrichment (Bandcamp page match)
  spotify_url      text,                         -- enrichment (Spotify search by UPC)
  apple_music_url  text,                         -- enrichment (iTunes lookup by UPC)
  note_en          text,                         -- editorial
  note_es          text,                         -- editorial
  is_featured      boolean not null default false, -- editorial: pin to the home hero
  last_synced_at   timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists releases_date_idx on public.releases (release_date desc);

create table if not exists public.tracks (
  id            bigint primary key,              -- Beatport track id
  release_id    bigint not null references public.releases(id) on delete cascade,
  position      int not null default 0,
  title         text not null,
  mix_name      text,
  bpm           int,
  music_key     text,
  genre         text,
  length        text,                            -- "4:43"
  isrc          text,
  sample_url    text,                            -- Beatport preview clip
  beatport_url  text,
  spotify_url   text,                            -- enrichment (Spotify search by ISRC)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists tracks_release_idx on public.tracks (release_id, position);

create table if not exists public.release_artists (
  release_id  bigint not null references public.releases(id) on delete cascade,
  artist_id   bigint not null references public.artists(id) on delete cascade,
  role        text not null default 'primary' check (role in ('primary','remixer')),
  position    int not null default 0,
  primary key (release_id, artist_id, role)
);

create table if not exists public.track_artists (
  track_id   bigint not null references public.tracks(id) on delete cascade,
  artist_id  bigint not null references public.artists(id) on delete cascade,
  role       text not null default 'primary' check (role in ('primary','remixer')),
  position   int not null default 0,
  primary key (track_id, artist_id, role)
);

-- updated_at triggers
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists artists_touch on public.artists;
create trigger artists_touch before update on public.artists for each row execute function public.touch_updated_at();
drop trigger if exists releases_touch on public.releases;
create trigger releases_touch before update on public.releases for each row execute function public.touch_updated_at();
drop trigger if exists tracks_touch on public.tracks;
create trigger tracks_touch before update on public.tracks for each row execute function public.touch_updated_at();

-- Row Level Security: the public site only reads. Writes go through the service role (importer / admin).
alter table public.artists enable row level security;
alter table public.releases enable row level security;
alter table public.tracks enable row level security;
alter table public.release_artists enable row level security;
alter table public.track_artists enable row level security;

drop policy if exists "public read artists" on public.artists;
create policy "public read artists" on public.artists for select using (true);
drop policy if exists "public read releases" on public.releases;
create policy "public read releases" on public.releases for select using (true);
drop policy if exists "public read tracks" on public.tracks;
create policy "public read tracks" on public.tracks for select using (true);
drop policy if exists "public read release_artists" on public.release_artists;
create policy "public read release_artists" on public.release_artists for select using (true);
drop policy if exists "public read track_artists" on public.track_artists;
create policy "public read track_artists" on public.track_artists for select using (true);
