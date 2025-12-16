// pages/api/gps/ubicaciones-historicas.ts
// API endpoint para obtener historial de ubicaciones GPS de un viaje

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { viaje_id } = req.query;

    if (!viaje_id || typeof viaje_id !== 'string') {
      return res.status(400).json({ error: 'viaje_id es requerido' });
    }

    // Obtener todas las ubicaciones históricas del viaje, ordenadas por timestamp
    const { data: ubicaciones, error: ubicacionesError } = await supabaseAdmin
      .from('ubicaciones_choferes')
      .select(`
        id,
        latitude,
        longitude,
        accuracy,
        velocidad,
        heading,
        timestamp,
        created_at
      `)
      .eq('viaje_id', viaje_id)
      .order('timestamp', { ascending: true });

    if (ubicacionesError) {
      console.error('Error obteniendo ubicaciones históricas:', ubicacionesError);
      return res.status(500).json({ error: 'Error al obtener ubicaciones' });
    }

    return res.status(200).json({
      viaje_id,
      total_ubicaciones: ubicaciones?.length || 0,
      ubicaciones: ubicaciones || []
    });

  } catch (error: any) {
    console.error('Error en ubicaciones-historicas:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
