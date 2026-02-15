// pages/api/documentacion/upload.ts
// API para subir documentación de entidades (choferes, camiones, acoplados, transportes)

import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/middleware/withAuth';
import formidable from 'formidable';
import fs from 'fs';

// Configuración para desactivar el body parser por defecto de Next.js
export const config = {
  api: {
    bodyParser: false,
  },
};

interface DocumentMetadata {
  entidad_tipo: 'chofer' | 'camion' | 'acoplado' | 'transporte';
  entidad_id: string;
  tipo_documento: string;
  fecha_emision: string;
  fecha_vencimiento?: string;
  empresa_id: string;
  subido_por: string;
}

export default withAuth(async (req, res, authCtx) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {

    // Parsear el FormData
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB (límite del bucket)
      allowEmptyFiles: false,
      filter: function ({ mimetype }) {
        // Validar tipos MIME permitidos
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        return allowedTypes.includes(mimetype || '');
      },
    });

    const [fields, files] = await form.parse(req);

    // Validar que se envió un archivo
    if (!files.archivo || !files.archivo[0]) {
      return res.status(400).json({
        error: 'Archivo requerido',
        details: 'Debe enviar un archivo bajo el campo "archivo"'
      });
    }

    const archivo = files.archivo[0];

    // Validar metadata requerida
    const metadata: DocumentMetadata = {
      entidad_tipo: fields.entidad_tipo?.[0] as any,
      entidad_id: fields.entidad_id?.[0] || '',
      tipo_documento: fields.tipo_documento?.[0] || '',
      fecha_emision: fields.fecha_emision?.[0] || '',
      fecha_vencimiento: fields.fecha_vencimiento?.[0],
      empresa_id: authCtx.empresaId || fields.empresa_id?.[0] || '',
      subido_por: authCtx.userId,
    };

    // Validar campos requeridos (fecha_emision ya no es obligatoria, la asigna admin al validar)
    if (!metadata.entidad_tipo || !metadata.entidad_id || !metadata.tipo_documento || 
        !metadata.empresa_id) {
      return res.status(400).json({
        error: 'Campos requeridos faltantes',
        details: 'Debe proporcionar: entidad_tipo, entidad_id, tipo_documento, empresa_id'
      });
    }

    // Validar entidad_tipo
    const tiposValidos = ['chofer', 'camion', 'acoplado', 'transporte'];
    if (!tiposValidos.includes(metadata.entidad_tipo)) {
      return res.status(400).json({
        error: 'Tipo de entidad inválido',
        details: `entidad_tipo debe ser uno de: ${tiposValidos.join(', ')}`
      });
    }

    // Validar formato de fechas (opcionales - las asigna admin al validar)
    if (metadata.fecha_emision) {
      const fechaEmisionDate = new Date(metadata.fecha_emision);
      if (isNaN(fechaEmisionDate.getTime())) {
        return res.status(400).json({
          error: 'Fecha de emisión inválida',
          details: 'fecha_emision debe estar en formato YYYY-MM-DD'
        });
      }

      if (metadata.fecha_vencimiento) {
        const fechaVencimientoDate = new Date(metadata.fecha_vencimiento);
        if (isNaN(fechaVencimientoDate.getTime())) {
          return res.status(400).json({
            error: 'Fecha de vencimiento inválida',
            details: 'fecha_vencimiento debe estar en formato YYYY-MM-DD'
          });
        }
        
        if (fechaVencimientoDate <= fechaEmisionDate) {
          return res.status(400).json({
            error: 'Fechas inválidas',
            details: 'fecha_vencimiento debe ser posterior a fecha_emision'
          });
        }
      }
    }

    // Construir storage_path: {empresa_id}/{entidad_tipo}/{entidad_id}/{tipo_documento}_{timestamp}.{ext}
    const timestamp = Date.now();
    const extension = archivo.originalFilename?.split('.').pop() || 'pdf';
    const storage_path = `${metadata.empresa_id}/${metadata.entidad_tipo}/${metadata.entidad_id}/${metadata.tipo_documento}_${timestamp}.${extension}`;

    // Leer el archivo
    const fileBuffer = fs.readFileSync(archivo.filepath);

    // Subir a Supabase Storage (auto-crear bucket si no existe)
    const bucketName = 'documentacion-entidades';
    
    let { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(storage_path, fileBuffer, {
        contentType: archivo.mimetype || 'application/pdf',
        upsert: false,
      });

    // Si el bucket no existe, crearlo y reintentar
    if (storageError && (storageError.message?.includes('not found') || storageError.message?.includes('Bucket not found') || (storageError as any).statusCode === 404)) {
      console.log(`📁 Bucket "${bucketName}" no existe, creándolo...`);
      
      const { error: createBucketError } = await supabaseAdmin.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
      });
      
      if (createBucketError && !createBucketError.message?.includes('already exists')) {
        return res.status(500).json({
          error: 'Error al crear bucket de almacenamiento',
          details: createBucketError.message
        });
      }
      
      // Reintentar upload
      const retryResult = await supabaseAdmin.storage
        .from(bucketName)
        .upload(storage_path, fileBuffer, {
          contentType: archivo.mimetype || 'application/pdf',
          upsert: false,
        });
      
      storageData = retryResult.data;
      storageError = retryResult.error;
    }

    if (storageError) {
      return res.status(500).json({
        error: 'Error al subir archivo',
        details: storageError.message
      });
    }

    // No usar getPublicUrl - el bucket es privado
    // Se generarán signed URLs al momento de visualizar

    // Desactivar documentos activos previos del mismo tipo (si existen)
    // Primero, borrar inactivos viejos para evitar conflicto de UNIQUE constraint
    // (si aún tiene el UNIQUE no-parcial de la migración 046, borrar inactivos previene duplicados)
    const { error: cleanupError } = await supabaseAdmin
      .from('documentos_entidad')
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq('entidad_tipo', metadata.entidad_tipo)
      .eq('entidad_id', metadata.entidad_id)
      .eq('tipo_documento', metadata.tipo_documento)
      .eq('activo', true);

    if (cleanupError) {
      // Si falla por UNIQUE en activo=false, intentar eliminar inactivos antiguos
      const { error: deleteOldError } = await supabaseAdmin
        .from('documentos_entidad')
        .delete()
        .eq('entidad_tipo', metadata.entidad_tipo)
        .eq('entidad_id', metadata.entidad_id)
        .eq('tipo_documento', metadata.tipo_documento)
        .eq('activo', false);
      
      if (deleteOldError) {
        // Noop: error eliminando docs inactivos antiguos no es bloqueante
      }

      // Reintentar desactivación
      const { error: retryError } = await supabaseAdmin
        .from('documentos_entidad')
        .update({ activo: false, updated_at: new Date().toISOString() })
        .eq('entidad_tipo', metadata.entidad_tipo)
        .eq('entidad_id', metadata.entidad_id)
        .eq('tipo_documento', metadata.tipo_documento)
        .eq('activo', true);

      if (retryError) {
        // Noop: retry de desactivación no es bloqueante
      }
    }

    // Insertar registro en tabla documentos_entidad
    // fecha_emision: si no se proporcionó, usar fecha actual como fallback
    // (la fecha real se puede corregir al validar)
    const fechaEmisionFinal = metadata.fecha_emision || new Date().toISOString().split('T')[0];
    
    const { data: documento, error: dbError } = await supabaseAdmin
      .from('documentos_entidad')
      .insert({
        entidad_tipo: metadata.entidad_tipo,
        entidad_id: metadata.entidad_id,
        tipo_documento: metadata.tipo_documento,
        nombre_archivo: archivo.originalFilename || `documento_${timestamp}`,
        file_url: storage_path, // Bucket privado: se generan signed URLs bajo demanda
        file_size: archivo.size,
        mime_type: archivo.mimetype,
        bucket: bucketName,
        storage_path: storage_path,
        fecha_emision: fechaEmisionFinal,
        fecha_vencimiento: metadata.fecha_vencimiento || null,
        estado_vigencia: 'pendiente_validacion',
        subido_por: metadata.subido_por,
        empresa_id: metadata.empresa_id,
        activo: true,
      })
      .select()
      .single();

    if (dbError) {
      
      // Intentar eliminar el archivo del storage si falla la inserción en BD
      await supabaseAdmin.storage
        .from(bucketName)
        .remove([storage_path]);

      return res.status(500).json({
        error: 'Error al registrar documento',
        details: dbError.message,
        code: dbError.code,
        hint: dbError.hint
      });
    }

    // Limpiar archivo temporal
    try {
      fs.unlinkSync(archivo.filepath);
    } catch (_err) {
      // No es crítico si la limpieza del temporal falla
    }

    return res.status(201).json({
      success: true,
      data: {
        id: documento.id,
        nombre_archivo: documento.nombre_archivo,
        file_url: documento.file_url,
        tipo_documento: documento.tipo_documento,
        estado_vigencia: documento.estado_vigencia,
        fecha_emision: documento.fecha_emision,
        fecha_vencimiento: documento.fecha_vencimiento,
        created_at: documento.created_at,
      }
    });

  } catch (error: any) {
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});
