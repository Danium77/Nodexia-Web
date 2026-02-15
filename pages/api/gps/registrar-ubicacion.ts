// pages/api/gps/registrar-ubicacion.ts
// API endpoint para recibir y almacenar ubicaciones GPS de choferes

import type { NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/middleware/withAuth';

interface UbicacionRequest {
  viaje_id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  velocidad: number;
  heading?: number | null;
  bateria?: number | null;
}

export default withAuth(async (req, res, { userId }) => {
  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Extraer datos del body
    const {
      viaje_id,
      latitude,
      longitude,
      accuracy,
      altitude,
      velocidad,
      heading,
      bateria
    }: UbicacionRequest = req.body;

    // Validar datos requeridos
    if (!viaje_id || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ 
        error: 'Datos inválidos', 
        details: 'viaje_id, latitude y longitude son requeridos' 
      });
    }

    // Validar rangos de coordenadas
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({ error: 'Latitud inválida (debe estar entre -90 y 90)' });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Longitud inválida (debe estar entre -180 y 180)' });
    }

    // Obtener chofer_id desde el viaje usando admin client (bypasea RLS)
    const { data: viajeData, error: viajeError } = await supabaseAdmin
      .from('viajes_despacho')
      .select('chofer_id, numero_viaje, estado')
      .eq('id', viaje_id)
      .single();

    if (viajeError || !viajeData) {
      return res.status(404).json({ 
        error: 'Viaje no encontrado', 
        viaje_id,
        details: viajeError?.message 
      });
    }

    const chofer_id = viajeData.chofer_id;

    if (!chofer_id) {
      return res.status(400).json({ error: 'El viaje no tiene chofer asignado', viaje_id });
    }

    // Verificar que el usuario autenticado sea el chofer del viaje
    const { data: choferData, error: choferError } = await supabaseAdmin
      .from('choferes')
      .select('id, usuario_id')
      .eq('id', chofer_id)
      .single();

    if (choferError || !choferData) {
      return res.status(403).json({ error: 'No autorizado', details: 'Chofer no encontrado' });
    }

    // Verificar por usuario_id (vinculación directa chofer ↔ auth user)
    if (choferData.usuario_id !== userId) {
      return res.status(403).json({ 
        error: 'No puedes enviar ubicación de un viaje que no es tuyo'
      });
    }

    // Insertar ubicación en la base de datos usando admin client
    const { data: ubicacionData, error: ubicacionError } = await supabaseAdmin
      .from('ubicaciones_choferes')
      .insert({
        chofer_id,
        viaje_id,
        latitude,
        longitude,
        accuracy,
        altitude,
        velocidad,
        heading,
        bateria,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (ubicacionError) {
      return res.status(500).json({ 
        error: 'Error al guardar ubicación', 
        details: ubicacionError.message,
        code: ubicacionError.code
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Ubicación registrada correctamente',
      data: {
        id: ubicacionData.id,
        timestamp: ubicacionData.timestamp,
        viaje_id
      }
    });

  } catch (error: any) {
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      details: error.message 
    });
  }
});
