// pages/api/viajes/[id]/estado-unidad.ts
// API para actualizar el estado de la unidad (chofer + camión)

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Transiciones válidas de estado
const TRANSICIONES_VALIDAS: Record<string, string[]> = {
  'camion_asignado': ['confirmado_chofer'],
  'confirmado_chofer': ['en_transito_origen'],
  'en_transito_origen': ['arribo_origen'],
  'arribo_origen': ['ingresado_origen'],
  'ingresado_origen': ['en_playa_origen'],
  'en_playa_origen': ['llamado_carga'],
  'llamado_carga': ['cargando'],
  'cargando': ['cargado'],
  'cargado': ['egreso_origen'],
  'egreso_origen': ['en_transito_destino'],
  'en_transito_destino': ['arribo_destino', 'arribado_destino', 'ingresado_destino'],
  'arribo_destino': ['ingresado_destino', 'arribado_destino'],
  'arribado_destino': ['ingresado_destino', 'vacio'],
  'ingresado_destino': ['llamado_descarga'],
  'llamado_descarga': ['descargando'],
  'descargando': ['descargado'],
  'descargado': ['egreso_destino'],
  'egreso_destino': ['vacio', 'viaje_completado'],
  'vacio': ['viaje_completado'],
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { id: viajeId } = req.query;
  const { nuevo_estado, observaciones, user_id } = req.body;

  // Validar parámetros
  if (!viajeId || !nuevo_estado || !user_id) {
    return res.status(400).json({
      exitoso: false,
      mensaje: 'Parámetros faltantes: nuevo_estado y user_id son requeridos'
    });
  }

  try {
    // 1. Obtener el viaje actual
    const { data: viaje, error: fetchError } = await supabase
      .from('viajes_despacho')
      .select('id, estado, estado_unidad, chofer_id, camion_id, despacho_id')
      .eq('id', viajeId as string)
      .single();

    if (fetchError || !viaje) {
      return res.status(404).json({
        exitoso: false,
        mensaje: 'Viaje no encontrado'
      });
    }

    const estadoAnterior = viaje.estado;

    // 2. Validar transición
    const transicionesPermitidas = TRANSICIONES_VALIDAS[estadoAnterior] || [];
    if (!transicionesPermitidas.includes(nuevo_estado)) {
      return res.status(400).json({
        exitoso: false,
        mensaje: `Transición no permitida: ${estadoAnterior} → ${nuevo_estado}. Permitidos: ${transicionesPermitidas.join(', ') || 'ninguno'}`,
        estado_anterior: estadoAnterior,
        estado_nuevo: nuevo_estado
      });
    }

    // 3. Actualizar estado
    const updateData: Record<string, unknown> = {
      estado: nuevo_estado,
      estado_unidad: nuevo_estado,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('viajes_despacho')
      .update(updateData)
      .eq('id', viajeId as string);

    if (updateError) {
      console.error('Error actualizando viaje:', updateError);
      return res.status(500).json({
        exitoso: false,
        mensaje: `Error al actualizar: ${updateError.message}`,
        error: updateError.details
      });
    }

    console.log(`✅ Viaje ${viajeId}: ${estadoAnterior} → ${nuevo_estado} (por ${user_id})`);

    // 4. Auto-completar viaje si llegó a 'vacio'
    let estadoFinal = nuevo_estado;
    if (nuevo_estado === 'vacio') {
      console.log(`🔄 Viaje ${viajeId}: Auto-completando vacio → viaje_completado`);
      const { error: autoCompleteError } = await supabase
        .from('viajes_despacho')
        .update({
          estado: 'viaje_completado',
          estado_unidad: 'viaje_completado',
          updated_at: new Date().toISOString(),
        })
        .eq('id', viajeId as string);

      if (autoCompleteError) {
        console.error('⚠️ Error auto-completando viaje:', autoCompleteError);
        // No falla — el viaje queda en 'vacio', se puede completar después
      } else {
        estadoFinal = 'viaje_completado';
        console.log(`✅ Viaje ${viajeId}: Auto-completado a viaje_completado`);
      }
    }

    // 5. Si el viaje se completó, verificar cierre del despacho
    if (estadoFinal === 'viaje_completado' && viaje.despacho_id) {
      try {
        // Contar viajes del despacho
        const { data: viajesDespacho, error: countError } = await supabase
          .from('viajes_despacho')
          .select('id, estado')
          .eq('despacho_id', viaje.despacho_id);

        if (!countError && viajesDespacho) {
          const todosCompletados = viajesDespacho.every(
            v => v.estado === 'viaje_completado' || v.estado === 'completado' || v.estado === 'cancelado'
          );
          const totalViajes = viajesDespacho.length;
          const completados = viajesDespacho.filter(
            v => v.estado === 'viaje_completado' || v.estado === 'completado'
          ).length;

          console.log(`📊 Despacho ${viaje.despacho_id}: ${completados}/${totalViajes} viajes completados`);

          if (todosCompletados && totalViajes > 0) {
            const { error: despachoError } = await supabase
              .from('despachos')
              .update({
                estado: 'completado',
                cantidad_viajes_completados: completados,
              })
              .eq('id', viaje.despacho_id);

            if (despachoError) {
              console.error('⚠️ Error cerrando despacho:', despachoError);
            } else {
              console.log(`✅ Despacho ${viaje.despacho_id}: CERRADO (${completados}/${totalViajes} completados)`);
            }
          } else {
            // Actualizar contador parcial
            await supabase
              .from('despachos')
              .update({ cantidad_viajes_completados: completados })
              .eq('id', viaje.despacho_id);
          }
        }
      } catch (err) {
        console.error('⚠️ Error verificando cierre de despacho:', err);
      }
    }

    // 6. Obtener próximos estados
    const proximosEstados = TRANSICIONES_VALIDAS[estadoFinal] || [];

    return res.status(200).json({
      exitoso: true,
      mensaje: estadoFinal === 'viaje_completado' && nuevo_estado === 'vacio'
        ? `Viaje completado automáticamente (${estadoAnterior} → vacio → viaje_completado)`
        : `Estado actualizado: ${estadoAnterior} → ${estadoFinal}`,
      estado_anterior: estadoAnterior,
      estado_nuevo: estadoFinal,
      proximos_estados: proximosEstados,
      viaje_auto_completado: estadoFinal === 'viaje_completado' && nuevo_estado === 'vacio',
    });

  } catch (error: unknown) {
    console.error('Error inesperado:', error);
    return res.status(500).json({
      exitoso: false,
      mensaje: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
