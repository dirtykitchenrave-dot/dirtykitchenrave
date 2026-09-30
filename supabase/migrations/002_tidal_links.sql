-- Streaming links per track / release (filled by scripts/match-streaming.ts, never by the Beatport importer).
alter table public.tracks   add column if not exists tidal_url text;
alter table public.releases add column if not exists tidal_url text;
