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

    console.log('📥 Request recibido:', { viaje_id, nuevo_estado, user_id });

    if (!viaje_id || !nuevo_estado || !user_id) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    // Verificar que el viaje está asignado a este chofer
    const { data: chofer, error: choferError } = await supabase
      .from('choferes')
      .select('id')
      .eq('usuario_id', user_id)
      .single();

    console.log('👤 Chofer encontrado:', chofer, 'Error:', choferError);

    if (!chofer) {
      return res.status(403).json({ error: 'Chofer no encontrado' });
    }

    const { data: viaje, error: viajeError } = await supabase
      .from('viajes_despacho')
      .select('id, chofer_id')
      .eq('id', viaje_id)
      .single();

    console.log('🚚 Viaje encontrado:', viaje, 'Error:', viajeError);

    if (!viaje || viaje.chofer_id !== chofer.id) {
      return res.status(403).json({ 
        error: 'No autorizado para actualizar este viaje',
        debug: { viaje_chofer_id: viaje?.chofer_id, chofer_id: chofer.id }
      });
    }

    // Actualizar estado directamente en la tabla viajes_despacho
    console.log('🔄 Actualizando estado a:', nuevo_estado);
    
    const { data: updateData, error: updateError } = await supabase
      .from('viajes_despacho')
      .update({ 
        estado: nuevo_estado,
        updated_at: new Date().toISOString()
      })
      .eq('id', viaje_id)
      .select()
      .single();

    console.log('✅ Resultado UPDATE:', updateData, 'Error:', updateError);

    if (updateError) throw updateError;

    // SISTEMA DUAL: Actualizar también estado_unidad_viaje
    console.log('🔄 Actualizando sistema dual - estado_unidad_viaje');
    
    // Verificar si ya existe registro en estado_unidad_viaje
    const { data: estadoUnidad, error: estadoUnidadError } = await supabase
      .from('estado_unidad_viaje')
      .select('id')
      .eq('viaje_id', viaje_id)
      .maybeSingle();

    const ahora = new Date().toISOString();
    
    // Mapear estado a campos timestamp correspondientes
    const timestampField: Record<string, string> = {
      'asignado': 'fecha_asignacion',
      'camion_asignado': 'fecha_asignacion',
      'confirmado_chofer': 'fecha_confirmacion_chofer',
      'en_transito_origen': 'fecha_inicio_transito_origen',
      'arribo_origen': 'fecha_arribo_origen',
      'en_transito_destino': 'fecha_inicio_transito_destino',
      'arribo_destino': 'fecha_arribo_destino',
      'entregado': 'fecha_viaje_completado'
    };

    const campoFecha = timestampField[nuevo_estado];

    if (!estadoUnidad) {
      // Crear registro inicial
      console.log('Creating new estado_unidad_viaje record');
      const { error: insertError } = await supabase
        .from('estado_unidad_viaje')
        .insert({
          viaje_id: viaje_id,
          estado_unidad: nuevo_estado,
          [campoFecha]: ahora,
          created_at: ahora,
          updated_at: ahora
        });

      if (insertError) {
        console.error('Error creando estado_unidad_viaje:', insertError);
      } else {
        console.log('✅ estado_unidad_viaje creado');
      }
    } else {
      // Actualizar registro existente
      console.log('Updating existing estado_unidad_viaje record');
      const updateData: any = {
        estado_unidad: nuevo_estado,
        updated_at: ahora
      };

      if (campoFecha) {
        updateData[campoFecha] = ahora;
      }

      const { error: updateUnidadError } = await supabase
        .from('estado_unidad_viaje')
        .update(updateData)
        .eq('viaje_id', viaje_id);

      if (updateUnidadError) {
        console.error('Error actualizando estado_unidad_viaje:', updateUnidadError);
      } else {
        console.log('✅ estado_unidad_viaje actualizado');
      }
    }

    return res.status(200).json({ 
      success: true, 
      data: updateData,
      message: `Estado actualizado a: ${nuevo_estado}` 
    });

  } catch (error: any) {
    console.error('Error actualizando estado:', error);
    return res.status(500).json({ 
      error: error.message || 'Error al actualizar estado del viaje' 
    });
  }
}
