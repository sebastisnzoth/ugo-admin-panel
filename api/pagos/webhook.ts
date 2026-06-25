import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // MP envía datos por query params en webhook
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(200).json({ received: true }); // Responder 200 para que MP no reintente
  }

  try {
    const { id, type } = req.query;

    if (type !== 'payment') {
      return res.status(200).json({ received: true });
    }

    if (!id) {
      return res.status(200).json({ received: true });
    }

    // Obtener detalles del pago desde MP API
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
    });

    if (!mpResponse.ok) {
      console.error('Error consultando MP:', await mpResponse.json());
      return res.status(200).json({ received: true });
    }

    const paymentData = await mpResponse.json();
    const { status, external_reference: servicioId } = paymentData;

    if (!servicioId) {
      return res.status(200).json({ received: true });
    }

    // Buscar pago en DB
    const { data: pagos } = await sb
      .from('pagos')
      .select('*')
      .eq('servicio_id', servicioId)
      .order('fecha_creacion', { ascending: false })
      .limit(1);

    if (!pagos || pagos.length === 0) {
      return res.status(200).json({ received: true });
    }

    const pago = pagos[0];

    // Actualizar estado del pago
    let nuevoEstado = 'pendiente';
    if (status === 'approved') nuevoEstado = 'confirmado';
    else if (status === 'rejected' || status === 'cancelled') nuevoEstado = 'fallido';

    const { error: updateError } = await sb
      .from('pagos')
      .update({
        estado: nuevoEstado,
        mp_status: status,
        mp_payment_id: id,
        fecha_confirmacion: status === 'approved' ? new Date().toISOString() : null,
      })
      .eq('id', pago.id);

    if (updateError) {
      console.error('Error actualizando pago:', updateError);
      return res.status(200).json({ received: true });
    }

    // Si fue aprobado, actualizar estado del servicio
    if (status === 'approved') {
      await sb
        .from('servicios')
        .update({
          estado: 'confirmado',
          confirmado_at: new Date().toISOString(),
        })
        .eq('id', servicioId);

      // Notificar al proveedor
      await sb
        .from('notificaciones')
        .insert({
          usuario_id: pago.proveedor_id,
          tipo: 'pago_confirmado',
          titulo: 'Pago confirmado',
          cuerpo: `Pago de R$ ${pago.monto_total} confirmado para servicio #${servicioId}`,
          datos: {
            servicio_id: servicioId,
            monto: pago.monto_total,
          },
        });
    }

    res.status(200).json({ received: true, updated: true });
  } catch (error: any) {
    console.error('Error en webhook:', error);
    res.status(200).json({ received: true }); // Siempre responder 200 a MP
  }
}
