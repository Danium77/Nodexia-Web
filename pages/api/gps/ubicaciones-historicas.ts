// pages/api/gps/ubicaciones-historicas.ts
// API endpoint para obtener historial de ubicaciones GPS de un viaje

import { withAuth } from '@/lib/middleware/withAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export default withAuth(async (req, res, authCtx) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { viaje_id } = req.query;

    if (!viaje_id || typeof viaje_id !== 'string') {
      return res.status(400).json({ error: 'viaje_id es requerido' });
    }

    // Verificar que el viaje pertenece a una empresa del usuario
    if (authCtx.empresaId && authCtx.rolInterno !== 'admin_nodexia') {
      const { data: viaje } = await supabaseAdmin
        .from('viajes_despacho')
        .select('id, despacho_id, id_transporte, despachos!inner(empresa_planta_id)')
        .eq('id', viaje_id)
        .single();

      if (!viaje) {
        return res.status(404).json({ error: 'Viaje no encontrado' });
      }

      const empresaPlanta = (viaje.despachos as any)?.empresa_planta_id;
      const empresaTransporte = viaje.id_transporte;
      if (empresaPlanta !== authCtx.empresaId && empresaTransporte !== authCtx.empresaId) {
        return res.status(403).json({ error: 'No tiene acceso a este viaje' });
      }
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
});
