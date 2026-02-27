// pages/api/viajes/[id]/remito.ts
// API para obtener la foto del remito de un viaje
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/middleware/withAuth';

export default withAuth(async (req: NextApiRequest, res: NextApiResponse, authCtx) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id: viajeId } = req.query;

  if (!viajeId || typeof viajeId !== 'string') {
    return res.status(400).json({ error: 'viaje_id requerido' });
  }

  try {
    // Verificar que el usuario tiene acceso al viaje
    if (authCtx.empresaId && authCtx.rolInterno !== 'admin_nodexia') {
      const { data: viajeAccess } = await supabaseAdmin
        .from('viajes_despacho')
        .select('id, id_transporte, despachos!inner(empresa_id, origen_empresa_id, destino_empresa_id)')
        .eq('id', viajeId)
        .maybeSingle();

      if (!viajeAccess) {
        return res.status(404).json({ error: 'Viaje no encontrado' });
      }

      const despacho = viajeAccess.despachos as any;
      const empresasPermitidas = [
        despacho?.empresa_id, despacho?.origen_empresa_id,
        despacho?.destino_empresa_id, viajeAccess.id_transporte,
      ].filter(Boolean);

      if (!empresasPermitidas.includes(authCtx.empresaId)) {
        return res.status(403).json({ error: 'No tenés acceso a este viaje' });
      }
    }

    // 1. Buscar en documentos_viaje_seguro
    const { data: doc, error: docError } = await supabaseAdmin
      .from('documentos_viaje_seguro')
      .select('file_url, storage_path, nombre_archivo, fecha_emision, subido_por')
      .eq('viaje_id', viajeId)
      .eq('tipo', 'remito')
      .order('fecha_emision', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (docError) {
      console.error('❌ [remito] Error buscando doc:', docError);
    }

    if (doc) {
      // Generar signed URL si hay storage_path
      let signedUrl = doc.file_url;
      if (doc.storage_path) {
        const { data: signed } = await supabaseAdmin.storage
          .from('remitos')
          .createSignedUrl(doc.storage_path, 3600); // 1 hora
        if (signed?.signedUrl) {
          signedUrl = signed.signedUrl;
        }
      }

      return res.status(200).json({
        found: true,
        url: signedUrl,
        nombre_archivo: doc.nombre_archivo,
        fecha: doc.fecha_emision,
        subido_por: doc.subido_por,
      });
    }

    // 2. Fallback: buscar directamente en storage bucket remitos/{viajeId}/
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from('remitos')
      .list(viajeId, { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });

    if (listError) {
      console.error('❌ [remito] Error listando storage:', listError);
    }

    if (files && files.length > 0) {
      const storagePath = `${viajeId}/${files[0].name}`;
      const { data: signed } = await supabaseAdmin.storage
        .from('remitos')
        .createSignedUrl(storagePath, 3600);

      return res.status(200).json({
        found: true,
        url: signed?.signedUrl || null,
        nombre_archivo: files[0].name,
        fecha: files[0].created_at,
      });
    }

    return res.status(200).json({ found: false });
  } catch (error: any) {
    console.error('❌ [remito] Exception:', error);
    return res.status(500).json({ error: error.message || 'Error interno' });
  }
});
