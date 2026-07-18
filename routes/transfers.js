const express = require('express');
const router = express.Router();
const { supabasePublic, supabaseAdmin } = require('../config/supabaseClient');
const { requireAdmin } = require('../middleware/auth');

// GET /api/transfers - transfer log (public)
router.get('/', async (req, res) => {
  const { data, error } = await supabasePublic
    .from('transfers')
    .select(`
      id, transfer_type, transfer_date,
      player:player_id ( id, name ),
      from_team:from_team_id ( id, name ),
      to_team:to_team_id ( id, name )
    `)
    .order('transfer_date', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/transfers - log a transfer and update the player's team (admin only)
router.post('/', requireAdmin, async (req, res) => {
  const { player_id, from_team_id, to_team_id, transfer_type, transfer_date } = req.body;

  if (!player_id || !to_team_id) {
    return res.status(400).json({ error: 'player_id and to_team_id are required' });
  }

  const { data: transfer, error } = await supabaseAdmin
    .from('transfers')
    .insert({ player_id, from_team_id, to_team_id, transfer_type, transfer_date })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabaseAdmin.from('players').update({ team_id: to_team_id }).eq('id', player_id);

  res.status(201).json(transfer);
});

module.exports = router;
