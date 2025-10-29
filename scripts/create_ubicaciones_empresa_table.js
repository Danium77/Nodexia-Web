// Script para crear la tabla ubicaciones_empresa
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTable() {
  console.log('🔨 Creando tabla ubicaciones_empresa...\n');
  
  const sql = `
-- Crear tabla ubicaciones_empresa
CREATE TABLE IF NOT EXISTS ubicaciones_empresa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  ubicacion_id UUID NOT NULL REFERENCES ubicaciones(id) ON DELETE CASCADE,
  es_origen BOOLEAN DEFAULT true,
  es_destino BOOLEAN DEFAULT true,
  alias VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, ubicacion_id)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_ubicaciones_empresa_empresa ON ubicaciones_empresa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ubicaciones_empresa_ubicacion ON ubicaciones_empresa(ubicacion_id);

-- RLS (Row Level Security)
ALTER TABLE ubicaciones_empresa ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Ver ubicaciones de mi empresa" ON ubicaciones_empresa;
DROP POLICY IF EXISTS "Insertar ubicaciones de mi empresa" ON ubicaciones_empresa;
DROP POLICY IF EXISTS "Actualizar ubicaciones de mi empresa" ON ubicaciones_empresa;
DROP POLICY IF EXISTS "Eliminar ubicaciones de mi empresa" ON ubicaciones_empresa;

-- Políticas RLS
CREATE POLICY "Ver ubicaciones de mi empresa" ON ubicaciones_empresa
  FOR SELECT USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Insertar ubicaciones de mi empresa" ON ubicaciones_empresa
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Actualizar ubicaciones de mi empresa" ON ubicaciones_empresa
  FOR UPDATE USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Eliminar ubicaciones de mi empresa" ON ubicaciones_empresa
  FOR DELETE USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid()
    )
  );
  `;

  try {
    const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // Si no existe la función exec_sql, intentar crear directamente
      console.log('⚠️ No se pudo ejecutar con RPC, necesitas ejecutar el SQL manualmente en Supabase Dashboard');
      console.log('\n📋 SQL a ejecutar:\n');
      console.log(sql);
      console.log('\n📍 Ve a: https://supabase.com/dashboard → SQL Editor → pega el SQL de arriba');
    } else {
      console.log('✅ Tabla ubicaciones_empresa creada exitosamente!');
    }
  } catch (err) {
    console.log('⚠️ Error ejecutando SQL directamente');
    console.log('\n📋 Ejecuta este SQL manualmente en Supabase Dashboard:\n');
    console.log(sql);
    console.log('\n📍 Ve a: https://supabase.com/dashboard → SQL Editor');
  }
}

createTable().then(() => process.exit(0));
