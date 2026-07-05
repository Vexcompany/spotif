// sb-proxy.js — Frontend helper: semua request Supabase lewat /api/sb (proxy)
// Key TIDAK pernah ada di browser. Tidak perlu /api/config lagi.
// Ganti semua penggunaan sb.get/patch/del/post dan fetch langsung ke Supabase.

const sb = {
  async _req(method, path, body, prefer) {
    const res = await fetch('/api/sb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ method, path, body, prefer }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || `HTTP ${res.status}`);
    }
    return res.json();
  },

  get(table, query = '') {
    return this._req('GET', query ? `${table}?${query}` : table);
  },

  post(table, body, prefer = 'return=representation,resolution=merge-duplicates') {
    return this._req('POST', table, body, prefer);
  },

  patch(table, query, body) {
    return this._req('PATCH', `${table}?${query}`, body, 'return=representation');
  },

  del(table, query) {
    return this._req('DELETE', `${table}?${query}`, undefined, 'return=minimal');
  },

  async rpc(fn, args = {}) {
    const res = await fetch('/api/sb-rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ fn, args }),
    });
    return res.json().catch(() => ({}));
  },
};
