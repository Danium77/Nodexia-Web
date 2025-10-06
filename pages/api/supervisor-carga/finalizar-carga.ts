// pages/api/supervisor-carga/finalizar-carga.ts
// API para finalizar carga subiendo foto del remito

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { 
      viaje_id, 
      usuario_id, 
      peso_real, 
      remito_url, 
      fotos_carga, 
      observaciones_finalizacion 
    } = req.body;

    if (!viaje_id || !usuario_id) {
      return res.status(400).json({ 
        error: 'Datos requeridos faltantes',
        required: ['viaje_id', 'usuario_id']
      });
    }

    // 1. Validar que el viaje existe y está en estado correcto
    const { data: viaje, error: viajeError } = await supabaseAdmin
      .from('viajes')
      .select(`
        *,
        chofer:choferes(*),
        camion:camiones(*)
      `)
      .eq('id', viaje_id)
      .single();

    if (viajeError || !viaje) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }

    if (viaje.estado_viaje !== 'cargando') {
      return res.status(400).json({
        error: `No se puede finalizar carga en estado: ${viaje.estado_viaje}`,
        details: 'El viaje debe estar en estado "cargando" para poder finalizar',
        estado_actual: viaje.estado_viaje
      });
    }

    // 2. Validaciones de datos de carga
    const validaciones = validarDatosCarga(viaje, peso_real, remito_url);
    if (!validaciones.valido) {
      return res.status(400).json({
        error: 'Datos de carga inválidos',
        details: validaciones.errores
      });
    }

    // 3. Actualizar el viaje
    const updateData = {
      estado_viaje: 'carga_finalizada',
      fecha_fin_carga: new Date().toISOString(),
      carga_finalizada_por: usuario_id,
      peso_real: peso_real || viaje.peso_estimado,
      remito_url: remito_url,
      fotos_carga: fotos_carga ? JSON.stringify(fotos_carga) : null,
      observaciones: observaciones_finalizacion ? 
        (viaje.observaciones ? viaje.observaciones + '\n' : '') + 
        `[FIN CARGA] ${observaciones_finalizacion} - Peso real: ${peso_real || viaje.peso_estimado}kg` :
        viaje.observaciones,
      updated_at: new Date().toISOString()
    };

    const { data: viajeActualizado, error: updateError } = await supabaseAdmin
      .from('viajes')
      .update(updateData)
      .eq('id', viaje_id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // 4. Cambiar automáticamente a "listo_egreso" después de un momento
    setTimeout(async () => {
      await supabaseAdmin
        .from('viajes')
        .update({ 
          estado_viaje: 'listo_egreso',
          updated_at: new Date().toISOString()
        })
        .eq('id', viaje_id);
    }, 2000);

    // 5. Enviar notificaciones
    await enviarNotificacionCargaFinalizada(viaje, peso_real);
    await notificarControlAccesoEgreso(viaje);

    // 6. Calcular estadísticas de la carga
    const estadisticasCarga = calcularEstadisticasCarga(viaje, updateData);

    return res.status(200).json({
      success: true,
      message: 'Carga finalizada exitosamente',
      data: {
        viaje: {
          id: viaje.id,
          numero_viaje: viaje.numero_viaje,
          tipo_operacion: viaje.tipo_operacion,
          producto: viaje.producto,
          estado_anterior: 'cargando',
          estado_nuevo: 'carga_finalizada'
        },
        carga_completada: {
          peso_estimado: viaje.peso_estimado,
          peso_real: peso_real || viaje.peso_estimado,
          diferencia: peso_real ? (peso_real - viaje.peso_estimado) : 0,
          tiempo_carga: estadisticasCarga.tiempoCarga,
          remito_subido: !!remito_url,
          fotos_tomadas: fotos_carga ? fotos_carga.length : 0
        },
        timestamps: {
          inicio_carga: viaje.fecha_inicio_carga,
          fin_carga: updateData.fecha_fin_carga,
          duracion_minutos: estadisticasCarga.duracionMinutos
        },
        siguiente_paso: {
          accion: 'egreso_planta',
          descripcion: 'El camión está listo para egresar. Debe dirigirse a Control de Acceso.'
        }
      }
    });

  } catch (error: any) {
    console.error('Error finalizando carga:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
}

function validarDatosCarga(viaje: any, pesoReal?: number, remitoUrl?: string) {
  const errores = [];

  // Validar peso real si se proporciona
  if (pesoReal !== undefined && pesoReal !== null) {
    if (pesoReal <= 0) {
      errores.push('El peso real debe ser mayor a 0');
    }
    
    const diferenciaPorcentaje = Math.abs(pesoReal - viaje.peso_estimado) / viaje.peso_estimado * 100;
    if (diferenciaPorcentaje > 20) {
      errores.push(`El peso real (${pesoReal}kg) difiere más del 20% del peso estimado (${viaje.peso_estimado}kg)`);
    }
  }

  // En producción, validaríamos que el remito_url sea válido
  // if (!remitoUrl) {
  //   errores.push('Debe subir la foto del remito');
  // }

  return {
    valido: errores.length === 0,
    errores
  };
}

function calcularEstadisticasCarga(viaje: any, updateData: any) {
  const inicioT= new Date(viaje.fecha_inicio_carga);
  const finT= new Date(updateData.fecha_fin_carga);
  const duracionMs = finT.getTime() - inicioT.getTime();
  const duracionMinutos = Math.round(duracionMs / (1000 * 60));

  return {
    duracionMinutos,
    tiempoCarga: `${Math.floor(duracionMinutos / 60)}h ${duracionMinutos % 60}m`
  };
}

async function enviarNotificacionCargaFinalizada(viaje: any, pesoReal?: number) {
  try {
    const { data: usuarioChofer } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('email', viaje.chofer.email)
      .single();

    if (!usuarioChofer) return;

    const pesoFinal = pesoReal || viaje.peso_estimado;
    const mensaje = viaje.tipo_operacion === 'carga' 
      ? `Carga completada: ${viaje.producto} - ${pesoFinal}kg. Puede dirigirse a Control de Acceso para egresar.`
      : `Descarga completada: ${viaje.producto} - ${pesoFinal}kg. Puede dirigirse a Control de Acceso para egresar.`;

    await supabaseAdmin
      .from('notificaciones')
      .insert({
        usuario_id: usuarioChofer.id,
        tipo_notificacion: 'carga_finalizada',
        titulo: '✅ Carga Completada',
        mensaje,
        viaje_id: viaje.id,
        enviada: true,
        fecha_envio: new Date().toISOString(),
        datos_extra: {
          numero_viaje: viaje.numero_viaje,
          peso_final: pesoFinal,
          tipo_operacion: viaje.tipo_operacion
        }
      });

  } catch (error) {
    console.error('Error enviando notificación carga finalizada:', error);
  }
}

async function notificarControlAccesoEgreso(viaje: any) {
  try {
    // Notificar a todos los usuarios de Control de Acceso que hay un camión listo para egresar
    const { data: usuariosControl } = await supabaseAdmin
      .from('usuarios_empresa')
      .select(`
        user_id,
        usuarios(id, email)
      `)
      .eq('rol_interno', 'Control de Acceso')
      .eq('activo', true);

    if (!usuariosControl) return;

    for (const usuario of usuariosControl) {
      await supabaseAdmin
        .from('notificaciones')
        .insert({
          usuario_id: usuario.user_id,
          tipo_notificacion: 'estado_actualizado',
          titulo: '🚪 Camión Listo para Egreso',
          mensaje: `Viaje ${viaje.numero_viaje} completado. Camión listo para egresar de planta.`,
          viaje_id: viaje.id,
          enviada: true,
          fecha_envio: new Date().toISOString(),
          datos_extra: {
            numero_viaje: viaje.numero_viaje,
            accion_requerida: 'egreso'
          }
        });
    }

  } catch (error) {
    console.error('Error notificando Control de Acceso:', error);
  }
}