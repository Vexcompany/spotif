export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key = process.env.SUPABASE_KEY;
  const url = process.env.SUPABASE_URL;

  if (!key || !url) {
    return res.status(500).json({ error: 'Server config missing' });
  }

  res.setHeader('Cache-Control', 'private, max-age=300');
  res.setHeader('Surrogate-Control', 'no-store');

  return res.status(200).json({ url, key });
}
