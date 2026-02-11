// pages/api/documentacion/listar.ts
// API para listar documentos de una entidad específica

import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Verificar autenticación
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { entidad_tipo, entidad_id, activo, estado_vigencia } = req.query;

    // Validar parámetros requeridos
    if (!entidad_tipo || !entidad_id) {
      return res.status(400).json({
        error: 'Parámetros requeridos faltantes',
        details: 'Debe proporcionar: entidad_tipo y entidad_id como query params'
      });
    }

    // Validar entidad_tipo
    const tiposValidos = ['chofer', 'camion', 'acoplado', 'transporte'];
    if (!tiposValidos.includes(entidad_tipo as string)) {
      return res.status(400).json({
        error: 'Tipo de entidad inválido',
        details: `entidad_tipo debe ser uno de: ${tiposValidos.join(', ')}`
      });
    }

    // Construir query
    let query = supabaseAdmin
      .from('documentos_entidad')
      .select(`
        id,
        entidad_tipo,
        entidad_id,
        tipo_documento,
        nombre_archivo,
        file_url,
        file_size,
        mime_type,
        fecha_emision,
        fecha_vencimiento,
        estado_vigencia,
        validado_por,
        fecha_validacion,
        motivo_rechazo,
        validacion_excepcional,
        validado_excepcionalmente_por,
        fecha_validacion_excepcional,
        requiere_reconfirmacion_backoffice,
        reconfirmado_por,
        fecha_reconfirmacion,
        subido_por,
        empresa_id,
        created_at,
        updated_at,
        activo
      `)
      .eq('entidad_tipo', entidad_tipo)
      .eq('entidad_id', entidad_id);

    // Filtrar por activo (por defecto solo activos)
    if (activo !== undefined) {
      const activoBool = activo === 'true' || activo === '1';
      query = query.eq('activo', activoBool);
    } else {
      query = query.eq('activo', true);
    }

    // Filtrar por estado_vigencia si se especifica
    if (estado_vigencia) {
      query = query.eq('estado_vigencia', estado_vigencia);
    }

    // Ordenar por fecha de creación (más recientes primero)
    query = query.order('created_at', { ascending: false });

    const { data: documentos, error: dbError } = await query;

    if (dbError) {
      console.error('Error al consultar documentos:', dbError);
      return res.status(500).json({
        error: 'Error al consultar documentos',
        details: dbError.message
      });
    }

    // Enriquecer la respuesta con información adicional
    // Generar signed URLs para documentos con storage_path
    const documentosConUrls = await Promise.all(
      documentos.map(async (doc: any) => {
        if (doc.storage_path && doc.bucket) {
          const { data: signedUrlData } = await supabaseAdmin.storage
            .from(doc.bucket)
            .createSignedUrl(doc.storage_path, 3600); // 1 hora
          return { ...doc, file_url: signedUrlData?.signedUrl || null };
        }
        return doc;
      })
    );

    const documentosEnriquecidos = documentosConUrls.map(doc => {
      let dias_para_vencer = null;
      let estado_vencimiento = null;

      if (doc.fecha_vencimiento) {
        const hoy = new Date();
        const fechaVenc = new Date(doc.fecha_vencimiento);
        dias_para_vencer = Math.ceil((fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

        if (dias_para_vencer < 0) {
          estado_vencimiento = 'vencido';
        } else if (dias_para_vencer <= 30) {
          estado_vencimiento = 'por_vencer';
        } else {
          estado_vencimiento = 'vigente';
        }
      }

      return {
        ...doc,
        dias_para_vencer,
        estado_vencimiento,
      };
    });

    // Agrupar por tipo de documento
    const documentosPorTipo = documentosEnriquecidos.reduce((acc, doc) => {
      if (!acc[doc.tipo_documento]) {
        acc[doc.tipo_documento] = [];
      }
      acc[doc.tipo_documento].push(doc);
      return acc;
    }, {} as Record<string, typeof documentosEnriquecidos>);

    // Calcular resumen
    const resumen = {
      total: documentos.length,
      activos: documentos.filter(d => d.activo).length,
      pendientes_validacion: documentos.filter(d => d.estado_vigencia === 'pendiente_validacion' && d.activo).length,
      vigentes: documentos.filter(d => d.estado_vigencia === 'vigente' && d.activo).length,
      por_vencer: documentosEnriquecidos.filter(d => d.estado_vencimiento === 'por_vencer' && d.activo).length,
      vencidos: documentosEnriquecidos.filter(d => d.estado_vencimiento === 'vencido' && d.activo).length,
      rechazados: documentos.filter(d => d.estado_vigencia === 'rechazado' && d.activo).length,
    };

    return res.status(200).json({
      success: true,
      data: {
        entidad_tipo,
        entidad_id,
        resumen,
        documentos: documentosEnriquecidos,
        documentos_por_tipo: documentosPorTipo,
      }
    });

  } catch (error: any) {
    console.error('Error en listar documentación:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
}
