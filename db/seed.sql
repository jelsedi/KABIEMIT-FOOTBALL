-- Run this after schema.sql, in the Supabase SQL editor.
-- Seeds your starting region: Kabiemit ward.
-- No parent_region_id yet — you'll add a subcounty row and link it
-- here later, once you're ready to expand beyond the ward.

insert into regions (name, type)
values ('Kabiemit Ward', 'ward')
returning id;

-- Copy the returned id — you'll paste it into the admin dashboard's
-- "Region ID" field whenever you add a team or fixture.
