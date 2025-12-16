import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // 1. Verificar relaciones_empresas
    const { data: relaciones, error: relError } = await supabase
      .from('relaciones_empresas')
      .select('*');

    // 2. Verificar empresas plantas
    const { data: plantas, error: plantasError } = await supabase
      .from('empresas')
      .select('id, nombre, tipo_empresa, cuit')
      .neq('tipo_empresa', 'transporte');

    // 3. Verificar empresas transportes
    const { data: transportes, error: transportesError } = await supabase
      .from('empresas')
      .select('id, nombre, tipo_empresa, cuit')
      .eq('tipo_empresa', 'transporte');

    // 4. Verificar estructura de relaciones_empresas (columnas)
    const { data: sampleRelacion } = await supabase
      .from('relaciones_empresas')
      .select('*')
      .limit(1)
      .single();

    res.status(200).json({
      relaciones: {
        count: relaciones?.length || 0,
        data: relaciones,
        error: relError,
        columns: sampleRelacion ? Object.keys(sampleRelacion) : []
      },
      plantas: {
        count: plantas?.length || 0,
        data: plantas,
        error: plantasError
      },
      transportes: {
        count: transportes?.length || 0,
        data: transportes,
        error: transportesError
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
