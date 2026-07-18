const { supabasePublic, supabaseAdmin } = require('../config/supabaseClient');

/**
 * Verifies the request carries a valid Supabase session token,
 * then checks the admins table to see what region/role that
 * user is allowed to act on. Attaches req.admin if valid.
 *
 * Frontend sends: Authorization: Bearer <supabase access_token>
 */
async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Missing auth token' });
    }

    const { data: userData, error: userError } = await supabasePublic.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const { data: adminRow, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('id, role, region_id')
      .eq('user_id', userData.user.id)
      .single();

    if (adminError || !adminRow) {
      return res.status(403).json({ error: 'Not registered as an admin' });
    }

    req.admin = adminRow;
    req.user = userData.user;
    next();
  } catch (err) {
    console.error('[auth] unexpected error', err);
    res.status(500).json({ error: 'Auth check failed' });
  }
}

/**
 * Confirms the admin's region matches the resource's region,
 * unless they're a super_admin. Call after requireAdmin, passing
 * the region_id you're trying to write to.
 */
function canActOnRegion(admin, regionId) {
  if (!admin) return false;
  if (admin.role === 'super_admin') return true;
  return admin.region_id === regionId;
}

module.exports = { requireAdmin, canActOnRegion };
