// Shared fetch helper for all pages.
// Reads the Supabase access token from localStorage (set on admin login)
// and attaches it automatically for admin-only endpoints.

const API = {
  async get(path) {
    const res = await fetch(`/api${path}`);
    if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
    return res.json();
  },

  async post(path, body) {
    const token = localStorage.getItem('vf_access_token');
    const res = await fetch(`/api${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
    return res.json();
  },

  async patch(path, body) {
    const token = localStorage.getItem('vf_access_token');
    const res = await fetch(`/api${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
    return res.json();
  },

  formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) +
      ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  },
};
