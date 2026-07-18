require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.warn(
    '[config] Missing SUPABASE_URL or SUPABASE_ANON_KEY. Copy .env.example to .env and fill it in.'
  );
}

// Public client - respects Row Level Security, safe for anonymous reads
const supabasePublic = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Admin client - bypasses RLS, only ever used server-side after we've
// verified the request came from a logged-in admin (see middleware/auth.js)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

module.exports = { supabasePublic, supabaseAdmin };
