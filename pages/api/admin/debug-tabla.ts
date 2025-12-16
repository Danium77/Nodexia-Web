import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    console.log('🔍 Consultando estructura de usuarios_empresa...');

    // Hacer una consulta simple para ver qué columnas hay
    const { data: sample, error: sampleError } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('❌ Error consultando usuarios_empresa:', sampleError);
    } else {
      console.log('✅ Estructura de usuarios_empresa:', sample?.[0] ? Object.keys(sample[0]) : 'Tabla vacía');
    }

    // También intentar obtener información de la tabla
    const { data: allData } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('*')
      .limit(3);

    return res.status(200).json({
      message: 'Información de tabla usuarios_empresa',
      estructura: sample?.[0] ? Object.keys(sample[0]) : 'Tabla vacía',
      muestra_datos: allData,
      total_registros: allData?.length || 0,
      error: sampleError?.message || null
    });

  } catch (error) {
    console.error('❌ Error general:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}