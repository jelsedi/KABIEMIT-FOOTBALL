-- ============================================================
-- Village Football Platform — Database Schema (Supabase/Postgres)
-- Designed to scale: Ward -> Subcounty -> County
-- ============================================================

-- ----------------------------------------------------------
-- 1. REGIONS (the backbone of the scaling plan)
-- ----------------------------------------------------------
create table regions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('ward', 'subcounty', 'county')),
  parent_region_id uuid references regions(id),
  created_at timestamptz default now()
);
-- Example seed: start with your ward, no parent yet
-- insert into regions (name, type) values ('Your Ward Name', 'ward');

-- ----------------------------------------------------------
-- 2. ADMINS (role scoped by region)
-- ----------------------------------------------------------
create table admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  role text not null check (role in ('ward_admin', 'subcounty_admin', 'super_admin')),
  region_id uuid references regions(id),
  created_at timestamptz default now()
);

-- ----------------------------------------------------------
-- 3. TEAMS
-- ----------------------------------------------------------
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  badge_url text,
  home_ground text,
  founded_year int,
  region_id uuid references regions(id) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  -- offline sync helper
  client_id text unique -- lets an offline-created row match its local copy on sync
);

-- ----------------------------------------------------------
-- 4. PLAYERS
-- ----------------------------------------------------------
create table players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id),
  name text not null,
  position text,
  date_of_birth date,
  jersey_number int,
  photo_url text,
  region_id uuid references regions(id) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  client_id text unique
);

create table player_season_stats (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) not null,
  season text not null, -- e.g. '2026'
  goals int default 0,
  assists int default 0,
  matches_played int default 0
);

-- ----------------------------------------------------------
-- 5. PITCHES & BOOKINGS
-- ----------------------------------------------------------
create table pitches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region_id uuid references regions(id) not null,
  latitude double precision,
  longitude double precision
);

create table pitch_bookings (
  id uuid primary key default gen_random_uuid(),
  pitch_id uuid references pitches(id) not null,
  booked_date date not null,
  time_slot text not null, -- e.g. '15:00-17:00'
  booked_by text not null, -- team or event name
  purpose text,
  created_at timestamptz default now(),
  unique (pitch_id, booked_date, time_slot) -- prevents double-booking at db level
);

-- ----------------------------------------------------------
-- 6. FIXTURES & RESULTS
-- ----------------------------------------------------------
create table fixtures (
  id uuid primary key default gen_random_uuid(),
  home_team_id uuid references teams(id) not null,
  away_team_id uuid references teams(id) not null,
  pitch_id uuid references pitches(id),
  match_date timestamptz not null,
  status text not null default 'upcoming' check (status in ('upcoming', 'live', 'finished', 'postponed', 'cancelled')),
  region_id uuid references regions(id) not null,
  created_at timestamptz default now(),
  client_id text unique
);

create table results (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid references fixtures(id) unique not null,
  home_score int not null,
  away_score int not null,
  recorded_at timestamptz default now()
);

-- ----------------------------------------------------------
-- 7. TRANSFERS
-- ----------------------------------------------------------
create table transfers (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) not null,
  from_team_id uuid references teams(id),
  to_team_id uuid references teams(id) not null,
  transfer_type text check (transfer_type in ('free', 'loan', 'permanent')),
  transfer_date date not null default current_date,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------
-- 8. DISCIPLINE / CARDS
-- ----------------------------------------------------------
create table discipline_cards (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) not null,
  fixture_id uuid references fixtures(id) not null,
  card_type text not null check (card_type in ('yellow', 'red')),
  reason text,
  suspension_matches int default 0,
  matches_served int default 0,
  is_active_suspension boolean generated always as (matches_served < suspension_matches) stored,
  created_at timestamptz default now()
);
-- App logic: before adding a player to a fixture roster, check
-- for any discipline_cards row where is_active_suspension = true

-- ----------------------------------------------------------
-- 9. REFEREES
-- ----------------------------------------------------------
create table referees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  region_id uuid references regions(id) not null
);

create table referee_assignments (
  id uuid primary key default gen_random_uuid(),
  referee_id uuid references referees(id) not null,
  fixture_id uuid references fixtures(id) not null,
  confirmed boolean default false,
  reminder_sent boolean default false,
  unique (fixture_id) -- one referee per fixture, adjust if you need assistant refs
);

-- ----------------------------------------------------------
-- 10. NEWS / COACHING RESOURCES
-- ----------------------------------------------------------
create table news_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  cover_image text,
  region_id uuid references regions(id),
  published_at timestamptz default now()
);

create table coaching_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text check (category in ('tactics', 'first_aid', 'life_skills', 'other')),
  file_url text not null,
  uploaded_by uuid references admins(id),
  region_id uuid references regions(id),
  created_at timestamptz default now()
);

-- ----------------------------------------------------------
-- 11. FAN ENGAGEMENT
-- ----------------------------------------------------------
create table fan_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  team_id uuid references teams(id) not null,
  unique (user_id, team_id)
);

-- ----------------------------------------------------------
-- 12. EQUIPMENT MARKETPLACE
-- ----------------------------------------------------------
create table equipment_listings (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) not null,
  item text not null,
  listing_type text check (listing_type in ('trade', 'sell', 'donate')),
  description text,
  contact_info text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (example pattern — repeat per table)
-- ============================================================
alter table fixtures enable row level security;

-- Public can read fixtures in any region
create policy "fixtures_public_read" on fixtures
  for select using (true);

-- Only an admin scoped to that region (or a super_admin) can write
create policy "fixtures_admin_write" on fixtures
  for insert with check (
    exists (
      select 1 from admins
      where admins.user_id = auth.uid()
      and (admins.role = 'super_admin' or admins.region_id = fixtures.region_id)
    )
  );

-- Repeat similar select/insert/update policies for teams, players,
-- results, transfers, discipline_cards, pitch_bookings, etc.
