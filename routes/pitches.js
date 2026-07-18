const express = require('express');
const router = express.Router();
const { supabasePublic } = require('../config/supabaseClient');

// GET /api/pitches - list pitches (public)
router.get('/', async (req, res) => {
  const { data, error } = await supabasePublic
    .from('pitches')
    .select('id, name, region_id')
    .order('name', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
