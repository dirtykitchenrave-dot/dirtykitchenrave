-- Each time a visitor starts a preview (not a pause/resume), /api/plays inserts one row.
-- The Beatport importer never writes this table. No public policies: the anon key cannot read or insert.
-- Service role (the plays route) bypasses RLS.

create table if not exists public.track_play_events (
  id         bigint generated always as identity primary key,
  track_id   bigint not null references public.tracks(id) on delete cascade,
  played_at  timestamptz not null default now()
);

create index if not exists track_play_events_track_idx
  on public.track_play_events (track_id, played_at desc);

alter table public.track_play_events enable row level security;

revoke all on table public.track_play_events from anon, authenticated;
grant select, insert on table public.track_play_events to service_role;
