// api/cascade.js — Nivel 2 y 3 del matching en cascada
// Llamado por el cliente después de 90s sin aceptación

import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://byajcqrgetloavrgyqak.supabase.co',
  'sb_publishable_wAkmRZHwX9ddcZ-zNZSyXw_EH1f1iGZ'
);

function haversineKm(la1,ln1,la2,ln2) {
  const R=6371,dL=(la2-la1)*Math.PI/180,dN=(ln2-ln1)*Math.PI/180;
  const a=Math.sin(dL/2)**2+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dN/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { servicio_id, nivel = 2 } = req.body;
  if (!servicio_id) return res.status(400).json({ error: 'servicio_id requerido' });

  try {
    // Verificar que el servicio sigue sin proveedor
    const { data: svc } = await sb.from('servicios')
      .select('id,estado,proveedor_id,categoria_id,lat_cliente,lng_cliente,tarifa,descripcion')
      .eq('id', servicio_id).single();

    if (!svc || svc.estado !== 'negociando' || svc.proveedor_id) {
      return res.json({ ok: true, msg: 'Servicio ya tiene proveedor o fue cancelado' });
    }
    if (!svc.categoria_id || svc.lat_cliente == null || svc.lng_cliente == null) {
      return res.json({ ok: true, notified: 0, nivel, msg: 'Servicio sin categoría o sin ubicación: no se puede expandir' });
    }

    // Configuración por nivel
    const radiusKm = nivel === 2 ? 10 : 20;
    const limit    = nivel === 2 ? 5  : 20;
    const onlineFilter = nivel === 2; // nivel 2: solo offline, nivel 3: todos

    // Buscar categoría slug
    const { data: cat } = await sb.from('categorias')
      .select('slug,nombre,emoji').eq('id', svc.categoria_id).single();
    const catSlug = cat?.slug || '';

    // Buscar proveedores por categoría
    let query = sb.from('usuarios')
      .select('id,nombre,telefono,lat,lng,karma')
      .eq('tipo', 'proveedor')
      .eq('activo', true)
      .eq('categoria', catSlug)
      .not('lat', 'is', null)
      .not('telefono', 'is', null)
      .limit(50);

    if (onlineFilter) query = query.eq('online', false); // nivel 2: solo offline

    const { data: candidates } = await query;
    if (!candidates?.length) return res.json({ ok: true, notified: 0, nivel });

    // Filtrar por distancia
    const nearby = candidates
      .filter(p => {
        if (!p.lat || !p.lng) return false;
        return haversineKm(svc.lat_cliente, svc.lng_cliente, p.lat, p.lng) <= radiusKm;
      })
      .sort((a, b) => {
        const da = haversineKm(svc.lat_cliente, svc.lng_cliente, a.lat, a.lng);
        const db = haversineKm(svc.lat_cliente, svc.lng_cliente, b.lat, b.lng);
        return da - db;
      })
      .slice(0, limit);

    if (!nearby.length) return res.json({ ok: true, notified: 0, nivel });

    // Obtener token WA y proxy AI (vía RPC: config_sistema ya no es legible por REST)
    const { data: cfgRows } = await sb.rpc('config_backend', {
      p_token: process.env.UGO_BACKEND_TOKEN || '',
      p_claves: ['whatsapp_access_token','whatsapp_phone_number_id','api_groq_key'],
    });
    const cfg = {};
    (cfgRows||[]).forEach(r => cfg[r.clave] = r.valor);

    const tarifa    = svc.tarifa || 80;
    const ganancia  = +(tarifa * 0.85).toFixed(0);
    const emoji     = cat?.emoji || '🔧';
    const catNombre = cat?.nombre || catSlug;

    // Notificaciones in-app vía RPC validado (INSERT directo ya no está permitido:
    // el contenido se deriva del servicio real y se deduplica server-side)
    await sb.rpc('notificar_nuevo_pedido', {
      p_servicio_id: svc.id,
      p_usuario_ids: nearby.map(p => p.id),
    });

    // WhatsApp a los que tienen teléfono (si tenemos token)
    let waSent = 0;
    if (cfg['whatsapp_access_token'] && cfg['whatsapp_phone_number_id']) {
      for (const p of nearby.slice(0, nivel === 2 ? 5 : 10)) {
        if (!p.telefono) continue;
        const distKm = haversineKm(svc.lat_cliente, svc.lng_cliente, p.lat, p.lng).toFixed(1);
        const msg = `${emoji} *Novo pedido U.GO para ${p.nombre}!*\n\n` +
          `Serviço: ${catNombre}\n` +
          `Distância: ~${distKm} km\n` +
          `Valor: R$${tarifa} • Ganância: R$${ganancia}\n\n` +
          `Abra o app para aceitar: https://ugo-admin-panel.vercel.app/provider.html`;

        try {
          await fetch(`https://graph.facebook.com/v22.0/${cfg['whatsapp_phone_number_id']}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${cfg['whatsapp_access_token']}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: p.telefono.replace(/\D/g, ''),
              type: 'text',
              text: { body: msg },
            }),
            signal: AbortSignal.timeout(8000),
          });
          waSent++;
        } catch (e) {
          console.warn('[Cascade WA]', e.message);
        }
      }
    }

    return res.json({ ok: true, nivel, notified: nearby.length, waSent });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
