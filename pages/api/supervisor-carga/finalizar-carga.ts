// pages/api/supervisor-carga/finalizar-carga.ts
// API para finalizar carga subiendo foto del remito
// ─── Ruta thin: delega lógica a servicios ───

import { withAuth } from '@/lib/middleware/withAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { cambiarEstadoViaje } from '@/lib/services/viajeEstado';
import { notificarCambioEstado, notificarUsuario } from '@/lib/services/notificaciones';

export default withAuth(async (req, res, authCtx) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const {
      viaje_id,
      peso_real,
      remito_url,
      fotos_carga,
      observaciones_finalizacion,
    } = req.body;
    const usuario_id = authCtx.userId;

    if (!viaje_id) {
      return res.status(400).json({
        error: 'Datos requeridos faltantes',
        required: ['viaje_id'],
      });
    }

    // 1. Obtener viaje para validaciones de datos
    const { data: viaje, error: viajeError } = await supabaseAdmin
      .from('viajes_despacho')
      .select('id, estado, numero_viaje, tipo_operacion, producto, peso_estimado, fecha_inicio_carga')
      .eq('id', viaje_id)
      .single();

    if (viajeError || !viaje) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }

    // 2. Validar datos de carga antes de cambiar estado
    const validaciones = validarDatosCarga(viaje, peso_real);
    if (!validaciones.valido) {
      return res.status(400).json({
        error: 'Datos de carga inválidos',
        details: validaciones.errores,
      });
    }

    // 3. Guardar datos de carga (remito, peso, fotos)
    const datosCarga: Record<string, unknown> = {
      peso_real: peso_real || viaje.peso_estimado,
      fecha_fin_carga: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (remito_url) datosCarga.remito_url = remito_url;
    if (fotos_carga) datosCarga.fotos_carga = JSON.stringify(fotos_carga);

    await supabaseAdmin
      .from('viajes_despacho')
      .update(datosCarga)
      .eq('id', viaje_id);

    // 4. Cambiar estado vía servicio → 'cargado' (valida transición + sincroniza despacho)
    const obs = observaciones_finalizacion
      ? `[FIN CARGA] ${observaciones_finalizacion} - Peso real: ${peso_real || viaje.peso_estimado}kg`
      : undefined;

    const resultado = await cambiarEstadoViaje(supabaseAdmin, {
      viaje_id,
      nuevo_estado: 'cargado',
      user_id: usuario_id,
      observaciones: obs,
    });

    if (!resultado.exitoso) {
      return res.status(400).json({
        error: resultado.mensaje,
        estado_actual: resultado.estado_anterior,
      });
    }

    // 5. Notificar chofer (vía servicio)
    await notificarCambioEstado(supabaseAdmin, viaje_id, 'cargado');

    // 6. Notificar control de acceso para egreso
    await notificarControlAccesoEgreso(viaje);

    // 7. Calcular estadísticas
    const estadisticasCarga = calcularEstadisticasCarga(
      viaje.fecha_inicio_carga,
      datosCarga.fecha_fin_carga as string
    );

    return res.status(200).json({
      success: true,
      message: 'Carga finalizada exitosamente',
      data: {
        viaje: {
          id: viaje.id,
          numero_viaje: viaje.numero_viaje,
          tipo_operacion: viaje.tipo_operacion,
          producto: viaje.producto,
          estado_anterior: resultado.estado_anterior,
          estado_nuevo: 'cargado',
        },
        carga_completada: {
          peso_estimado: viaje.peso_estimado,
          peso_real: peso_real || viaje.peso_estimado,
          diferencia: peso_real ? peso_real - viaje.peso_estimado : 0,
          tiempo_carga: estadisticasCarga.tiempoCarga,
          remito_subido: !!remito_url,
          fotos_tomadas: fotos_carga ? fotos_carga.length : 0,
        },
        timestamps: {
          inicio_carga: viaje.fecha_inicio_carga,
          fin_carga: datosCarga.fecha_fin_carga,
          duracion_minutos: estadisticasCarga.duracionMinutos,
        },
        proximos_estados: resultado.proximos_estados,
        siguiente_paso: {
          accion: 'egreso_origen',
          descripcion: 'El camión está listo para egresar. Debe dirigirse a Control de Acceso.',
        },
      },
    });
  } catch (error: any) {
    console.error('Error finalizando carga:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message,
    });
  }
}, { roles: ['supervisor', 'coordinador', 'control_acceso'] });

// ============================================================================
// Funciones auxiliares
// ============================================================================

function validarDatosCarga(viaje: any, pesoReal?: number) {
  const errores: string[] = [];

  if (pesoReal !== undefined && pesoReal !== null) {
    if (pesoReal <= 0) {
      errores.push('El peso real debe ser mayor a 0');
    }
    if (viaje.peso_estimado) {
      const diferenciaPct =
        (Math.abs(pesoReal - viaje.peso_estimado) / viaje.peso_estimado) * 100;
      if (diferenciaPct > 20) {
        errores.push(
          `El peso real (${pesoReal}kg) difiere más del 20% del peso estimado (${viaje.peso_estimado}kg)`
        );
      }
    }
  }

  return { valido: errores.length === 0, errores };
}

function calcularEstadisticasCarga(fechaInicio: string, fechaFin: string) {
  const inicioT = new Date(fechaInicio);
  const finT = new Date(fechaFin);
  const duracionMs = finT.getTime() - inicioT.getTime();
  const duracionMinutos = Math.round(duracionMs / (1000 * 60));

  return {
    duracionMinutos,
    tiempoCarga: `${Math.floor(duracionMinutos / 60)}h ${duracionMinutos % 60}m`,
  };
}

async function notificarControlAccesoEgreso(viaje: any) {
  try {
    const { data: usuariosControl } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('user_id')
      .eq('rol_interno', 'Control de Acceso')
      .eq('activo', true);

    if (!usuariosControl?.length) return;

    for (const usuario of usuariosControl) {
      await notificarUsuario(supabaseAdmin, usuario.user_id, {
        viaje_id: viaje.id,
        tipo: 'cambio_estado',
        titulo: '🚪 Camión Listo para Egreso',
        mensaje: `Viaje ${viaje.numero_viaje} completado. Camión listo para egresar de planta.`,
        datos_adicionales: {
          numero_viaje: viaje.numero_viaje,
          accion_requerida: 'egreso',
        },
      });
    }
  } catch (error) {
    console.error('Error notificando Control de Acceso:', error);
  }
}