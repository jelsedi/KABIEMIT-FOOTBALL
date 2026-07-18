-- Run in Supabase SQL editor.
-- Links a referee row to a Supabase Auth account, so referees can log
-- in and see their own schedule (separate from the admins table).

alter table referees add column if not exists user_id uuid references auth.users(id);

alter table referees enable row level security;
alter table referee_assignments enable row level security;

-- Public read on referees (names only matter publicly, phone is sensitive
-- so we still expose it via API but you may want to restrict that later)
create policy "referees_public_read" on referees for select using (true);

create policy "referees_admin_write" on referees for insert with check (
  exists (select 1 from admins where admins.user_id = auth.uid()
    and (admins.role = 'super_admin' or admins.region_id = referees.region_id))
);

create policy "referees_admin_update" on referees for update using (
  exists (select 1 from admins where admins.user_id = auth.uid()
    and (admins.role = 'super_admin' or admins.region_id = referees.region_id))
);

-- Assignments: public can see who's reffing what (transparency),
-- admins can create/update, and a referee can update their OWN
-- assignment (to confirm availability).
create policy "assignments_public_read" on referee_assignments for select using (true);

create policy "assignments_admin_write" on referee_assignments for insert with check (
  exists (
    select 1 from fixtures f
    join admins a on a.user_id = auth.uid()
    where f.id = referee_assignments.fixture_id
    and (a.role = 'super_admin' or a.region_id = f.region_id)
  )
);

create policy "assignments_confirm_own" on referee_assignments for update using (
  exists (select 1 from referees r where r.id = referee_assignments.referee_id and r.user_id = auth.uid())
  or exists (
    select 1 from fixtures f
    join admins a on a.user_id = auth.uid()
    where f.id = referee_assignments.fixture_id
    and (a.role = 'super_admin' or a.region_id = f.region_id)
  )
);
