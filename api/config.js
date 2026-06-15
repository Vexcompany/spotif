// api/config.js — Vercel Serverless Function
// Inject Supabase key dan third-party API keys dari environment variable ke frontend.
// Key TIDAK pernah ada di source code / git repo.
//
// Setup:
//   Vercel Dashboard → Project → Settings → Environment Variables
//   Tambahkan: SUPABASE_KEY    = <service_role_key_kamu>
//              SUPABASE_URL    = https://ygwoddwdhelqcwhpqasl.supabase.co
//              THERESAV_KEY    = <api_key_theresav>

export default function handler(req, res) {
  // Hanya izinkan GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key          = process.env.SUPABASE_KEY;
  const url          = process.env.SUPABASE_URL;
  const theresavKey  = process.env.THERESAV_KEY;

  if (!key || !url) {
    return res.status(500).json({ error: 'Server config missing' });
  }

  // Cache sebentar di browser (5 menit) — tidak perlu fetch tiap request
  res.setHeader('Cache-Control', 'private, max-age=300');
  // Jangan izinkan di-cache oleh CDN/proxy publik
  res.setHeader('Surrogate-Control', 'no-store');

  return res.status(200).json({ url, key, theresavKey: theresavKey || null });
}
