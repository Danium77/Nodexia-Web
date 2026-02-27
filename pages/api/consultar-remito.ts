// pages/api/consultar-remito.ts
// API route to check if a remito exists for a viaje (uses service_role to bypass RLS)
import type { NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/middleware/withAuth';

export default withAuth(async (req, res, authCtx) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const viajeId = req.query.viaje_id as string;
    if (!viajeId) {
      return res.status(400).json({ error: 'Missing viaje_id' });
    }

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

    // Query documentos_viaje_seguro (admin needed for storage signed URLs)
    const { data, error } = await supabaseAdmin
      .from('documentos_viaje_seguro')
      .select('id, file_url, nombre_archivo, tipo, created_at')
      .eq('viaje_id', viajeId)
      .eq('tipo', 'remito')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      found: !!data,
      remito: data,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});
