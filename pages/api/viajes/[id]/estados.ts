// pages/api/viajes/[id]/estados.ts
// API para obtener estados completos de un viaje

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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { id: viajeId } = req.query;

  if (!viajeId) {
    return res.status(400).json({ error: 'viaje_id es requerido' });
  }

  try {
    // Obtener estados completos desde la vista
    const { data: viaje, error } = await supabase
      .from('vista_estado_viaje_completo')
      .select('*')
      .eq('viaje_id', viajeId)
      .single();

    if (error) {
      console.error('Error obteniendo estados:', error);
      return res.status(404).json({
        error: 'Viaje no encontrado',
        mensaje: error.message
      });
    }

    // Obtener próximos estados válidos para unidad
    const { data: proximosUnidad } = await supabase.rpc(
      'obtener_proximos_estados_unidad',
      { p_estado_actual: viaje.estado_unidad }
    );

    // Obtener próximos estados válidos para carga
    const { data: proximosCarga } = await supabase.rpc(
      'obtener_proximos_estados_carga',
      { p_estado_actual: viaje.estado_carga }
    );

    return res.status(200).json({
      viaje_id: viaje.viaje_id,
      numero_viaje: viaje.numero_viaje,
      numero_despacho: viaje.numero_despacho,
      
      estado_unidad: {
        actual: viaje.estado_unidad,
        proximos_validos: proximosUnidad || [],
        ubicacion_actual: viaje.ubicacion_actual_lat ? {
          lat: viaje.ubicacion_actual_lat,
          lon: viaje.ubicacion_actual_lon,
          velocidad_kmh: viaje.velocidad_actual_kmh,
          ultima_actualizacion: viaje.ultima_actualizacion_gps
        } : null,
        timestamps: {
          asignacion: viaje.fecha_asignacion,
          confirmacion_chofer: viaje.fecha_confirmacion_chofer,
          arribo_origen: viaje.fecha_arribo_origen,
          egreso_origen: viaje.fecha_egreso_origen,
          arribo_destino: viaje.fecha_arribo_destino,
          completado: viaje.fecha_viaje_completado
        },
        observaciones: viaje.observaciones_unidad
      },
      
      estado_carga: {
        actual: viaje.estado_carga,
        proximos_validos: proximosCarga || [],
        producto: viaje.producto,
        peso_estimado_kg: viaje.peso_estimado_kg,
        peso_real_kg: viaje.peso_real_kg,
        remito_numero: viaje.remito_numero,
        tiene_faltante: viaje.tiene_faltante,
        tiene_rechazo: viaje.tiene_rechazo,
        timestamps: {
          planificacion: viaje.fecha_planificacion,
          documentacion_preparada: viaje.fecha_documentacion_preparada,
          cargado: viaje.fecha_carga_producto_ok,
          documentacion_validada: viaje.fecha_documentacion_validada,
          descargado: viaje.fecha_descargado,
          completado: viaje.fecha_completado
        },
        observaciones: viaje.observaciones_carga
      },
      
      // Datos relacionados
      transporte: viaje.transporte_nombre,
      camion: {
        patente: viaje.camion_patente,
        marca: viaje.camion_marca,
        modelo: viaje.camion_modelo
      },
      chofer: {
        nombre: viaje.chofer_nombre,
        telefono: viaje.chofer_telefono,
        user_id: viaje.chofer_user_id
      },
      
      // KPIs calculados
      kpis: {
        horas_en_planta: viaje.horas_en_planta,
        minutos_de_carga: viaje.minutos_de_carga
      }
    });

  } catch (error: any) {
    console.error('Error inesperado:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      mensaje: error.message
    });
  }
}
