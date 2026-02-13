// pages/api/viajes/actualizar-estado.ts
// API LEGACY para actualizar estado de viajes desde chofer-mobile
// Ahora delega a ViajeEstadoService (con validación de transiciones)

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { cambiarEstadoViaje, verificarChoferViaje } from '../../../lib/services/viajeEstado';
import { notificarCambioEstado } from '../../../lib/services/notificaciones';
import type { EstadoViajeType } from '../../../lib/estados';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { viaje_id, nuevo_estado, user_id } = req.body;

    if (!viaje_id || !nuevo_estado || !user_id) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    // Verificar que el chofer está autorizado para este viaje
    const auth = await verificarChoferViaje(supabase, user_id, viaje_id);
    if (!auth.valido) {
      return res.status(403).json({ error: auth.mensaje });
    }

    // Delegar al servicio centralizado (incluye validación de transición + sync despacho)
    const result = await cambiarEstadoViaje(supabase, {
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
    await notificarCambioEstado(supabase, viaje_id, nuevo_estado as EstadoViajeType);

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
}
