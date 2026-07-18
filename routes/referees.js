const express = require('express');
const router = express.Router();
const { supabasePublic, supabaseAdmin } = require('../config/supabaseClient');
const { requireAdmin, requireReferee, canActOnRegion } = require('../middleware/auth');

// GET /api/referees - list referees (public)
router.get('/', async (req, res) => {
  const { data, error } = await supabasePublic
    .from('referees')
    .select('id, name, phone, region_id, user_id')
    .order('name', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/referees - add a referee (admin only)
router.post('/', requireAdmin, async (req, res) => {
  const { name, phone, region_id } = req.body;
  if (!name || !region_id) {
    return res.status(400).json({ error: 'name and region_id are required' });
  }
  if (!canActOnRegion(req.admin, region_id)) {
    return res.status(403).json({ error: 'Not authorized for this region' });
  }

  const { data, error } = await supabaseAdmin
    .from('referees')
    .insert({ name, phone, region_id })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PATCH /api/referees/:id/link-user - link a referee to a Supabase Auth
// account so they can log into the referee portal (admin only).
// The admin creates the auth user manually in Supabase first, then
// pastes that user's UID here.
router.patch('/:id/link-user', requireAdmin, async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });

  const { data, error } = await supabaseAdmin
    .from('referees')
    .update({ user_id })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ---- Assignments ----

// GET /api/referees/assignments/mine - the logged-in referee's own schedule
router.get('/assignments/mine', requireReferee, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('referee_assignments')
    .select(`
      id, confirmed, reminder_sent,
      fixture:fixture_id (
        id, match_date, status,
        home_team:home_team_id ( name ),
        away_team:away_team_id ( name ),
        pitch:pitch_id ( name, latitude, longitude )
      )
    `)
    .eq('referee_id', req.referee.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/referees/assignments - assign a referee to a fixture (admin only)
router.post('/assignments', requireAdmin, async (req, res) => {
  const { referee_id, fixture_id } = req.body;
  if (!referee_id || !fixture_id) {
    return res.status(400).json({ error: 'referee_id and fixture_id are required' });
  }

  const { data: fixture } = await supabaseAdmin
    .from('fixtures')
    .select('region_id')
    .eq('id', fixture_id)
    .single();

  if (!fixture) return res.status(404).json({ error: 'Fixture not found' });
  if (!canActOnRegion(req.admin, fixture.region_id)) {
    return res.status(403).json({ error: 'Not authorized for this region' });
  }

  const { data, error } = await supabaseAdmin
    .from('referee_assignments')
    .insert({ referee_id, fixture_id })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'This fixture already has a referee assigned' });
    }
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

// PATCH /api/referees/assignments/:id/confirm - referee confirms availability
router.patch('/assignments/:id/confirm', requireReferee, async (req, res) => {
  const { data: assignment } = await supabaseAdmin
    .from('referee_assignments')
    .select('referee_id')
    .eq('id', req.params.id)
    .single();

  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
  if (assignment.referee_id !== req.referee.id) {
    return res.status(403).json({ error: 'This assignment belongs to a different referee' });
  }

  const { data, error } = await supabaseAdmin
    .from('referee_assignments')
    .update({ confirmed: true })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PATCH /api/referees/assignments/:id/mark-reminder-sent - admin only.
// STUB: this only flips a flag in the database. It does NOT actually
// send an SMS. Wiring real SMS requires an SMS provider integration
// (e.g. the same one used for Malindi Delivery order notifications).
router.patch('/assignments/:id/mark-reminder-sent', requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('referee_assignments')
    .update({ reminder_sent: true })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ...data, note: 'Flag updated only — no SMS was actually sent. See README for wiring real SMS.' });
});

module.exports = router;
