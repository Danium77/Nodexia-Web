import type { NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/middleware/withAuth';
import { createUserSupabaseClient } from '@/lib/supabaseServerClient';
import type { UbicacionAutocomplete } from '@/types/ubicaciones';

/**
 * API: Buscar ubicaciones para autocomplete
 * GET /api/ubicaciones/buscar?tipo=origen|destino&q=termino
 * 
 * Busca SOLO ubicaciones vinculadas a la empresa del usuario
 */
export default withAuth(async (
  req,
  res: NextApiResponse<UbicacionAutocomplete[] | { error: string }>,
  { empresaId, tipoEmpresa, token }
) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Obtener parámetros
    const { tipo, q } = req.query;
    
    if (!tipo || (tipo !== 'origen' && tipo !== 'destino')) {
      return res.status(400).json({ error: 'Parámetro "tipo" requerido (origen|destino)' });
    }

    const termino = (q as string) || '';

    if (!empresaId) {
      return res.status(404).json({ error: 'Usuario sin empresa asignada' });
    }

    const esTransporte = String(tipoEmpresa || '').toLowerCase() === 'transporte';

    let ubicaciones: any[] = [];

    if (esTransporte) {
      // Transport companies can see all ubicaciones in the system
      // They pick up / deliver to multiple plants and clients
      let query = supabaseAdmin
        .from('ubicaciones')
        .select('id, nombre, direccion, ciudad, provincia, tipo, cuit')
        .eq('activo', true);

      if (termino && termino.length >= 2) {
        query = query.or(`nombre.ilike.%${termino}%,ciudad.ilike.%${termino}%,direccion.ilike.%${termino}%`);
      }

      const { data, error } = await query.limit(50);
      if (error) {
        return res.status(500).json({ error: 'Error al buscar ubicaciones' });
      }
      ubicaciones = data || [];
    } else {
      // Plant/other companies: only ubicaciones linked via empresa_ubicaciones
      let query = supabaseAdmin
        .from('empresa_ubicaciones')
        .select(`
          ubicaciones (
            id,
            nombre,
            direccion,
            ciudad,
            provincia,
            tipo,
            cuit
          )
        `)
        .eq('empresa_id', empresaId)
        .eq('activo', true);

      if (tipo === 'origen') {
        query = query.eq('es_origen', true);
      } else if (tipo === 'destino') {
        query = query.eq('es_destino', true);
      }

      const { data: vinculos, error } = await query.limit(50);
      if (error) {
        return res.status(500).json({ error: 'Error al buscar ubicaciones' });
      }
      ubicaciones = vinculos?.map((v: any) => v.ubicaciones).filter((u: any) => u !== null) || [];

      // Filter by search term for non-transport
      if (termino && termino.length >= 2) {
        const terminoLower = termino.toLowerCase();
        ubicaciones = ubicaciones.filter((u: any) =>
          u.nombre?.toLowerCase().includes(terminoLower) ||
          u.ciudad?.toLowerCase().includes(terminoLower) ||
          u.direccion?.toLowerCase().includes(terminoLower) ||
          u.cuit?.includes(termino)
        );
      }
    }
    
    return res.status(200).json(ubicaciones);

  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});
