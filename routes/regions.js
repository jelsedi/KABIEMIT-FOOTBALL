const express = require('express');
const router = express.Router();
const { supabasePublic, supabaseAdmin } = require('../config/supabaseClient');
const { requireAdmin } = require('../middleware/auth');

// GET /api/regions - list all regions (public)
router.get('/', async (req, res) => {
  const { data, error } = await supabasePublic
    .from('regions')
    .select('id, name, type, parent_region_id')
    .order('type', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/regions - create a region (admin only, e.g. adding a subcounty later)
router.post('/', requireAdmin, async (req, res) => {
  if (req.admin.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only super_admin can create regions' });
  }
  const { name, type, parent_region_id } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: 'name and type are required' });
  }

  const { data, error } = await supabaseAdmin
    .from('regions')
    .insert({ name, type, parent_region_id })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// GET /api/regions/:id/standings - simple league table for a region
router.get('/:id/standings', async (req, res) => {
  const { data: teams, error: teamsError } = await supabasePublic
    .from('teams')
    .select('id, name, badge_url')
    .eq('region_id', req.params.id);

  if (teamsError) return res.status(500).json({ error: teamsError.message });

  const { data: fixtures, error: fixturesError } = await supabasePublic
    .from('fixtures')
    .select('home_team_id, away_team_id, results ( home_score, away_score )')
    .eq('region_id', req.params.id)
    .eq('status', 'finished');

  if (fixturesError) return res.status(500).json({ error: fixturesError.message });

  const table = {};
  teams.forEach((t) => {
    table[t.id] = { ...t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 };
  });

  fixtures.forEach((f) => {
    const result = Array.isArray(f.results) ? f.results[0] : f.results;
    if (!result) return;
    const home = table[f.home_team_id];
    const away = table[f.away_team_id];
    if (!home || !away) return;

    home.played++; away.played++;
    home.gf += result.home_score; home.ga += result.away_score;
    away.gf += result.away_score; away.ga += result.home_score;

    if (result.home_score > result.away_score) {
      home.won++; home.points += 3; away.lost++;
    } else if (result.home_score < result.away_score) {
      away.won++; away.points += 3; home.lost++;
    } else {
      home.drawn++; away.drawn++; home.points += 1; away.points += 1;
    }
  });

  const standings = Object.values(table).sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga));
  res.json(standings);
});

module.exports = router;
