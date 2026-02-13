// pages/api/gps/registrar-ubicacion.ts
// API endpoint para recibir y almacenar ubicaciones GPS de choferes

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Verificar autenticación: preferir Bearer token, fallback a cookies
    let userId: string | null = null;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    // Fallback: intentar cookies con createServerSupabaseClient
    if (!userId) {
      const supabase = createServerSupabaseClient({ req, res });
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        userId = session.user.id;
      }
    }

    if (!userId) {
      return res.status(401).json({ error: 'No autorizado' });
    }

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
    console.log('🔍 Buscando viaje:', viaje_id);
    const { data: viajeData, error: viajeError } = await supabaseAdmin
      .from('viajes_despacho')
      .select('chofer_id, numero_viaje, estado')
      .eq('id', viaje_id)
      .single();

    if (viajeError || !viajeData) {
      console.error('❌ Viaje no encontrado:', { viaje_id, error: viajeError });
      return res.status(404).json({ 
        error: 'Viaje no encontrado', 
        viaje_id,
        details: viajeError?.message 
      });
    }

    console.log('✅ Viaje encontrado:', viajeData);

    const chofer_id = viajeData.chofer_id;

    if (!chofer_id) {
      console.error('Viaje sin chofer asignado:', viaje_id);
      return res.status(400).json({ error: 'El viaje no tiene chofer asignado', viaje_id });
    }

    console.log(`📍 Procesando GPS - Viaje: ${viajeData.numero_viaje}, Estado: ${viajeData.estado}, Chofer: ${chofer_id}`);

    // Verificar que el usuario autenticado sea el chofer del viaje
    if (userId) {
      const { data: choferData, error: choferError } = await supabaseAdmin
        .from('choferes')
        .select('email')
        .eq('id', chofer_id)
        .single();

      if (choferError || !choferData) {
        console.error('❌ Error obteniendo chofer:', choferError);
        return res.status(403).json({ error: 'No autorizado', details: 'Chofer no encontrado' });
      }

      // Obtener email del usuario autenticado
      const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(userId);
      const userEmail = authUser?.email;

      if (userEmail && choferData.email !== userEmail) {
        console.error('❌ Email mismatch:', { chofer: choferData.email, user: userEmail });
        return res.status(403).json({ 
          error: 'No puedes enviar ubicación de un viaje que no es tuyo',
          details: `Viaje asignado a ${choferData.email}, pero sesión es ${userEmail}`
        });
      }
      
      console.log('✅ Auth OK:', userEmail || userId);
    }

    // Insertar ubicación en la base de datos usando admin client
    console.log('💾 Insertando ubicación en BD...', {
      chofer_id,
      viaje_id,
      latitude,
      longitude,
      velocidad
    });
    
    const { data: ubicacionData, error: ubicacionError } = await supabaseAdmin
      .from('ubicaciones_choferes')
      .insert({
        chofer_id: chofer_id,
        viaje_id: viaje_id,
        latitude: latitude,
        longitude: longitude,
        accuracy: accuracy,
        altitude: altitude,
        velocidad: velocidad,
        heading: heading,
        bateria: bateria,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (ubicacionError) {
      console.error('❌ Error insertando ubicación:', {
        error: ubicacionError,
        code: ubicacionError.code,
        message: ubicacionError.message,
        details: ubicacionError.details,
        hint: ubicacionError.hint
      });
      return res.status(500).json({ 
        error: 'Error al guardar ubicación', 
        details: ubicacionError.message,
        code: ubicacionError.code
      });
    }

    // Log para debugging
    console.log(`✅ GPS registrado - Viaje: ${viaje_id}, Lat: ${latitude}, Lng: ${longitude}, Vel: ${velocidad} km/h`);

    return res.status(200).json({
      success: true,
      message: 'Ubicación registrada correctamente',
      data: {
        id: ubicacionData.id,
        timestamp: ubicacionData.timestamp,
        viaje_id: viaje_id
      }
    });

  } catch (error: any) {
    console.error('Error en registrar-ubicacion:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      details: error.message 
    });
  }
}
