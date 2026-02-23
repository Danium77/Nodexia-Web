// pages/api/documentacion/preview-url.ts
// API para generar URL firmada de documentos.
// Permiso: verificado vía RLS en documentos_entidad (get_visible_*_ids)
// Storage: requiere service role para signed URLs (operación legítima de backend)

import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createUserSupabaseClient } from '@/lib/supabaseServerClient';
import { withAuth } from '@/lib/middleware/withAuth';

export default withAuth(async (req, res, authCtx) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const file_url = req.method === 'GET' 
      ? req.query.file_url as string 
      : (req.body as { file_url: string }).file_url;

    console.log('🔍 Preview URL request:', { file_url, rol: authCtx.rolInterno, empresaId: authCtx.empresaId });

    if (!file_url || typeof file_url !== 'string') {
      return res.status(400).json({ error: 'file_url es requerido' });
    }

    // Validar que el path no contenga traversal attacks
    if (file_url.includes('..') || file_url.startsWith('/')) {
      return res.status(400).json({ error: 'Ruta de archivo inválida' });
    }

    // Verificar permiso vía RLS: si el usuario puede ver el documento,
    // la query retorna el registro. Si no, RLS lo filtra.
    const supabaseUser = createUserSupabaseClient(authCtx.token);
    const { data: doc } = await supabaseUser
      .from('documentos_entidad')
      .select('id')
      .eq('file_url', file_url)
      .limit(1)
      .maybeSingle();

    if (!doc) {
      console.error('❌ Documento no encontrado o sin acceso (RLS)');
      return res.status(403).json({ error: 'No tiene acceso a este documento' });
    }

    console.log('✅ Permiso verificado por RLS, generando URL firmada...');

    // Generar signed URL con service role (operación de backend para storage)
    const { data, error } = await supabaseAdmin.storage
      .from('documentacion-entidades')
      .createSignedUrl(file_url, 600); // 10 minutos

    if (error) {
      console.error('❌ Error de storage:', error);
      return res.status(500).json({ error: 'Error al generar URL de vista previa', details: error.message });
    }

    console.log('✅ URL firmada generada correctamente');
    return res.status(200).json({ signedUrl: data.signedUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    console.error('❌ Error en preview-url:', err);
    return res.status(500).json({ error: 'Error interno', details: message });
  }
});
