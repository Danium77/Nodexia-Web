// pages/api/viajes/[id]/estado-unidad.ts
// API para actualizar el estado del viaje
// Delega a ViajeEstadoService

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { cambiarEstadoViaje } from '../../../../lib/services/viajeEstado';
import { notificarCambioEstado } from '../../../../lib/services/notificaciones';
import type { EstadoViajeType } from '../../../../lib/estados';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { id: viajeId } = req.query;
  const { nuevo_estado, observaciones, user_id } = req.body;

  if (!viajeId || !nuevo_estado || !user_id) {
    return res.status(400).json({
      exitoso: false,
      mensaje: 'Parámetros faltantes: nuevo_estado y user_id son requeridos'
    });
  }

  try {
    const result = await cambiarEstadoViaje(supabase, {
      viaje_id: viajeId as string,
      nuevo_estado: nuevo_estado as EstadoViajeType,
      user_id,
      observaciones,
    });

    if (!result.exitoso) {
      return res.status(400).json(result);
    }

    // Notificar al chofer
    await notificarCambioEstado(supabase, viajeId as string, nuevo_estado as EstadoViajeType);

    return res.status(200).json(result);

  } catch (error: unknown) {
    console.error('Error inesperado:', error);
    return res.status(500).json({
      exitoso: false,
      mensaje: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
