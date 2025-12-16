// pages/api/viajes/[id]/estado-unidad.ts
// API para actualizar el estado de la unidad (chofer + camión)

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

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

  // Validar parámetros
  if (!viajeId || !nuevo_estado || !user_id) {
    return res.status(400).json({
      error: 'Parámetros faltantes',
      requeridos: ['nuevo_estado', 'user_id']
    });
  }

  try {
    // Llamar a función SQL que valida permisos y actualiza
    const { data, error } = await supabase.rpc('actualizar_estado_unidad', {
      p_viaje_id: viajeId,
      p_nuevo_estado: nuevo_estado,
      p_user_id: user_id,
      p_observaciones: observaciones || null
    });

    if (error) {
      console.error('Error actualizando estado unidad:', error);
      return res.status(400).json({
        exitoso: false,
        mensaje: error.message,
        error: error.details || error.hint
      });
    }

    // data es un array con un objeto { exitoso, mensaje, estado_anterior, estado_nuevo }
    const resultado = data[0];

    if (!resultado.exitoso) {
      return res.status(403).json(resultado);
    }

    // Obtener próximos estados válidos
    const { data: proximosEstados } = await supabase.rpc(
      'obtener_proximos_estados_unidad',
      { p_estado_actual: resultado.estado_nuevo }
    );

    return res.status(200).json({
      ...resultado,
      proximos_estados: proximosEstados || []
    });

  } catch (error: any) {
    console.error('Error inesperado:', error);
    return res.status(500).json({
      exitoso: false,
      mensaje: 'Error interno del servidor',
      error: error.message
    });
  }
}
