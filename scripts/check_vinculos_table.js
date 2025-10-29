// Script para verificar la estructura de vinculación de ubicaciones
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStructure() {
  console.log('🔍 Verificando estructura de vinculación de ubicaciones...\n');
  
  // Verificar si existe tabla ubicaciones_empresa
  const { data: tables, error: tablesError } = await supabase
    .rpc('get_tables_list', {});
  
  if (tablesError) {
    console.log('⚠️ No se pudo verificar con RPC, intentando consulta directa...\n');
  }
  
  // Intentar consultar la tabla directamente
  const { data, error } = await supabase
    .from('ubicaciones_empresa')
    .select('*')
    .limit(1);
  
  if (error) {
    console.log('❌ La tabla ubicaciones_empresa NO existe o no es accesible');
    console.log('Error:', error.message);
    console.log('\n📝 Necesitamos crear la tabla. Aquí está el SQL:\n');
    console.log(`
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
CREATE INDEX idx_ubicaciones_empresa_empresa ON ubicaciones_empresa(empresa_id);
CREATE INDEX idx_ubicaciones_empresa_ubicacion ON ubicaciones_empresa(ubicacion_id);

-- RLS (Row Level Security)
ALTER TABLE ubicaciones_empresa ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo ven las ubicaciones de su empresa
CREATE POLICY "Ver ubicaciones de mi empresa" ON ubicaciones_empresa
  FOR SELECT USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid()
    )
  );
    `);
  } else {
    console.log('✅ La tabla ubicaciones_empresa existe');
    console.log(`📊 Registros actuales: ${data?.length || 0}\n`);
    
    // Mostrar estructura
    if (data && data.length > 0) {
      console.log('Ejemplo de registro:');
      console.log(JSON.stringify(data[0], null, 2));
    }
  }
}

checkStructure().then(() => process.exit(0));
