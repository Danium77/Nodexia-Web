// pages/api/viajes/actualizar-estado.ts
// API para actualizar estado de viajes (chofer-mobile y otros)
// Delega a ViajeEstadoService (con validación de transiciones)

import { withAuth } from '../../../lib/middleware/withAuth';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { cambiarEstadoViaje, verificarChoferViaje } from '../../../lib/services/viajeEstado';
import { notificarCambioEstado } from '../../../lib/services/notificaciones';
import type { EstadoViajeType } from '../../../lib/estados';

export default withAuth(async (req, res, authCtx) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { viaje_id, nuevo_estado } = req.body;
    const user_id = authCtx.userId; // Del token, no del body

    if (!viaje_id || !nuevo_estado) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    // Verificar que el chofer está autorizado para este viaje
    const auth = await verificarChoferViaje(supabaseAdmin, user_id, viaje_id);
    if (!auth.valido) {
      return res.status(403).json({ error: auth.mensaje });
    }

    // Delegar al servicio centralizado (incluye validación de transición + sync despacho)
    const result = await cambiarEstadoViaje(supabaseAdmin, {
      viaje_id,
      nuevo_estado: nuevo_estado as EstadoViajeType,
      user_id,
    });

    if (!result.exitoso) {
      return res.status(400).json({
        error: result.mensaje,
        estado_anterior: result.estado_anterior,
        estado_nuevo: result.estado_nuevo,
      });
    }

    // Notificar al chofer del cambio
    await notificarCambioEstado(supabaseAdmin, viaje_id, nuevo_estado as EstadoViajeType);

    return res.status(200).json({
      success: true,
      data: result.data,
      message: result.mensaje,
    });

  } catch (error: unknown) {
    console.error('Error actualizando estado:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al actualizar estado del viaje'
    });
  }
});
