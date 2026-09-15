// Legacy endpoint retained only as an explicit tombstone.
// UGO matching is backend-authoritative through iniciar_matching /
// iniciar_matching_dirigido in the official TEST Supabase project.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type,authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  return res.status(410).json({
    error: 'Legacy cascade matching retired.',
    code: 'UGO_LEGACY_CASCADE_RETIRED',
    recovery: 'Use the canonical authenticated matching flow.',
  });
}
