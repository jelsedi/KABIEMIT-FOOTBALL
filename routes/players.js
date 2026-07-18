const express = require('express');
const router = express.Router();
const { supabasePublic, supabaseAdmin } = require('../config/supabaseClient');
const { requireAdmin, canActOnRegion } = require('../middleware/auth');

// GET /api/players - list players, optionally filtered by ?team_id= (public)
router.get('/', async (req, res) => {
  let query = supabasePublic
    .from('players')
    .select('id, name, position, jersey_number, team_id, team:team_id ( name )')
    .order('name', { ascending: true });

  if (req.query.team_id) query = query.eq('team_id', req.query.team_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/players/:id - player profile (public)
router.get('/:id', async (req, res) => {
  const { data: player, error } = await supabasePublic
    .from('players')
    .select('*, team:team_id ( id, name, badge_url )')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Player not found' });

  const { data: stats } = await supabasePublic
    .from('player_season_stats')
    .select('season, goals, assists, matches_played')
    .eq('player_id', req.params.id)
    .order('season', { ascending: false });

  const { data: activeSuspension } = await supabasePublic
    .from('discipline_cards')
    .select('card_type, reason, suspension_matches, matches_served, is_active_suspension')
    .eq('player_id', req.params.id)
    .eq('is_active_suspension', true)
    .maybeSingle();

  res.json({ ...player, stats: stats || [], active_suspension: activeSuspension || null });
});

// POST /api/players - register a new player (admin only)
router.post('/', requireAdmin, async (req, res) => {
  const { team_id, name, position, date_of_birth, jersey_number, photo_url, region_id, client_id } = req.body;

  if (!name || !region_id) {
    return res.status(400).json({ error: 'name and region_id are required' });
  }
  if (!canActOnRegion(req.admin, region_id)) {
    return res.status(403).json({ error: 'Not authorized for this region' });
  }

  const { data, error } = await supabaseAdmin
    .from('players')
    .insert({ team_id, name, position, date_of_birth, jersey_number, photo_url, region_id, client_id })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

module.exports = router;
