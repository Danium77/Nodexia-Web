// pages/api/control-acceso/crear-incidencia.ts
// API para crear incidencia cuando Control de Acceso detecta problemas de documentación
// TASK-S06: Reescritura completa — tabla incidencias_viaje con columnas correctas

import type { NextApiResponse } from 'next';
import { createUserSupabaseClient } from '@/lib/supabaseServerClient';
import { withAuth } from '@/lib/middleware/withAuth';

// Tipos válidos según CHECK en incidencias_viaje
const TIPOS_VALIDOS = [
  'retraso',
  'averia_camion',
  'documentacion_faltante',
  'producto_danado',
  'accidente',
  'otro',
] as const;

type TipoIncidencia = typeof TIPOS_VALIDOS[number];
type Severidad = 'baja' | 'media' | 'alta' | 'critica';

function determinarSeveridad(tipo: TipoIncidencia): Severidad {
  const map: Record<TipoIncidencia, Severidad> = {
    retraso: 'baja',
    averia_camion: 'alta',
    documentacion_faltante: 'media',
    producto_danado: 'alta',
    accidente: 'critica',
    otro: 'media',
  };
  return map[tipo] || 'media';
}

export default withAuth(async (req, res, { userId, token }) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const supabase = createUserSupabaseClient(token);
    const { viaje_id, tipo_incidencia, descripcion, severidad } = req.body;

    // Validar campos requeridos
    if (!viaje_id || !tipo_incidencia || !descripcion) {
      return res.status(400).json({
        error: 'Datos requeridos faltantes',
        required: ['viaje_id', 'tipo_incidencia', 'descripcion'],
      });
    }

    // Validar tipo_incidencia contra CHECK de la tabla
    if (!TIPOS_VALIDOS.includes(tipo_incidencia)) {
      return res.status(400).json({
        error: 'Tipo de incidencia inválido',
        tipos_validos: TIPOS_VALIDOS,
      });
    }

    // Validar que el viaje existe en viajes_despacho (NO en 'viajes')
    const { data: viaje, error: viajeError } = await supabase
      .from('viajes_despacho')
      .select('id, numero_viaje')
      .eq('id', viaje_id)
      .single();

    if (viajeError || !viaje) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }

    // Determinar severidad: usar la enviada o calcular por tipo
    const severidadFinal: Severidad =
      severidad && ['baja', 'media', 'alta', 'critica'].includes(severidad)
        ? severidad
        : determinarSeveridad(tipo_incidencia as TipoIncidencia);

    // Insertar en incidencias_viaje
    // Columnas esperadas: estado, severidad, fecha_incidencia (schema unificado via migración 053)
    // Fallback para schema viejo: estado_resolucion, fecha_reporte, sin severidad
    const insertData: Record<string, any> = {
      viaje_id,
      tipo_incidencia,
      descripcion: descripcion.trim(),
      reportado_por: userId,
    };

    // Intentar con schema nuevo primero (migración 053)
    insertData.severidad = severidadFinal;
    insertData.estado = 'abierta';
    insertData.fecha_incidencia = new Date().toISOString();

    let incidencia: any = null;
    let insertError: any = null;

    // Intento 1: Schema unificado (estado, severidad, fecha_incidencia)
    const result1 = await supabase
      .from('incidencias_viaje')
      .insert(insertData)
      .select('id, tipo_incidencia, estado, severidad')
      .single();

    if (!result1.error) {
      incidencia = result1.data;
    } else {
      // Intento 2: Schema viejo (estado_resolucion, fecha_reporte, sin severidad)
      const insertDataViejo: Record<string, any> = {
        viaje_id,
        tipo_incidencia,
        descripcion: descripcion.trim(),
        reportado_por: userId,
        estado_resolucion: 'pendiente',
        fecha_reporte: new Date().toISOString(),
      };

      const result2 = await supabase
        .from('incidencias_viaje')
        .insert(insertDataViejo)
        .select('id, tipo_incidencia, estado_resolucion')
        .single();

      if (!result2.error) {
        incidencia = {
          ...result2.data,
          estado: result2.data.estado_resolucion || 'pendiente',
          severidad: severidadFinal,
        };
      } else {
        insertError = result2.error;
      }
    }

    if (insertError || !incidencia) {
      throw insertError || new Error('No se pudo crear la incidencia');
    }

    return res.status(201).json({
      success: true,
      data: {
        id: incidencia.id,
        tipo_incidencia: incidencia.tipo_incidencia,
        estado: incidencia.estado,
        severidad: incidencia.severidad,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Error interno del servidor',
    });
  }
}, { roles: ['control_acceso', 'supervisor', 'coordinador', 'admin_nodexia'] });