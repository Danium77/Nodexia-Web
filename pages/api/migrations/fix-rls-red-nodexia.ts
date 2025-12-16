import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔧 Iniciando fix de RLS para Red Nodexia...');

    // Leer el archivo SQL
    const sqlPath = path.join(process.cwd(), 'sql', 'migrations', '014_fix_rls_red_nodexia.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Dividir por statement (simple split por ';')
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    console.log(`📝 Ejecutando ${statements.length} statements...`);

    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    for (const statement of statements) {
      // Saltar comentarios y statements vacíos
      if (statement.startsWith('DO $$') || statement.startsWith('SELECT')) {
        console.log('⏩ Saltando statement de verificación');
        continue;
      }

      try {
        const { error } = await supabaseAdmin.rpc('exec_sql', {
          sql_string: statement + ';'
        });

        if (error) {
          console.error(`❌ Error en statement:`, error);
          errorCount++;
          errors.push({ statement: statement.substring(0, 100), error: error.message });
        } else {
          successCount++;
        }
      } catch (err: any) {
        console.error(`💥 Exception en statement:`, err);
        errorCount++;
        errors.push({ statement: statement.substring(0, 100), error: err.message });
      }
    }

    if (errorCount === 0) {
      console.log('✅ Migración completada exitosamente');
      return res.status(200).json({
        success: true,
        message: 'Políticas RLS de Red Nodexia corregidas exitosamente',
        stats: {
          total: statements.length,
          success: successCount,
          errors: errorCount
        }
      });
    } else {
      console.warn(`⚠️ Migración completada con errores: ${errorCount}`);
      return res.status(200).json({
        success: false,
        message: 'Migración completada con algunos errores',
        stats: {
          total: statements.length,
          success: successCount,
          errors: errorCount
        },
        errors
      });
    }

  } catch (error: any) {
    console.error('💥 Error en migración:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error ejecutando migración'
    });
  }
}
