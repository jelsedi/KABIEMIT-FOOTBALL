const express = require('express');
const router = express.Router();
const { supabasePublic, supabaseAdmin } = require('../config/supabaseClient');
const { requireAdmin, canActOnRegion } = require('../middleware/auth');

// GET /api/fixtures - list upcoming fixtures (public)
router.get('/', async (req, res) => {
  const { data, error } = await supabasePublic
    .from('fixtures')
    .select(`
      id, match_date, status,
      home_team:home_team_id ( id, name, badge_url ),
      away_team:away_team_id ( id, name, badge_url ),
      pitch:pitch_id ( id, name ),
      results ( home_score, away_score )
    `)
    .order('match_date', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/fixtures/:id - single fixture detail
router.get('/:id', async (req, res) => {
  const { data, error } = await supabasePublic
    .from('fixtures')
    .select(`
      id, match_date, status,
      home_team:home_team_id ( id, name, badge_url ),
      away_team:away_team_id ( id, name, badge_url ),
      pitch:pitch_id ( id, name ),
      results ( home_score, away_score ),
      referee_assignments ( id, confirmed, referee:referee_id ( name, phone ) )
    `)
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Fixture not found' });
  res.json(data);
});

// POST /api/fixtures - create a fixture (admin only)
router.post('/', requireAdmin, async (req, res) => {
  const { home_team_id, away_team_id, pitch_id, match_date, region_id, client_id } = req.body;

  if (!home_team_id || !away_team_id || !match_date || !region_id) {
    return res.status(400).json({ error: 'home_team_id, away_team_id, match_date, region_id are required' });
  }
  if (!canActOnRegion(req.admin, region_id)) {
    return res.status(403).json({ error: 'Not authorized for this region' });
  }

  const { data, error } = await supabaseAdmin
    .from('fixtures')
    .insert({ home_team_id, away_team_id, pitch_id, match_date, region_id, client_id })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PATCH /api/fixtures/:id - update status/date (admin only)
router.patch('/:id', requireAdmin, async (req, res) => {
  const { data: existing } = await supabaseAdmin
    .from('fixtures')
    .select('region_id')
    .eq('id', req.params.id)
    .single();

  if (!existing) return res.status(404).json({ error: 'Fixture not found' });
  if (!canActOnRegion(req.admin, existing.region_id)) {
    return res.status(403).json({ error: 'Not authorized for this region' });
  }

  const { data, error } = await supabaseAdmin
    .from('fixtures')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
