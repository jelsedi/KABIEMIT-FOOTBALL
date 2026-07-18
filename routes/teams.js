const express = require('express');
const router = express.Router();
const { supabasePublic, supabaseAdmin } = require('../config/supabaseClient');
const { requireAdmin, canActOnRegion } = require('../middleware/auth');

// GET /api/teams - list all teams (public)
router.get('/', async (req, res) => {
  const { data, error } = await supabasePublic
    .from('teams')
    .select('id, name, badge_url, home_ground, founded_year, region_id')
    .order('name', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/teams/:id - team profile + squad (public)
router.get('/:id', async (req, res) => {
  const { data: team, error: teamError } = await supabasePublic
    .from('teams')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (teamError) return res.status(404).json({ error: 'Team not found' });

  const { data: players } = await supabasePublic
    .from('players')
    .select('id, name, position, jersey_number, photo_url')
    .eq('team_id', req.params.id);

  res.json({ ...team, players: players || [] });
});

// POST /api/teams - create a team (admin only)
router.post('/', requireAdmin, async (req, res) => {
  const { name, badge_url, home_ground, founded_year, region_id, client_id } = req.body;

  if (!name || !region_id) {
    return res.status(400).json({ error: 'name and region_id are required' });
  }
  if (!canActOnRegion(req.admin, region_id)) {
    return res.status(403).json({ error: 'Not authorized for this region' });
  }

  const { data, error } = await supabaseAdmin
    .from('teams')
    .insert({ name, badge_url, home_ground, founded_year, region_id, client_id })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

module.exports = router;
