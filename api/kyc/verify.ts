import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { documentoId, aprobado, notas, adminId } = req.body;

    if (!documentoId || aprobado === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Obtener documento
    const { data: doc } = await supabase
      .from('documentos')
      .select('usuario_id')
      .eq('id', documentoId)
      .single();

    if (!doc) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    // Actualizar documento
    await supabase
      .from('documentos')
      .update({
        estado: aprobado ? 'aprobado' : 'rechazado',
        notas,
        revisor_id: adminId,
        revisado_at: new Date().toISOString(),
      })
      .eq('id', documentoId);

    // Si está aprobado, verificar si todos los documentos están aprobados
    if (aprobado) {
      const { data: docs } = await supabase
        .from('documentos')
        .select('estado')
        .eq('usuario_id', doc.usuario_id);

      const allApproved = docs?.every((d) => d.estado === 'aprobado');

      if (allApproved) {
        // Activar usuario
        await supabase
          .from('usuarios')
          .update({ activo: true })
          .eq('id', doc.usuario_id);

        // Crear notificación
        await supabase.from('notificaciones').insert({
          usuario_id: doc.usuario_id,
          tipo: 'kyc_aprobado',
          titulo: '¡Bienvenido a U.GO!',
          mensaje: 'Tu perfil ha sido verificado y aprobado.',
          leido: false,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: aprobado ? 'Documento aprobado' : 'Documento rechazado',
    });
  } catch (error) {
    console.error('KYC verify error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
