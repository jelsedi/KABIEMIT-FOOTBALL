const express = require('express');
const router = express.Router();
const { supabasePublic, supabaseAdmin } = require('../config/supabaseClient');
const { requireAdmin, canActOnRegion } = require('../middleware/auth');

// GET /api/roster/:fixtureId - roster for a fixture, both teams (public)
router.get('/:fixtureId', async (req, res) => {
  const { data, error } = await supabasePublic
    .from('fixture_rosters')
    .select(`
      id, team_id,
      player:player_id ( id, name, position, jersey_number )
    `)
    .eq('fixture_id', req.params.fixtureId);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/roster - add a player to a fixture's matchday roster (admin only)
// This is where suspension enforcement actually happens.
router.post('/', requireAdmin, async (req, res) => {
  const { fixture_id, team_id, player_id } = req.body;

  if (!fixture_id || !team_id || !player_id) {
    return res.status(400).json({ error: 'fixture_id, team_id, and player_id are required' });
  }

  const { data: fixture } = await supabaseAdmin
    .from('fixtures')
    .select('region_id, home_team_id, away_team_id')
    .eq('id', fixture_id)
    .single();

  if (!fixture) return res.status(404).json({ error: 'Fixture not found' });
  if (!canActOnRegion(req.admin, fixture.region_id)) {
    return res.status(403).json({ error: 'Not authorized for this region' });
  }
  if (team_id !== fixture.home_team_id && team_id !== fixture.away_team_id) {
    return res.status(400).json({ error: "That team isn't playing in this fixture" });
  }

  // Confirm the player actually belongs to the team being named
  const { data: player } = await supabaseAdmin
    .from('players')
    .select('team_id')
    .eq('id', player_id)
    .single();

  if (!player) return res.status(404).json({ error: 'Player not found' });
  if (player.team_id !== team_id) {
    return res.status(400).json({ error: "This player is not registered to that team" });
  }

  // THE ACTUAL BLOCK: check for an active suspension
  const { data: suspension } = await supabaseAdmin
    .from('discipline_cards')
    .select('id, card_type, reason, suspension_matches, matches_served')
    .eq('player_id', player_id)
    .eq('is_active_suspension', true)
    .maybeSingle();

  if (suspension) {
    return res.status(403).json({
      error: `Player is suspended (${suspension.card_type} card${suspension.reason ? ': ' + suspension.reason : ''}) — ${suspension.matches_served}/${suspension.suspension_matches} matches served. Cannot be added to the roster.`,
    });
  }

  const { data, error } = await supabaseAdmin
    .from('fixture_rosters')
    .insert({ fixture_id, team_id, player_id })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Player is already on this fixture\'s roster' });
    }
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

// DELETE /api/roster/:id - remove a player from a roster (admin only, for corrections)
router.delete('/:id', requireAdmin, async (req, res) => {
  const { data: entry } = await supabaseAdmin
    .from('fixture_rosters')
    .select('fixture_id')
    .eq('id', req.params.id)
    .single();

  if (!entry) return res.status(404).json({ error: 'Roster entry not found' });

  const { data: fixture } = await supabaseAdmin
    .from('fixtures')
    .select('region_id')
    .eq('id', entry.fixture_id)
    .single();

  if (!canActOnRegion(req.admin, fixture.region_id)) {
    return res.status(403).json({ error: 'Not authorized for this region' });
  }

  const { error } = await supabaseAdmin.from('fixture_rosters').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

module.exports = router;
