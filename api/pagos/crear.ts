import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // Admin key para operaciones server-side
);

const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN!;
void process.env.MERCADO_PAGO_PUBLIC_KEY; // referenced in client-side MP init

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { servicioId, montoTotal, clienteId, proveedorId } = req.body;

    if (!servicioId || !montoTotal || !clienteId || !proveedorId) {
      return res.status(400).json({ error: 'Faltan parámetros' });
    }

    // Calcular comisión U.GO (15%)
    const comisionUgo = Math.round(montoTotal * 0.15 * 100) / 100;
    const montoProveedor = Math.round((montoTotal - comisionUgo) * 100) / 100;

    // Crear preference en Mercado Pago
    const preference = {
      items: [
        {
          title: `Servicio #${servicioId}`,
          description: 'Pago de servicio U.GO',
          quantity: 1,
          currency_id: 'ARS',
          unit_price: montoTotal,
        },
      ],
      payer: {
        email: 'cliente@ugo.com', // Idealmente traer del cliente
      },
      payment_methods: {
        excluded_payment_types: [{ id: 'atm' }],
      },
      back_urls: {
        success: `${process.env.VERCEL_URL}/client.html?pago=confirmado&svc=${servicioId}`,
        failure: `${process.env.VERCEL_URL}/client.html?pago=fallido&svc=${servicioId}`,
        pending: `${process.env.VERCEL_URL}/client.html?pago=pendiente&svc=${servicioId}`,
      },
      notification_url: `${process.env.VERCEL_URL}/api/pagos/webhook`,
      auto_return: 'approved',
      external_reference: servicioId,
    };

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    if (!mpResponse.ok) {
      const error = await mpResponse.json();
      return res.status(400).json({ error: 'Error en Mercado Pago', details: error });
    }

    const mpData = await mpResponse.json();
    const preferenceId = mpData.id;
    const initPoint = mpData.init_point;

    // Guardar pago en DB
    const { data: pago, error: dbError } = await sb
      .from('pagos')
      .insert({
        servicio_id: servicioId,
        cliente_id: clienteId,
        proveedor_id: proveedorId,
        monto_total: montoTotal,
        comision_ugo: comisionUgo,
        monto_proveedor: montoProveedor,
        estado: 'iniciado',
        mp_preference_id: preferenceId,
      })
      .select()
      .single();

    if (dbError) {
      return res.status(500).json({ error: 'Error al guardar pago', details: dbError });
    }

    res.status(200).json({
      success: true,
      pagoId: pago.id,
      preferenceId,
      initPoint, // URL para redirigir al usuario a pagar
      montoTotal,
      comisionUgo,
      montoProveedor,
    });
  } catch (error: any) {
    console.error('Error en crear pago:', error);
    res.status(500).json({ error: error.message });
  }
}
