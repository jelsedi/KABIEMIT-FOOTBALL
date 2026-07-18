-- Run in Supabase SQL editor. Enables RLS on discipline_cards and adds
-- public read access (so the /discipline.html page can show suspensions)
-- plus admin-only write access, matching the pattern used for other tables.

alter table discipline_cards enable row level security;

create policy "discipline_public_read" on discipline_cards
  for select using (true);

-- Admin write access is handled server-side via the service role key in
-- routes/discipline.js, which bypasses RLS by design — no insert policy
-- is strictly required, but this makes intent explicit and future-proofs
-- against ever calling this table with the anon key for writes.
create policy "discipline_admin_write" on discipline_cards
  for insert with check (
    exists (
      select 1 from fixtures f
      join admins a on a.user_id = auth.uid()
      where f.id = discipline_cards.fixture_id
      and (a.role = 'super_admin' or a.region_id = f.region_id)
    )
  );
