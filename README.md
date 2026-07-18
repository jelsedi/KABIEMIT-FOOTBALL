# Village Football

A website for footballers in your village — fixtures, results, standings,
transfers, and (as you grow) discipline tracking, referee scheduling, pitch
booking, and more. Built to scale from your ward up to subcounty level.

Stack: Node.js/Express, Supabase (Postgres + Auth), vanilla HTML/CSS/JS —
same pattern as Malindi Delivery.

## 1. Create a Supabase project

1. Go to supabase.com, create a new project
2. In the SQL editor, run everything in `db/schema.sql`
3. Then run `db/seed.sql` — this creates your starting region,
   **Kabiemit Ward**, and returns its `id`. Copy that id — you'll need it
   when creating teams and fixtures.

## 2. Set up your admin account

1. In Supabase, go to **Authentication → Users → Add user**, create yourself
   an account with an email + password
2. Copy that user's UUID
3. In **Table Editor → admins**, insert a row:
   `user_id = <your user UUID>`, `role = "super_admin"`, `region_id` = blank
   (super_admin can act on any region)

## 3. Configure the project

```bash
cd village-football
npm install
cp .env.example .env
```

Fill in `.env` with your Supabase project's URL and keys
(**Settings → API** in Supabase):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (keep this secret — server-side only)

Also open `public/admin/login.html` and fill in the same
`SUPABASE_URL` / `SUPABASE_ANON_KEY` near the top of the script — the
browser needs its own copy since it can't read your `.env` file.

## 4. Run it

```bash
npm start
```

Visit `http://localhost:3000` for the public site, and
`http://localhost:3000/admin/login.html` to sign in as admin.

## 5. Add your first data

From the admin dashboard you can add teams, schedule fixtures, record
results, and log transfers. You'll need to paste in IDs (team ID, region
ID, fixture ID) by copying them from Supabase's Table Editor until a
nicer picker UI is built — this is intentionally the roughest part of the
MVP so the core data flow can be tested first.

## What's built

- Public: home, fixtures, teams, transfers
- Admin: login, add team, schedule fixture, record result, log transfer
- API: full CRUD-ish routes for fixtures/teams/players/results/transfers,
  plus a standings calculator at `/api/regions/:id/standings`
- Database: full schema from `db/schema.sql`, including discipline
  tracking, pitch bookings, referees, coaching resources, equipment
  marketplace, and fan follows — tables exist and are ready, but no UI
  has been built for them yet

## What's next (see OFFLINE_STRATEGY.md for detail)

- Build UI for standings, player profiles, and the not-yet-wired tables
  (discipline, pitch bookings, referees)
- Replace the raw-ID admin forms with dropdown pickers
- Add offline-first writes (IndexedDB + background sync) for the
  results form, since that's the one most likely to be filled in
  pitch-side with poor signal
- Wire up SMS reminders for referees, reusing the Kwehu SMS integration
