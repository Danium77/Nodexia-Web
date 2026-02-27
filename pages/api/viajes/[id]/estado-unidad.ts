// pages/api/viajes/[id]/estado-unidad.ts
// API para actualizar el estado del viaje
// Delega a ViajeEstadoService

import { withAuth } from '../../../../lib/middleware/withAuth';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { cambiarEstadoViaje } from '../../../../lib/services/viajeEstado';
import { notificarCambioEstado } from '../../../../lib/services/notificaciones';
import type { EstadoViajeType } from '../../../../lib/estados';

export default withAuth(async (req, res, authCtx) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { id: viajeId } = req.query;
  const { nuevo_estado, observaciones } = req.body;
  const user_id = authCtx.userId;

  if (!viajeId || !nuevo_estado) {
    return res.status(400).json({
      exitoso: false,
      mensaje: 'Parámetros faltantes: nuevo_estado es requerido'
    });
  }

  try {
    const result = await cambiarEstadoViaje(supabaseAdmin, {
      viaje_id: viajeId as string,
      nuevo_estado: nuevo_estado as EstadoViajeType,
      user_id,
      observaciones,
    });

    if (!result.exitoso) {
      return res.status(400).json(result);
    }

    // Notificar al chofer
    await notificarCambioEstado(supabaseAdmin, viajeId as string, nuevo_estado as EstadoViajeType);

    return res.status(200).json(result);

  } catch (error: unknown) {
    console.error('Error inesperado:', error);
    return res.status(500).json({
      exitoso: false,
      mensaje: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}, { roles: ['supervisor', 'coordinador', 'control_acceso', 'admin_nodexia'] });
