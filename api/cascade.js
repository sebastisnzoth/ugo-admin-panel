// api/cascade.js — Nivel 2 y 3 del matching en cascada
// Llamado por el cliente después de 90s sin aceptación

import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://byajcqrgetloavrgyqak.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs'
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
      .select('id,estado,categoria_id,lat_cliente,lng_cliente,tarifa,descripcion')
      .eq('id', servicio_id).single();

    if (!svc || svc.estado !== 'negociando' || svc.proveedor_id) {
      return res.json({ ok: true, msg: 'Servicio ya tiene proveedor o fue cancelado' });
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

    // Obtener token WA y proxy AI
    const { data: cfgRows } = await sb.from('config_sistema')
      .select('clave,valor')
      .in('clave', ['whatsapp_access_token','whatsapp_phone_number_id','api_groq_key']);
    const cfg = {};
    (cfgRows||[]).forEach(r => cfg[r.clave] = r.valor);

    const tarifa    = svc.tarifa || 80;
    const ganancia  = +(tarifa * 0.85).toFixed(0);
    const emoji     = cat?.emoji || '🔧';
    const catNombre = cat?.nombre || catSlug;

    // Insertar notificaciones in-app para todos
    await sb.from('notificaciones').insert(
      nearby.map(p => ({
        usuario_id: p.id,
        tipo: 'nuevo_pedido',
        titulo: `${emoji} Nuevo pedido · ${catNombre}`,
        cuerpo: `R$${tarifa} · Ganancia R$${ganancia} · ${haversineKm(svc.lat_cliente, svc.lng_cliente, p.lat, p.lng).toFixed(1)}km`,
        datos: {
          servicio_id: svc.id,
          tarifa, ganancia, categoria: catSlug,
          lat_cliente: svc.lat_cliente, lng_cliente: svc.lng_cliente,
        },
        leida: false,
      }))
    );

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
