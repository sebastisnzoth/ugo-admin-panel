// api/proxy.js
// Retained only for the authenticated Admin create-user bridge.
// Legacy AI proxying was retired: Hugo now uses the canonical TEST path.

import { createClient } from '@supabase/supabase-js';

const OFFICIAL_URL = 'https://tmossnqfwfwjrtzwcbmm.supabase.co';
const SERVICE_KEY = process.env.UGO_TEST_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

function bearer(req) {
  const raw = String(req.headers?.authorization || '');
  return raw.startsWith('Bearer ') ? raw.slice(7).trim() : '';
}

async function adminCreateUser(req, res) {
  if (!SERVICE_KEY) return res.status(503).json({ error: 'UGO TEST service key no configurada.' });
  const token = bearer(req);
  if (!token) return res.status(401).json({ error: 'Sesión Admin requerida.' });
  const admin = createClient(OFFICIAL_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  let createdUserId = null;
  try {
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return res.status(401).json({ error: 'Sesión inválida o vencida.' });
    const { data: caller, error: callerError } = await admin.from('usuarios').select('tipo,activo').eq('id', authData.user.id).maybeSingle();
    if (callerError) throw callerError;
    if (!caller?.activo || !['admin','superadmin'].includes(String(caller.tipo))) return res.status(403).json({ error: 'Sólo administradores pueden crear usuarios.' });

    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const nombre = String(req.body?.nombre || '').trim();
    const apellido = String(req.body?.apellido || '').trim() || null;
    const role = String(req.body?.role || 'cliente');
    const demo = Boolean(req.body?.demo);
    const providerVerified = Boolean(req.body?.providerVerified);

    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Email inválido.' });
    if (password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido.' });
    if (!['cliente','proveedor','admin','superadmin'].includes(role)) return res.status(400).json({ error: 'Rol inválido.' });
    if (['admin','superadmin'].includes(role) && caller.tipo !== 'superadmin') return res.status(403).json({ error: 'Sólo Super Admin puede crear administradores.' });

    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre, apellido, tipo: role, source: 'ugo-admin-panel', demo },
    });
    if (created.error || !created.data.user) throw created.error || new Error('No se pudo crear el usuario Auth.');
    createdUserId = created.data.user.id;

    const { error: userError } = await admin.from('usuarios').upsert({
      id: createdUserId,
      nombre,
      apellido,
      tipo: role,
      activo: true,
      pais: 'BR',
      email,
      es_demo: demo,
    }, { onConflict: 'id' });
    if (userError) throw userError;

    if (role === 'cliente') {
      const { error } = await admin.from('perfiles_cliente').upsert({ usuario_id: createdUserId, ciudad: 'Florianópolis' }, { onConflict: 'usuario_id' });
      if (error) throw error;
    }

    if (role === 'proveedor') {
      const verified = demo && providerVerified;
      const { error } = await admin.from('perfiles_proveedor').upsert({
        usuario_id: createdUserId,
        ciudad_base: 'Florianópolis',
        estado_verificacion: verified ? 'verificado' : 'registrado',
        online: verified,
        disponible: verified,
        onboarding_paso: verified ? 15 : 0,
        onboarding_completo_at: verified ? new Date().toISOString() : null,
      }, { onConflict: 'usuario_id' });
      if (error) throw error;
    }

    return res.status(200).json({
      ok: true,
      user: {
        id: createdUserId,
        email,
        nombre,
        apellido,
        role,
        demo,
        providerVerified: role === 'proveedor' && demo && providerVerified,
      },
    });
  } catch (error) {
    if (createdUserId) await admin.auth.admin.deleteUser(createdUserId).catch(() => undefined);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'No se pudo crear el usuario.' });
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type,authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminCreate = String(req.query?.admin_create_user || '') === '1' || String(req.body?.action || '') === 'admin_create_user';
  if (adminCreate) return adminCreateUser(req, res);

  return res.status(410).json({
    error: 'Legacy AI proxy retired.',
    code: 'UGO_LEGACY_AI_PROXY_RETIRED',
    recovery: 'Use the canonical Hugo TEST endpoint.',
  });
}
