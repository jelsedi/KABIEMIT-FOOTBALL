const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabaseClient');
const { requireAdmin, canActOnRegion } = require('../middleware/auth');

// POST /api/results - record a match result (admin only)
// Also flips the fixture's status to 'finished'
router.post('/', requireAdmin, async (req, res) => {
  const { fixture_id, home_score, away_score } = req.body;

  if (!fixture_id || home_score == null || away_score == null) {
    return res.status(400).json({ error: 'fixture_id, home_score, away_score are required' });
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

  const { data: result, error } = await supabaseAdmin
    .from('results')
    .upsert({ fixture_id, home_score, away_score }, { onConflict: 'fixture_id' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabaseAdmin.from('fixtures').update({ status: 'finished' }).eq('id', fixture_id);

  res.status(201).json(result);
});

module.exports = router;
