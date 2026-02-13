// pages/api/location/update.ts
/**
 * API para actualizar ubicación del chofer en tiempo real
 * El chofer envía su ubicación desde la app móvil cada X minutos
 */

import type { NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/middleware/withAuth';

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

export default withAuth(async (req, res, { userId }) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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
    const { data: chofer, error: choferError } = await supabaseAdmin
      .from('choferes')
      .select('id, email')
      .eq('id', locationData.chofer_id)
      .single();

    if (choferError || !chofer) {
      return res.status(404).json({ error: 'Chofer no encontrado' });
    }

    // Obtener email del usuario autenticado
    const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(userId);

    // Verificar que el usuario autenticado es el chofer
    if (authUser?.email !== chofer.email) {
      // O verificar si es coordinador/admin
      const { data: userRole } = await supabaseAdmin
        .from('usuarios_empresa')
        .select('rol_interno')
        .eq('user_id', userId)
        .single();

      const isAuthorized = userRole && ['coordinador', 'admin_nodexia', 'supervisor'].includes(userRole.rol_interno);

      if (!isAuthorized) {
        return res.status(403).json({ error: 'No autorizado para actualizar esta ubicación' });
      }
    }

    // Insertar ubicación
    const { data, error } = await supabaseAdmin
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
      return res.status(500).json({ error: 'Error al guardar ubicación', details: error.message });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Ubicación actualizada correctamente',
      data 
    });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});
