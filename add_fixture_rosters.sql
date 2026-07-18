-- Run in Supabase SQL editor. Adds the missing piece: which players are
-- actually named for a given fixture. This is what lets the discipline
-- tracker move from "advisory list" to "actually blocks a suspended
-- player from being added."

create table fixture_rosters (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid references fixtures(id) not null,
  team_id uuid references teams(id) not null,
  player_id uuid references players(id) not null,
  created_at timestamptz default now(),
  unique (fixture_id, player_id) -- a player can only be named once per fixture
);

alter table fixture_rosters enable row level security;

create policy "roster_public_read" on fixture_rosters
  for select using (true);

create policy "roster_admin_write" on fixture_rosters
  for insert with check (
    exists (
      select 1 from fixtures f
      join admins a on a.user_id = auth.uid()
      where f.id = fixture_rosters.fixture_id
      and (a.role = 'super_admin' or a.region_id = f.region_id)
    )
  );

create policy "roster_admin_delete" on fixture_rosters
  for delete using (
    exists (
      select 1 from fixtures f
      join admins a on a.user_id = auth.uid()
      where f.id = fixture_rosters.fixture_id
      and (a.role = 'super_admin' or a.region_id = f.region_id)
    )
  );
