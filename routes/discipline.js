const express = require('express');
const router = express.Router();
const { supabasePublic, supabaseAdmin } = require('../config/supabaseClient');
const { requireAdmin, canActOnRegion } = require('../middleware/auth');

// GET /api/discipline?active=true - list discipline cards (public)
// active=true filters to only currently-suspended players
router.get('/', async (req, res) => {
  let query = supabasePublic
    .from('discipline_cards')
    .select(`
      id, card_type, reason, suspension_matches, matches_served, is_active_suspension, created_at,
      player:player_id ( id, name, team:team_id ( name ) ),
      fixture:fixture_id ( id, match_date )
    `)
    .order('created_at', { ascending: false });

  if (req.query.active === 'true') query = query.eq('is_active_suspension', true);
  if (req.query.player_id) query = query.eq('player_id', req.query.player_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/discipline - log a card (admin only)
router.post('/', requireAdmin, async (req, res) => {
  const { player_id, fixture_id, card_type, reason, suspension_matches } = req.body;

  if (!player_id || !fixture_id || !card_type) {
    return res.status(400).json({ error: 'player_id, fixture_id, and card_type are required' });
  }
  if (!['yellow', 'red'].includes(card_type)) {
    return res.status(400).json({ error: 'card_type must be yellow or red' });
  }

  // Confirm the admin is allowed to act on this fixture's region
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
    .from('discipline_cards')
    .insert({
      player_id,
      fixture_id,
      card_type,
      reason: reason || null,
      suspension_matches: suspension_matches || 0,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PATCH /api/discipline/:id/serve - mark one suspension match as served (admin only)
// Call this after the player sits out a match, to count down their ban.
router.patch('/:id/serve', requireAdmin, async (req, res) => {
  const { data: card } = await supabaseAdmin
    .from('discipline_cards')
    .select('matches_served, suspension_matches')
    .eq('id', req.params.id)
    .single();

  if (!card) return res.status(404).json({ error: 'Discipline record not found' });

  const { data, error } = await supabaseAdmin
    .from('discipline_cards')
    .update({ matches_served: Math.min(card.matches_served + 1, card.suspension_matches) })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
