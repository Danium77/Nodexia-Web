// pages/api/viajes/[id]/gps.ts
// API para registrar ubicación GPS del chofer

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
  const {
    latitud,
    longitud,
    velocidad_kmh,
    precision_metros,
    rumbo_grados,
    user_id,
    dispositivo_info
  } = req.body;

  // Validar parámetros obligatorios
  if (!viajeId || !latitud || !longitud || !user_id) {
    return res.status(400).json({
      error: 'Parámetros faltantes',
      requeridos: ['latitud', 'longitud', 'user_id']
    });
  }

  try {
    // Obtener chofer_id del user_id
    const { data: chofer, error: errorChofer } = await supabase
      .from('choferes')
      .select('id')
      .eq('user_id', user_id)
      .single();

    if (errorChofer || !chofer) {
      return res.status(404).json({
        error: 'Chofer no encontrado',
        mensaje: 'El usuario no está asociado a un chofer'
      });
    }

    // Registrar ubicación
    const { data: ubicacionId, error } = await supabase.rpc(
      'registrar_ubicacion_gps',
      {
        p_viaje_id: viajeId,
        p_chofer_id: chofer.id,
        p_latitud: latitud,
        p_longitud: longitud,
        p_velocidad_kmh: velocidad_kmh || null,
        p_precision_metros: precision_metros || null,
        p_rumbo_grados: rumbo_grados || null,
        p_dispositivo_info: dispositivo_info || null
      }
    );

    if (error) {
      console.error('Error registrando ubicación:', error);
      return res.status(400).json({
        error: error.message,
        details: error.details || error.hint
      });
    }

    return res.status(200).json({
      exitoso: true,
      ubicacion_id: ubicacionId,
      mensaje: 'Ubicación registrada correctamente'
    });

  } catch (error: any) {
    console.error('Error inesperado:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      mensaje: error.message
    });
  }
}
