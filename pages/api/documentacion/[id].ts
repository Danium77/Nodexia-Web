// pages/api/documentacion/[id].ts
// API para obtener detalle de un documento específico y eliminación lógica (soft-delete)

import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/middleware/withAuth';

export default withAuth(async (req, res, authCtx) => {
  const { id } = req.query;

  // Validar que se proporcionó un ID
  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      error: 'ID requerido',
      details: 'Debe proporcionar un ID válido de documento'
    });
  }

  // GET - Obtener detalle del documento
  if (req.method === 'GET') {
    try {
      const { data: documento, error: dbError } = await supabaseAdmin
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
          bucket,
          storage_path,
          fecha_emision,
          fecha_vencimiento,
          estado_vigencia,
          validado_por,
          fecha_validacion,
          motivo_rechazo,
          validacion_excepcional,
          validado_excepcionalmente_por,
          fecha_validacion_excepcional,
          incidencia_id,
          requiere_reconfirmacion_backoffice,
          reconfirmado_por,
          fecha_reconfirmacion,
          subido_por,
          empresa_id,
          created_at,
          updated_at,
          activo
        `)
        .eq('id', id)
        .maybeSingle();

      if (dbError) {
        return res.status(500).json({
          error: 'Error al consultar documento',
          details: dbError.message
        });
      }

      if (!documento) {
        return res.status(404).json({
          error: 'Documento no encontrado',
          details: `No se encontró un documento con ID: ${id}`
        });
      }

      // Empresa scoping: verificar que el documento pertenece a la empresa del usuario
      if (authCtx.empresaId && documento.empresa_id && documento.empresa_id !== authCtx.empresaId) {
        return res.status(403).json({ error: 'Sin acceso a este documento' });
      }

      // Calcular información adicional sobre vencimiento
      let dias_para_vencer = null;
      let estado_vencimiento = null;

      if (documento.fecha_vencimiento) {
        const hoy = new Date();
        const fechaVenc = new Date(documento.fecha_vencimiento);
        dias_para_vencer = Math.ceil((fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

        if (dias_para_vencer < 0) {
          estado_vencimiento = 'vencido';
        } else if (dias_para_vencer <= 30) {
          estado_vencimiento = 'por_vencer';
        } else {
          estado_vencimiento = 'vigente';
        }
      }

      // Obtener información de la entidad asociada
      let entidad_info = null;
      
      try {
        if (documento.entidad_tipo === 'chofer') {
          const { data: chofer } = await supabaseAdmin
            .from('choferes')
            .select('id, nombre, apellido, dni, telefono')
            .eq('id', documento.entidad_id)
            .maybeSingle();
          
          if (chofer) {
            entidad_info = {
              tipo: 'chofer',
              nombre_completo: `${chofer.nombre} ${chofer.apellido}`,
              dni: chofer.dni,
              telefono: chofer.telefono,
            };
          }
        } else if (documento.entidad_tipo === 'camion') {
          const { data: camion } = await supabaseAdmin
            .from('camiones')
            .select('id, patente, marca, modelo, anio')
            .eq('id', documento.entidad_id)
            .maybeSingle();
          
          if (camion) {
            entidad_info = {
              tipo: 'camion',
              patente: camion.patente,
              marca: camion.marca,
              modelo: camion.modelo,
              anio: camion.anio,
            };
          }
        } else if (documento.entidad_tipo === 'acoplado') {
          const { data: acoplado } = await supabaseAdmin
            .from('acoplados')
            .select('id, patente, marca, modelo')
            .eq('id', documento.entidad_id)
            .maybeSingle();
          
          if (acoplado) {
            entidad_info = {
              tipo: 'acoplado',
              patente: acoplado.patente,
              marca: acoplado.marca,
              modelo: acoplado.modelo,
            };
          }
        } else if (documento.entidad_tipo === 'transporte') {
          const { data: empresa } = await supabaseAdmin
            .from('empresas')
            .select('id, nombre, cuit, tipo_empresa')
            .eq('id', documento.entidad_id)
            .maybeSingle();
          
          if (empresa) {
            entidad_info = {
              tipo: 'transporte',
              nombre: empresa.nombre,
              cuit: empresa.cuit,
            };
          }
        }
      } catch (_err) {
        // No es crítico, continuar sin la información adicional
      }

      // Generar signed URL si tiene storage_path
      let file_url = documento.file_url;
      if (documento.storage_path && documento.bucket) {
        const { data: signedUrlData } = await supabaseAdmin.storage
          .from(documento.bucket)
          .createSignedUrl(documento.storage_path, 3600); // 1 hora
        file_url = signedUrlData?.signedUrl || null;
      }

      return res.status(200).json({
        success: true,
        data: {
          ...documento,
          file_url,
          dias_para_vencer,
          estado_vencimiento,
          entidad_info,
        }
      });

    } catch (error: any) {
      return res.status(500).json({
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  }

  // DELETE - Soft-delete (marcar como inactivo)
  else if (req.method === 'DELETE') {
    try {
      const { motivo } = req.body;

      // Verificar que el documento existe y está activo
      const { data: documentoExistente, error: checkError } = await supabaseAdmin
        .from('documentos_entidad')
        .select('id, activo, entidad_tipo, entidad_id, tipo_documento, empresa_id')
        .eq('id', id)
        .maybeSingle();

      if (checkError) {
        return res.status(500).json({
          error: 'Error al verificar documento',
          details: checkError.message
        });
      }

      if (!documentoExistente) {
        return res.status(404).json({
          error: 'Documento no encontrado',
          details: `No se encontró un documento con ID: ${id}`
        });
      }

      // Empresa scoping: verificar acceso
      if (authCtx.empresaId && documentoExistente.empresa_id && documentoExistente.empresa_id !== authCtx.empresaId) {
        return res.status(403).json({ error: 'Sin acceso a este documento' });
      }

      if (!documentoExistente.activo) {
        return res.status(400).json({
          error: 'Documento ya inactivo',
          details: 'El documento ya ha sido marcado como inactivo previamente'
        });
      }

      // Realizar soft-delete
      const { data: documentoActualizado, error: updateError } = await supabaseAdmin
        .from('documentos_entidad')
        .update({
          activo: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        return res.status(500).json({
          error: 'Error al desactivar documento',
          details: updateError.message
        });
      }

      // Registrar en auditoría (opcional, si existe tabla de auditoría)
      try {
        await supabaseAdmin
          .from('auditoria_documentos')
          .insert({
            documento_id: id,
            accion: 'reemplazo',
            estado_anterior: 'activo',
            estado_nuevo: 'inactivo',
            motivo: motivo || 'Documento eliminado por usuario',
            metadata: {
              tipo_documento: documentoExistente.tipo_documento,
              entidad_tipo: documentoExistente.entidad_tipo,
              entidad_id: documentoExistente.entidad_id,
            }
          });
      } catch (_auditError) {
        // No es crítico, continuar
      }

      return res.status(200).json({
        success: true,
        message: 'Documento desactivado exitosamente',
        data: {
          id: documentoActualizado.id,
          activo: documentoActualizado.activo,
          updated_at: documentoActualizado.updated_at,
        }
      });

    } catch (error: any) {
      return res.status(500).json({
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  }

  // Método no permitido
  else {
    return res.status(405).json({ 
      error: 'Método no permitido',
      details: 'Solo se permiten los métodos GET y DELETE'
    });
  }
});
