import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Usar service role para ejecutar DDL
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔧 Iniciando migración de origen_asignacion...');

    // Ejecutar SQL directo
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      sql_string: `
        -- Agregar columna a despachos
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='despachos' AND column_name='origen_asignacion'
          ) THEN
            ALTER TABLE despachos 
            ADD COLUMN origen_asignacion VARCHAR(20) DEFAULT 'directo' 
            CHECK (origen_asignacion IN ('directo', 'red_nodexia'));
            
            CREATE INDEX idx_despachos_origen_asignacion 
            ON despachos(origen_asignacion);
            
            RAISE NOTICE 'Columna origen_asignacion agregada a despachos';
          ELSE
            RAISE NOTICE 'Columna origen_asignacion ya existe en despachos';
          END IF;
        END $$;

        -- Agregar columna a viajes_despacho
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='viajes_despacho' AND column_name='origen_asignacion'
          ) THEN
            ALTER TABLE viajes_despacho 
            ADD COLUMN origen_asignacion VARCHAR(20) DEFAULT 'directo' 
            CHECK (origen_asignacion IN ('directo', 'red_nodexia'));
            
            CREATE INDEX idx_viajes_despacho_origen_asignacion 
            ON viajes_despacho(origen_asignacion);
            
            RAISE NOTICE 'Columna origen_asignacion agregada a viajes_despacho';
          ELSE
            RAISE NOTICE 'Columna origen_asignacion ya existe en viajes_despacho';
          END IF;
        END $$;
      `
    });

    if (error) {
      console.error('❌ Error ejecutando migración:', error);
      return res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }

    console.log('✅ Migración completada exitosamente');

    return res.status(200).json({ 
      success: true, 
      message: 'Campo origen_asignacion agregado correctamente',
      data
    });

  } catch (error: any) {
    console.error('💥 Error en migración:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Error ejecutando migración' 
    });
  }
}
