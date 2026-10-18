-- Booking requests for a DKR collective set. The visitor does not pick an artist.
-- Every field on the form is required. assigned_artist and admin_note are internal.
-- The server action inserts with the service role. No public policies:
-- the anon key cannot read or insert. Service role bypasses RLS.

create table if not exists public.booking_requests (
  id              bigint generated always as identity primary key,
  created_at      timestamptz not null default now(),
  lang            text not null check (lang in ('en', 'es')),
  contact_name    text not null check (char_length(contact_name) between 2 and 80),
  contact_email   text not null check (char_length(contact_email) between 5 and 160),
  contact_phone   text not null check (char_length(contact_phone) between 6 and 40),
  organisation    text not null check (char_length(organisation) between 2 and 120),
  event_name      text not null check (char_length(event_name) between 2 and 160),
  event_date      date not null,
  city            text not null check (char_length(city) between 2 and 80),
  country         text not null check (char_length(country) between 2 and 80),
  venue           text not null check (char_length(venue) between 2 and 120),
  set_minutes     integer not null check (set_minutes between 15 and 480),
  fee_offer       text not null check (char_length(fee_offer) between 1 and 80),
  message         text not null check (char_length(message) between 2 and 1200),
  status          text not null default 'new' check (status in ('new', 'reviewing', 'offered', 'confirmed', 'declined')),
  assigned_artist text check (assigned_artist is null or char_length(assigned_artist) <= 120),
  admin_note      text check (admin_note is null or char_length(admin_note) <= 2000)
);

create index if not exists booking_requests_created_idx
  on public.booking_requests (created_at desc);

create index if not exists booking_requests_email_idx
  on public.booking_requests (contact_email, created_at desc);

alter table public.booking_requests enable row level security;

revoke all on table public.booking_requests from anon, authenticated;
grant select, insert, update on table public.booking_requests to service_role;
