import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import type { UbicacionAutocomplete } from '@/types/ubicaciones';

// 🔥 Usar Service Role Key para acceso completo desde el servidor
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * API: Buscar ubicaciones para autocomplete
 * GET /api/ubicaciones/buscar?tipo=origen|destino&q=termino
 * 
 * Busca SOLO ubicaciones vinculadas a la empresa del usuario
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UbicacionAutocomplete[] | { error: string }>
) {
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

    console.log(`🔍 Buscando ubicaciones: tipo=${tipo}, termino="${termino}"`);

    // Obtener el usuario autenticado
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log('❌ No hay token de autenticación');
      return res.status(401).json({ error: 'No autenticado' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.log('❌ Token inválido o usuario no encontrado');
      return res.status(401).json({ error: 'No autenticado' });
    }

    console.log('✅ Usuario autenticado:', user.id);

    // Obtener empresa del usuario
    const { data: usuarioEmpresa, error: userEmpresaError } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('empresa_id')
      .eq('user_id', user.id)
      .single();

    if (userEmpresaError || !usuarioEmpresa) {
      console.log('⚠️ Usuario sin empresa asignada');
      return res.status(404).json({ error: 'Usuario sin empresa asignada' });
    }

    console.log('✅ Empresa del usuario:', usuarioEmpresa.empresa_id);

    // 🔥 Buscar ubicaciones VINCULADAS a la empresa del usuario
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
      .eq('empresa_id', usuarioEmpresa.empresa_id)
      .eq('activo', true);

    // Filtrar por tipo de ubicación si es necesario
    if (tipo === 'origen') {
      query = query.eq('es_origen', true);
    } else if (tipo === 'destino') {
      query = query.eq('es_destino', true);
    }

    const { data: vinculos, error } = await query.limit(50);
    
    if (error) {
      console.error('❌ Error buscando vínculos:', error);
      return res.status(500).json({ error: 'Error al buscar ubicaciones' });
    }

    // Extraer ubicaciones de los vínculos
    const ubicaciones = vinculos
      ?.map((v: any) => v.ubicaciones)
      .filter((u: any) => u !== null) || [];

    // Filtrar por término de búsqueda si existe
    let resultados = ubicaciones;
    if (termino && termino.length >= 2) {
      const terminoLower = termino.toLowerCase();
      resultados = ubicaciones.filter((u: any) => 
        u.nombre?.toLowerCase().includes(terminoLower) ||
        u.ciudad?.toLowerCase().includes(terminoLower) ||
        u.direccion?.toLowerCase().includes(terminoLower) ||
        u.cuit?.includes(termino)
      );
    }

    console.log(`✅ Encontradas ${resultados.length} ubicaciones vinculadas`);
    if (resultados.length > 0) {
      console.log('Primera ubicación:', resultados[0]);
    }
    
    return res.status(200).json(resultados);

  } catch (error) {
    console.error('❌ Error en API buscar ubicaciones:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
