// api/whatsapp/send.js
// Envía mensajes via WhatsApp Business API (Meta Graph)
// Keys cargadas desde Supabase config_sistema

import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://byajcqrgetloavrgyqak.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs'
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { to, message, prospecto_id } = req.body;
  if (!to || !message) return res.status(400).json({ error: 'to y message requeridos' });

  const phone = to.replace(/\D/g, '');
  if (phone.length < 10) return res.status(400).json({ error: 'Número inválido' });

  try {
    const { data: cfgRows } = await sb.from('config_sistema').select('clave,valor')
      .in('clave', ['whatsapp_access_token', 'whatsapp_phone_number_id']);
    const cfg = {};
    (cfgRows || []).forEach(r => { cfg[r.clave] = r.valor; });

    const token   = cfg['whatsapp_access_token'];
    const phoneId = cfg['whatsapp_phone_number_id'];

    if (!token || !phoneId) {
      return res.status(503).json({ error: 'WhatsApp no configurado en config_sistema.' });
    }

    const r = await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message, preview_url: false },
      }),
      signal: AbortSignal.timeout(12000),
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.error?.message || `Meta ${r.status}`, details: data.error });

    // Registrar en Supabase
    if (prospecto_id) {
      await sb.from('invitaciones_scout').insert({
        prospecto_id, canal: 'whatsapp', estado: 'enviada',
        mensaje_hugo: message, fecha_envio: new Date().toISOString(),
      }).catch(() => {});
      await sb.from('prospectos_scouts').update({ estado: 'invitado' }).eq('id', prospecto_id).catch(() => {});
    }

    return res.json({ ok: true, message_id: data.messages?.[0]?.id, to: phone });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
