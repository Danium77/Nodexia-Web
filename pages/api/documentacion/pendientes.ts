// pages/api/documentacion/pendientes.ts
// API para listar documentos pendientes de validación con info de entidad (solo Admin Nodexia / Super Admin)

import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface DocumentoPendiente {
  id: string;
  entidad_tipo: string;
  entidad_id: string;
  tipo_documento: string;
  nombre_archivo: string;
  file_size: number | null;
  mime_type: string | null;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  estado_vigencia: string;
  subido_por: string;
  empresa_id: string;
  created_at: string;
  storage_path: string | null;
  bucket: string | null;
  file_url: string | null;
  entidad_info: Record<string, unknown> | null;
  empresa_nombre: string | null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // ── Auth ──
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    // ── Verificar rol: solo super_admin / admin_nodexia ──
    const { data: roles } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('rol_interno')
      .eq('user_id', user.id)
      .eq('activo', true)
      .maybeSingle();

    const { data: isSuperAdmin } = await supabaseAdmin
      .from('super_admins')
      .select('id')
      .eq('user_id', user.id)
      .eq('activo', true)
      .maybeSingle();

    const esAdmin = !!isSuperAdmin || roles?.rol_interno === 'admin_nodexia';
    if (!esAdmin) {
      return res.status(403).json({ error: 'Sin permisos' });
    }

    // ── Query params opcionales ──
    const { empresa_id, entidad_tipo } = req.query;

    // Validar entidad_tipo si se proporciona
    if (entidad_tipo) {
      const tiposValidos = ['chofer', 'camion', 'acoplado', 'transporte'];
      if (!tiposValidos.includes(entidad_tipo as string)) {
        return res.status(400).json({
          error: 'Tipo de entidad inválido',
          details: `entidad_tipo debe ser uno de: ${tiposValidos.join(', ')}`,
        });
      }
    }

    // ── Consultar documentos pendientes ──
    let query = supabaseAdmin
      .from('documentos_entidad')
      .select(`
        id,
        entidad_tipo,
        entidad_id,
        tipo_documento,
        nombre_archivo,
        file_size,
        mime_type,
        fecha_emision,
        fecha_vencimiento,
        estado_vigencia,
        subido_por,
        empresa_id,
        created_at,
        storage_path,
        bucket
      `)
      .eq('estado_vigencia', 'pendiente_validacion')
      .eq('activo', true)
      .order('created_at', { ascending: true }); // Más antiguos primero

    if (empresa_id && typeof empresa_id === 'string') {
      query = query.eq('empresa_id', empresa_id);
    }

    if (entidad_tipo && typeof entidad_tipo === 'string') {
      query = query.eq('entidad_tipo', entidad_tipo);
    }

    const { data: documentos, error: dbError } = await query;

    if (dbError) {
      console.error('Error al consultar documentos pendientes:', dbError);
      return res.status(500).json({
        error: 'Error al consultar documentos pendientes',
        details: dbError.message,
      });
    }

    if (!documentos || documentos.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          total: 0,
          documentos: [],
        },
      });
    }

    // ── Enriquecer con info de entidad y signed URLs ──
    const documentosEnriquecidos: DocumentoPendiente[] = await Promise.all(
      documentos.map(async (doc) => {
        // Generar signed URL
        let fileUrl: string | null = null;
        if (doc.storage_path && doc.bucket) {
          const { data: signedUrlData } = await supabaseAdmin.storage
            .from(doc.bucket)
            .createSignedUrl(doc.storage_path, 3600); // 1 hora
          fileUrl = signedUrlData?.signedUrl || null;
        }

        // Obtener info de la entidad según tipo
        let entidadInfo: Record<string, unknown> | null = null;

        if (doc.entidad_tipo === 'chofer') {
          const { data: chofer } = await supabaseAdmin
            .from('choferes')
            .select('id, nombre, apellido, dni, telefono')
            .eq('id', doc.entidad_id)
            .single();
          entidadInfo = chofer ? { ...chofer, label: `${chofer.nombre} ${chofer.apellido}` } : null;
        } else if (doc.entidad_tipo === 'camion') {
          const { data: camion } = await supabaseAdmin
            .from('camiones')
            .select('id, patente, marca, modelo, anio')
            .eq('id', doc.entidad_id)
            .single();
          entidadInfo = camion ? { ...camion, label: camion.patente } : null;
        } else if (doc.entidad_tipo === 'acoplado') {
          const { data: acoplado } = await supabaseAdmin
            .from('acoplados')
            .select('id, patente, tipo, marca')
            .eq('id', doc.entidad_id)
            .single();
          entidadInfo = acoplado ? { ...acoplado, label: acoplado.patente } : null;
        } else if (doc.entidad_tipo === 'transporte') {
          const { data: empresa } = await supabaseAdmin
            .from('empresas')
            .select('id, nombre, cuit, tipo_empresa')
            .eq('id', doc.entidad_id)
            .maybeSingle();
          entidadInfo = empresa ? { ...empresa, label: empresa.nombre } : null;
        }

        // Obtener nombre de empresa
        let empresaNombre: string | null = null;
        if (doc.empresa_id) {
          const { data: emp } = await supabaseAdmin
            .from('empresas')
            .select('nombre')
            .eq('id', doc.empresa_id)
            .maybeSingle();
          empresaNombre = emp?.nombre || null;
        }

        return {
          id: doc.id,
          entidad_tipo: doc.entidad_tipo,
          entidad_id: doc.entidad_id,
          tipo_documento: doc.tipo_documento,
          nombre_archivo: doc.nombre_archivo,
          file_size: doc.file_size,
          mime_type: doc.mime_type,
          fecha_emision: doc.fecha_emision,
          fecha_vencimiento: doc.fecha_vencimiento,
          estado_vigencia: doc.estado_vigencia,
          subido_por: doc.subido_por,
          empresa_id: doc.empresa_id,
          created_at: doc.created_at,
          storage_path: doc.storage_path,
          bucket: doc.bucket,
          file_url: fileUrl,
          entidad_info: entidadInfo,
          empresa_nombre: empresaNombre,
        };
      }),
    );

    // ── Resumen por tipo de entidad ──
    const resumenPorTipo = documentosEnriquecidos.reduce(
      (acc, doc) => {
        acc[doc.entidad_tipo] = (acc[doc.entidad_tipo] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return res.status(200).json({
      success: true,
      data: {
        total: documentosEnriquecidos.length,
        resumen_por_tipo: resumenPorTipo,
        documentos: documentosEnriquecidos,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error al listar documentos pendientes:', message);
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: message,
    });
  }
}
