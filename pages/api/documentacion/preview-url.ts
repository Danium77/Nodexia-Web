// pages/api/documentacion/preview-url.ts
// API para generar URL firmada de documentos usando service role (bypasses storage RLS)
// Usado por: validacion-documentos.tsx modal preview

import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/middleware/withAuth';

export default withAuth(async (req, res, authCtx) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const file_url = req.method === 'GET' 
      ? req.query.file_url as string 
      : (req.body as { file_url: string }).file_url;

    if (!file_url || typeof file_url !== 'string') {
      return res.status(400).json({ error: 'file_url es requerido' });
    }

    // Validar que el path no contenga traversal attacks
    if (file_url.includes('..') || file_url.startsWith('/')) {
      return res.status(400).json({ error: 'Ruta de archivo inválida' });
    }

    // Verificar que el documento pertenece a la empresa del usuario
    // (buscar en documentos_entidad que el file_url corresponda a un doc de su empresa)
    if (authCtx.empresaId) {
      const { data: doc } = await supabaseAdmin
        .from('documentos_entidad')
        .select('id')
        .eq('file_url', file_url)
        .eq('empresa_id', authCtx.empresaId)
        .limit(1)
        .maybeSingle();

      // Si no es admin_nodexia y no encontró doc de su empresa, denegar
      if (!doc && authCtx.rolInterno !== 'admin_nodexia') {
        return res.status(403).json({ error: 'No tiene acceso a este documento' });
      }
    }

    // Generar signed URL con service role (bypasses storage RLS)
    const { data, error } = await supabaseAdmin.storage
      .from('documentacion-entidades')
      .createSignedUrl(file_url, 600); // 10 minutos

    if (error) {
      return res.status(500).json({ error: 'Error al generar URL de vista previa', details: error.message });
    }

    return res.status(200).json({ signedUrl: data.signedUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return res.status(500).json({ error: 'Error interno', details: message });
  }
});
