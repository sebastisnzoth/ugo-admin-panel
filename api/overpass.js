// Proxy server-side — sin CORS, más rápido
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'query requerida' });

  const ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.openstreetmap.ru/api/interpreter',
  ];

  for (const ep of ENDPOINTS) {
    try {
      const r = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
        signal: AbortSignal.timeout(20000),
      });
      if (!r.ok) continue;
      const data = await r.json();
      if (data.elements) return res.json(data);
    } catch { continue; }
  }

  return res.status(503).json({ error: 'Overpass no disponible', elements: [] });
}
