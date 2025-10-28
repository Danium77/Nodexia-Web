// pages/api/location/update.ts
/**
 * API para actualizar ubicación del chofer en tiempo real
 * El chofer envía su ubicación desde la app móvil cada X minutos
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

interface LocationUpdateRequest {
  chofer_id: string;
  viaje_id?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  velocidad?: number;
  heading?: number;
  bateria?: number;
  timestamp?: string; // ISO string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createPagesServerClient({ req, res });

    // Verificar autenticación
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const locationData: LocationUpdateRequest = req.body;

    // Validaciones básicas
    if (!locationData.chofer_id || !locationData.latitude || !locationData.longitude) {
      return res.status(400).json({ 
        error: 'Faltan datos requeridos: chofer_id, latitude, longitude' 
      });
    }

    // Validar rangos de coordenadas
    if (locationData.latitude < -90 || locationData.latitude > 90) {
      return res.status(400).json({ error: 'Latitud inválida' });
    }
    if (locationData.longitude < -180 || locationData.longitude > 180) {
      return res.status(400).json({ error: 'Longitud inválida' });
    }

    // Verificar que el usuario es el chofer o tiene permisos
    const { data: chofer, error: choferError } = await supabase
      .from('choferes')
      .select('id, email')
      .eq('id', locationData.chofer_id)
      .single();

    if (choferError || !chofer) {
      return res.status(404).json({ error: 'Chofer no encontrado' });
    }

    // Verificar que el usuario autenticado es el chofer
    if (session.user.email !== chofer.email) {
      // O verificar si es coordinador/admin
      const { data: userRole } = await supabase
        .from('usuarios_empresas')
        .select('roles_empresa(nombre)')
        .eq('user_id', session.user.id)
        .single();

      const isAuthorized = userRole?.roles_empresa?.some(
        (r: any) => ['coordinador_logistica', 'admin', 'super_admin'].includes(r.nombre)
      );

      if (!isAuthorized) {
        return res.status(403).json({ error: 'No autorizado para actualizar esta ubicación' });
      }
    }

    // Insertar ubicación
    const { data, error } = await supabase
      .from('ubicaciones_choferes')
      .insert({
        chofer_id: locationData.chofer_id,
        viaje_id: locationData.viaje_id || null,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy || null,
        altitude: locationData.altitude || null,
        velocidad: locationData.velocidad || null,
        heading: locationData.heading || null,
        bateria: locationData.bateria || null,
        timestamp: locationData.timestamp ? new Date(locationData.timestamp) : new Date(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error insertando ubicación:', error);
      return res.status(500).json({ error: 'Error al guardar ubicación', details: error.message });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Ubicación actualizada correctamente',
      data 
    });

  } catch (error) {
    console.error('Error en /api/location/update:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}
