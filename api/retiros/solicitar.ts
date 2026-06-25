import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { proveedorId, monto, cuentaBanco } = req.body;

    if (!proveedorId || !monto || !cuentaBanco) {
      return res.status(400).json({ error: 'Faltan parámetros' });
    }

    if (monto < 50) {
      return res.status(400).json({ error: 'Monto mínimo: R$ 50' });
    }

    // Verificar que el proveedor tenga saldo disponible
    const { data: pagos } = await sb
      .from('pagos')
      .select('monto_proveedor')
      .eq('proveedor_id', proveedorId)
      .eq('estado', 'confirmado');

    const saldoDisponible = (pagos || []).reduce((a, p) => a + (p.monto_proveedor || 0), 0);

    if (saldoDisponible < monto) {
      return res.status(400).json({
        error: 'Saldo insuficiente',
        saldoDisponible,
        requested: monto,
      });
    }

    // Crear transferencia en Mercado Pago (usando API de transfers)
    // NOTA: En SANDBOX esto es simulado. En PRODUCCIÓN necesitas receiver_id real
    const transferData = {
      external_reference: `retiro_${proveedorId}_${Date.now()}`,
      amount: monto,
      description: `Retiro U.GO - Proveedor ${proveedorId}`,
      receiver_id: process.env.MERCADO_PAGO_RECEIVER_ID || 123456789, // Usar account_money o receiver_id real
    };

    // En sandbox, simplemente crear registro de retiro
    // En producción, hacer transfer a través de MP
    const mpTransferId = `SANDBOX_${Date.now()}`;

    // Guardar retiro en DB
    const { data: retiro, error: dbError } = await sb
      .from('retiros')
      .insert({
        proveedor_id: proveedorId,
        monto,
        estado: 'procesando',
        mp_transfer_id: mpTransferId,
        cuenta_banco: cuentaBanco,
      })
      .select()
      .single();

    if (dbError) {
      return res.status(500).json({ error: 'Error al crear retiro', details: dbError });
    }

    // En sandbox, confirmar automáticamente
    if (process.env.NODE_ENV === 'development') {
      setTimeout(async () => {
        await sb
          .from('retiros')
          .update({
            estado: 'completado',
            fecha_completacion: new Date().toISOString(),
          })
          .eq('id', retiro.id);
      }, 2000);
    }

    res.status(200).json({
      success: true,
      retiroId: retiro.id,
      monto,
      estado: 'procesando',
      mensaje: 'Tu retiro está siendo procesado. Se acreditará en 1-2 días hábiles.',
    });
  } catch (error: any) {
    console.error('Error en solicitar retiro:', error);
    res.status(500).json({ error: error.message });
  }
}
