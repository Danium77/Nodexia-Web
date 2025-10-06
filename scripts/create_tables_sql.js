// scripts/create_tables_sql.js
// Crear tablas usando SQL directo con pg

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function crearTablasSQL() {
  console.log('🚀 Creando tablas con SQL directo...');

  const createTablesSQL = `
-- Crear tabla viajes
CREATE TABLE IF NOT EXISTS viajes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_viaje VARCHAR(50) UNIQUE NOT NULL,
  qr_code TEXT UNIQUE NOT NULL,
  tipo_operacion VARCHAR(20) CHECK (tipo_operacion IN ('carga', 'descarga')) NOT NULL,
  chofer_id UUID,
  camion_id UUID,
  acoplado_id UUID,
  empresa_origen_id UUID,
  empresa_destino_id UUID,
  estado_viaje VARCHAR(30) DEFAULT 'confirmado',
  fecha_confirmacion TIMESTAMPTZ DEFAULT NOW(),
  fecha_ingreso_planta TIMESTAMPTZ,
  fecha_llamado_carga TIMESTAMPTZ,
  fecha_inicio_carga TIMESTAMPTZ,
  fecha_fin_carga TIMESTAMPTZ,
  fecha_egreso_planta TIMESTAMPTZ,
  producto TEXT,
  peso_estimado DECIMAL(10,2),
  peso_real DECIMAL(10,2),
  observaciones TEXT,
  ingreso_por UUID,
  llamado_por UUID,
  carga_iniciada_por UUID,
  carga_finalizada_por UUID,
  egreso_por UUID,
  documentacion_validada BOOLEAN DEFAULT false,
  documentos_faltantes TEXT[],
  remito_url TEXT,
  fotos_carga TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla incidencias_viaje
CREATE TABLE IF NOT EXISTS incidencias_viaje (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id UUID,
  tipo_incidencia VARCHAR(50) NOT NULL,
  descripcion TEXT NOT NULL,
  estado_incidencia VARCHAR(20) DEFAULT 'abierta',
  prioridad VARCHAR(10) DEFAULT 'media',
  reportada_por UUID,
  asignada_a UUID,
  fecha_reporte TIMESTAMPTZ DEFAULT NOW(),
  fecha_resolucion TIMESTAMPTZ,
  solucion TEXT,
  fotos_incidencia TEXT,
  datos_extra JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID,
  viaje_id UUID,
  tipo_notificacion VARCHAR(50) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN DEFAULT false,
  enviada BOOLEAN DEFAULT false,
  fecha_envio TIMESTAMPTZ,
  datos_extra JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

  try {
    // Intentar crear las tablas dividiendo en queries separados
    const queries = createTablesSQL.split(';').filter(q => q.trim());
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i].trim();
      if (query) {
        console.log(`Ejecutando query ${i + 1}...`);
        
        const { error } = await supabase.rpc('exec_sql', { sql: query });
        if (error) {
          console.log(`❌ Error en query ${i + 1}:`, error.message);
        } else {
          console.log(`✅ Query ${i + 1} ejecutado`);
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Error general:', error.message);
  }
}

// Función alternativa usando inserción directa
async function probarInsercionDirecta() {
  console.log('\n🧪 Probando inserción directa...');
  
  // Primero obtener IDs existentes para las relaciones
  const { data: choferes } = await supabase.from('choferes').select('id').limit(1);
  const { data: camiones } = await supabase.from('camiones').select('id').limit(1);
  const { data: empresas } = await supabase.from('empresas').select('id').limit(2);

  if (!choferes?.length || !camiones?.length || !empresas?.length) {
    console.log('❌ Faltan datos base (choferes, camiones, empresas)');
    console.log('Ejecuta primero: node scripts/seed_demo_users_updated.js && node scripts/seed_choferes_flota_demo.js');
    return;
  }

  const viajeTest = {
    numero_viaje: `VJ-TEST-${Date.now()}`,
    qr_code: `QR-TEST-${Date.now()}`,
    tipo_operacion: 'carga',
    estado_viaje: 'confirmado',
    chofer_id: choferes[0].id,
    camion_id: camiones[0].id,
    empresa_origen_id: empresas[0].id,
    empresa_destino_id: empresas[1]?.id || empresas[0].id,
    producto: 'Producto de prueba',
    peso_estimado: 25000,
    documentacion_validada: true
  };

  const { data, error } = await supabase
    .from('viajes')
    .insert(viajeTest)
    .select()
    .single();

  if (error) {
    console.log('❌ Error insertando viaje:', error.message);
    console.log('Código de error:', error.code);
    console.log('Detalles:', error.details);
    
    if (error.code === '42P01') {
      console.log('\n🚨 La tabla "viajes" no existe!');
      console.log('Ve a Supabase Dashboard > SQL Editor y ejecuta:');
      console.log('\nCREATE TABLE viajes (...);');
    }
  } else {
    console.log('✅ Viaje creado exitosamente!');
    console.log('ID:', data.id);
    console.log('Número:', data.numero_viaje);
    
    // Limpiar el viaje de prueba
    await supabase.from('viajes').delete().eq('id', data.id);
    console.log('✅ Viaje de prueba eliminado');
  }
}

async function main() {
  await crearTablasSQL();
  await probarInsercionDirecta();
}

main();