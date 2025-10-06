// pages/api/control-acceso/crear-incidencia.ts
// API para crear incidencia cuando Control de Acceso rechaza acceso

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
      tipo_incidencia,
      descripcion,
      fotos_incidencia,
      documentos_faltantes,
      requiere_supervision,
      accion_sugerida
    } = req.body;

    if (!viaje_id || !usuario_id || !tipo_incidencia || !descripcion) {
      return res.status(400).json({ 
        error: 'Datos requeridos faltantes',
        required: ['viaje_id', 'usuario_id', 'tipo_incidencia', 'descripcion']
      });
    }

    // 1. Validar que el viaje existe
    const { data: viaje, error: viajeError } = await supabaseAdmin
      .from('viajes')
      .select(`
        *,
        chofer:choferes(*),
        camion:camiones(*),
        empresa:empresas(*)
      `)
      .eq('id', viaje_id)
      .single();

    if (viajeError || !viaje) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }

    // 2. Validar el tipo de incidencia
    const tiposValidos = [
      'documentacion_faltante',
      'documentacion_vencida',
      'documentacion_incorrecta',
      'chofer_no_autorizado',
      'camion_no_autorizado',
      'horario_incorrecto',
      'producto_no_coincide',
      'otro'
    ];

    if (!tiposValidos.includes(tipo_incidencia)) {
      return res.status(400).json({
        error: 'Tipo de incidencia inválido',
        tipos_validos: tiposValidos
      });
    }

    // 3. Crear la incidencia
    const incidenciaData = {
      viaje_id: viaje_id,
      tipo_incidencia,
      descripcion,
      estado_incidencia: 'abierta',
      prioridad: determinarPrioridad(tipo_incidencia),
      reportada_por: usuario_id,
      fecha_reporte: new Date().toISOString(),
      fotos_incidencia: fotos_incidencia ? JSON.stringify(fotos_incidencia) : null,
      datos_extra: {
        documentos_faltantes: documentos_faltantes || [],
        requiere_supervision: requiere_supervision || false,
        accion_sugerida: accion_sugerida || null,
        ubicacion: 'Control de Acceso'
      }
    };

    const { data: incidencia, error: incidenciaError } = await supabaseAdmin
      .from('incidencias_viaje')
      .insert(incidenciaData)
      .select()
      .single();

    if (incidenciaError) {
      throw incidenciaError;
    }

    // 4. Actualizar estado del viaje si es necesario
    const nuevoEstado = determinarNuevoEstadoViaje(viaje.estado_viaje, tipo_incidencia);
    if (nuevoEstado !== viaje.estado_viaje) {
      await supabaseAdmin
        .from('viajes')
        .update({ 
          estado_viaje: nuevoEstado,
          observaciones: (viaje.observaciones || '') + 
            `\n[INCIDENCIA] ${descripcion} - Reportado por Control de Acceso`,
          updated_at: new Date().toISOString()
        })
        .eq('id', viaje_id);
    }

    // 5. Enviar notificaciones
    await enviarNotificacionIncidencia(viaje, incidencia);
    if (requiere_supervision) {
      await notificarSupervisores(viaje, incidencia);
    }

    // 6. Generar acciones recomendadas
    const accionesRecomendadas = generarAccionesRecomendadas(tipo_incidencia, viaje);

    return res.status(201).json({
      success: true,
      message: 'Incidencia creada exitosamente',
      data: {
        incidencia: {
          id: incidencia.id,
          numero_incidencia: `INC-${incidencia.id.toString().padStart(5, '0')}`,
          tipo: tipo_incidencia,
          estado: incidencia.estado_incidencia,
          prioridad: incidencia.prioridad
        },
        viaje: {
          id: viaje.id,
          numero_viaje: viaje.numero_viaje,
          estado_anterior: viaje.estado_viaje,
          estado_nuevo: nuevoEstado
        },
        acciones_recomendadas: accionesRecomendadas,
        requiere_supervision: requiere_supervision,
        siguiente_paso: {
          descripcion: requiere_supervision ? 
            'Incidencia escalada a supervisión. Aguardando resolución.' :
            'Incidencia registrada. El chofer debe corregir los problemas identificados.'
        }
      }
    });

  } catch (error: any) {
    console.error('Error creando incidencia:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
}

function determinarPrioridad(tipoIncidencia: string): 'baja' | 'media' | 'alta' | 'critica' {
  const prioridades: Record<string, 'baja' | 'media' | 'alta' | 'critica'> = {
    'documentacion_faltante': 'media',
    'documentacion_vencida': 'alta',
    'documentacion_incorrecta': 'media',
    'chofer_no_autorizado': 'critica',
    'camion_no_autorizado': 'critica',
    'horario_incorrecto': 'baja',
    'producto_no_coincide': 'alta',
    'otro': 'media'
  };

  return prioridades[tipoIncidencia] || 'media';
}

function determinarNuevoEstadoViaje(estadoActual: string, tipoIncidencia: string): string {
  // Incidencias críticas bloquean el viaje
  const incidenciasCriticas = [
    'chofer_no_autorizado',
    'camion_no_autorizado',
    'documentacion_vencida'
  ];

  if (incidenciasCriticas.includes(tipoIncidencia)) {
    return 'bloqueado';
  }

  // Para otras incidencias, mantener el estado actual pero agregar flag
  return estadoActual;
}

function generarAccionesRecomendadas(tipoIncidencia: string, viaje: any) {
  const acciones: Record<string, string[]> = {
    'documentacion_faltante': [
      'Contactar al chofer para que presente la documentación faltante',
      'Verificar en sistema si los documentos fueron cargados previamente',
      'Solicitar documentos por email o WhatsApp'
    ],
    'documentacion_vencida': [
      'Rechazar acceso hasta renovar documentación',
      'Notificar a la empresa sobre documentos vencidos',
      'Programar nuevo viaje una vez renovados los documentos'
    ],
    'documentacion_incorrecta': [
      'Solicitar corrección de documentos',
      'Verificar datos con el sistema de gestión',
      'Contactar a la empresa para aclaración'
    ],
    'chofer_no_autorizado': [
      'Rechazar acceso inmediatamente',
      'Verificar identidad del chofer',
      'Solicitar chofer autorizado'
    ],
    'camion_no_autorizado': [
      'Rechazar acceso del vehículo',
      'Verificar patente en sistema',
      'Solicitar vehículo autorizado'
    ],
    'horario_incorrecto': [
      'Verificar horarios permitidos de la empresa',
      'Reprogramar viaje para horario correcto',
      'Evaluar excepción si es urgente'
    ],
    'producto_no_coincide': [
      'Verificar orden de trabajo',
      'Contactar supervisor de carga',
      'Corregir producto en sistema'
    ],
    'otro': [
      'Evaluar situación específica',
      'Contactar supervisor si es necesario',
      'Documentar incidencia para futura referencia'
    ]
  };

  return acciones[tipoIncidencia] || acciones['otro'];
}

async function enviarNotificacionIncidencia(viaje: any, incidencia: any) {
  try {
    // Notificar al chofer
    const { data: usuarioChofer } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('email', viaje.chofer.email)
      .single();

    if (usuarioChofer) {
      await supabaseAdmin
        .from('notificaciones')
        .insert({
          usuario_id: usuarioChofer.id,
          tipo_notificacion: 'incidencia_reportada',
          titulo: '⚠️ Incidencia Reportada',
          mensaje: `Se reportó una incidencia en su viaje ${viaje.numero_viaje}: ${incidencia.descripcion}`,
          viaje_id: viaje.id,
          enviada: true,
          fecha_envio: new Date().toISOString(),
          datos_extra: {
            incidencia_id: incidencia.id,
            tipo_incidencia: incidencia.tipo_incidencia,
            prioridad: incidencia.prioridad
          }
        });
    }

    // Notificar a la empresa
    const { data: usuariosEmpresa } = await supabaseAdmin
      .from('usuarios_empresa')
      .select(`
        user_id,
        usuarios(id, email)
      `)
      .eq('empresa_id', viaje.empresa_id)
      .in('rol_interno', ['Administrador', 'Supervisor'])
      .eq('activo', true);

    if (usuariosEmpresa) {
      for (const usuario of usuariosEmpresa) {
        await supabaseAdmin
          .from('notificaciones')
          .insert({
            usuario_id: usuario.user_id,
            tipo_notificacion: 'incidencia_reportada',
            titulo: '⚠️ Incidencia en Viaje',
            mensaje: `Incidencia reportada en viaje ${viaje.numero_viaje} de ${viaje.chofer.nombre}`,
            viaje_id: viaje.id,
            enviada: true,
            fecha_envio: new Date().toISOString(),
            datos_extra: {
              incidencia_id: incidencia.id,
              tipo_incidencia: incidencia.tipo_incidencia
            }
          });
      }
    }

  } catch (error) {
    console.error('Error enviando notificaciones de incidencia:', error);
  }
}

async function notificarSupervisores(viaje: any, incidencia: any) {
  try {
    // Notificar a supervisores de carga
    const { data: supervisores } = await supabaseAdmin
      .from('usuarios_empresa')
      .select(`
        user_id,
        usuarios(id, email)
      `)
      .in('rol_interno', ['Supervisor de Carga', 'Administrador'])
      .eq('activo', true);

    if (supervisores) {
      for (const supervisor of supervisores) {
        await supabaseAdmin
          .from('notificaciones')
          .insert({
            usuario_id: supervisor.user_id,
            tipo_notificacion: 'incidencia_supervision',
            titulo: '🚨 Incidencia Requiere Supervisión',
            mensaje: `Incidencia crítica en viaje ${viaje.numero_viaje}. Se requiere intervención de supervisión.`,
            viaje_id: viaje.id,
            enviada: true,
            fecha_envio: new Date().toISOString(),
            datos_extra: {
              incidencia_id: incidencia.id,
              tipo_incidencia: incidencia.tipo_incidencia,
              prioridad: incidencia.prioridad
            }
          });
      }
    }

  } catch (error) {
    console.error('Error notificando supervisores:', error);
  }
}