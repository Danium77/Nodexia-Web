// pages/api/viajes/actualizar-estado.ts
// API para actualizar estado de viajes con permisos de service role

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

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

    // Verificar que el viaje está asignado a este chofer
    const { data: chofer } = await supabase
      .from('choferes')
      .select('id')
      .eq('user_id', user_id)
      .single();

    if (!chofer) {
      return res.status(403).json({ error: 'Chofer no encontrado' });
    }

    const { data: viaje } = await supabase
      .from('viajes_despacho')
      .select('id, id_chofer')
      .eq('id', viaje_id)
      .single();

    if (!viaje || viaje.id_chofer !== chofer.id) {
      return res.status(403).json({ error: 'No autorizado para actualizar este viaje' });
    }

    // Usar el sistema de estados duales - actualizar estado_unidad_viaje
    const { data, error } = await supabase
      .rpc('actualizar_estado_unidad', {
        p_viaje_id: viaje_id,
        p_nuevo_estado: nuevo_estado,
        p_user_id: user_id,
        p_observaciones: null
      });

    if (error) throw error;

    return res.status(200).json({ 
      success: true, 
      data,
      message: `Estado actualizado a: ${nuevo_estado}` 
    });

  } catch (error: any) {
    console.error('Error actualizando estado:', error);
    return res.status(500).json({ 
      error: error.message || 'Error al actualizar estado del viaje' 
    });
  }
}
