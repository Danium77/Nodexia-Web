// pages/api/control-acceso/confirmar-accion.ts
// API para confirmar ingreso o egreso después de validar QR

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import type { EstadoUnidadViaje } from '../../../lib/types';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { viaje_id, accion, usuario_id, observaciones, planta_id } = req.body;

    if (!viaje_id || !accion || !usuario_id) {
      return res.status(400).json({ 
        error: 'Datos requeridos faltantes',
        required: ['viaje_id', 'accion', 'usuario_id']
      });
    }

    // 1. Obtener el viaje desde viajes_despacho
    const { data: viaje, error: viajeError } = await supabaseAdmin
      .from('viajes_despacho')
      .select(`
        *,
        despacho:despachos!inner(
          id,
          pedido_id,
          origen,
          destino
        )
      `)
      .eq('id', viaje_id)
      .single();

    if (viajeError || !viaje) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }

    const estadoActual = viaje.estado_unidad || viaje.estado;
    let nuevoEstado: EstadoUnidadViaje;
    
    // Determinar el nuevo estado según el estado actual y acción
    if (accion === 'ingreso') {
      if (estadoActual === 'en_transito_origen') {
        nuevoEstado = 'ingresado_origen';
      } else if (estadoActual === 'en_transito_destino') {
        nuevoEstado = 'ingresado_destino';
      } else {
        return res.status(400).json({
          error: `No se puede ingresar un viaje en estado: ${estadoActual}`
        });
      }
    } else if (accion === 'egreso') {
      if (estadoActual === 'egreso_origen') {
        nuevoEstado = 'en_transito_destino';
      } else if (estadoActual === 'vacio') {
        nuevoEstado = 'disponible';
      } else {
        return res.status(400).json({
          error: `No se puede egresar un viaje en estado: ${estadoActual}`
        });
      }
    } else {
      return res.status(400).json({
        error: 'Acción no válida. Use "ingreso" o "egreso"'
      });
    }

    // 2. Usar la función RPC validar_transicion_estado_unidad para actualizar el estado
    const { data: resultado, error: transicionError } = await supabaseAdmin
      .rpc('validar_transicion_estado_unidad', {
        p_viaje_id: viaje_id,
        p_nuevo_estado: nuevoEstado,
        p_observaciones: observaciones || `${accion === 'ingreso' ? 'Ingreso' : 'Egreso'} confirmado por Control de Acceso`
      });

    if (transicionError || !resultado) {
      console.error('Error en transición de estado:', transicionError);
      return res.status(400).json({
        error: 'No se pudo actualizar el estado',
        details: transicionError?.message || 'Transición no válida'
      });
    }

    // 3. Crear registro de acceso
    const { error: registroError } = await supabaseAdmin
      .from('registros_acceso')
      .insert({
        viaje_id: viaje_id,
        tipo: accion as 'ingreso' | 'egreso',
        usuario_id: usuario_id,
        observaciones: observaciones || `${accion === 'ingreso' ? 'Ingreso' : 'Egreso'} confirmado`,
        timestamp: new Date().toISOString()
      });

    if (registroError) {
      console.error('Error creando registro de acceso:', registroError);
      // No fallar la operación por esto
    }

    // 4. Crear notificación para el chofer (opcional)
    if (viaje.chofer_id) {
      await crearNotificacionChofer(viaje.chofer_id, viaje, accion, nuevoEstado).catch(err => {
        console.error('Error creando notificación:', err);
      });
    }

    return res.status(200).json({
      success: true,
      message: `${accion === 'ingreso' ? 'Ingreso' : 'Egreso'} confirmado exitosamente`,
      data: {
        viaje_id: viaje.id,
        numero_viaje: viaje.numero_viaje,
        estado_anterior: estadoActual,
        estado_nuevo: nuevoEstado,
        timestamp: new Date().toISOString(),
        usuario_responsable: usuario_id
      }
    });

  } catch (error: any) {
    console.error('Error confirmando acción:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
}

async function crearNotificacionChofer(choferId: string, viaje: any, accion: string, nuevoEstado: string) {
  try {
    // Buscar el usuario chofer
    const { data: chofer } = await supabaseAdmin
      .from('choferes')
      .select('email')
      .eq('id', choferId)
      .single();

    if (!chofer?.email) return;

    const { data: usuarioChofer } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('email', chofer.email)
      .maybeSingle();

    if (!usuarioChofer) return;

    let titulo, mensaje;
    if (accion === 'ingreso') {
      if (nuevoEstado === 'ingresado_origen') {
        titulo = 'Ingreso a Planta Origen';
        mensaje = `Ha ingresado a planta de origen. Viaje: ${viaje.numero_viaje}. Aguarde instrucciones de carga.`;
      } else {
        titulo = 'Ingreso a Destino';
        mensaje = `Ha ingresado a planta destino. Viaje: ${viaje.numero_viaje}. Aguarde instrucciones de descarga.`;
      }
    } else {
      if (nuevoEstado === 'en_transito_destino') {
        titulo = 'Egreso Autorizado - Rumbo a Destino';
        mensaje = `Puede egresar de planta. Diríjase al destino. Viaje: ${viaje.numero_viaje}`;
      } else {
        titulo = 'Viaje Completado';
        mensaje = `Viaje ${viaje.numero_viaje} completado exitosamente. Unidad disponible.`;
      }
    }

    await supabaseAdmin
      .from('notificaciones')
      .insert({
        user_id: usuarioChofer.id,
        tipo: 'cambio_estado',
        titulo,
        mensaje,
        viaje_id: viaje.id,
        metadata: {
          estado_nuevo: nuevoEstado,
          accion: accion
        }
      });

  } catch (error) {
    console.error('Error creando notificación chofer:', error);
  }
}