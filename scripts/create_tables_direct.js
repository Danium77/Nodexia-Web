// scripts/create_tables_direct.js
// Crear tablas directamente usando queries individuales

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function crearTablas() {
  console.log('🚀 Creando tablas del sistema QR...\n');

  // 1. Crear tabla viajes
  console.log('🚛 Creando tabla viajes...');
  try {
    const { error } = await supabaseAdmin.from('viajes').select('id').limit(1);
    if (!error) {
      console.log('✅ Tabla viajes ya existe');
    }
  } catch (e) {
    console.log('Creando tabla viajes...');
  }

  // 2. Intentar insertar un viaje de prueba para ver si la tabla existe
  console.log('\n🧪 Probando inserción en tabla viajes...');
  
  const testViaje = {
    numero_viaje: 'TEST-001',
    qr_code: 'QR-TEST-001',
    tipo_operacion: 'carga',
    estado_viaje: 'confirmado',
    producto: 'Producto de prueba',
    peso_estimado: 1000,
    documentacion_validada: true
  };

  const { data: viajeTest, error: errorTest } = await supabaseAdmin
    .from('viajes')
    .insert(testViaje)
    .select()
    .single();

  if (errorTest) {
    console.log('❌ Error insertando viaje de prueba:', errorTest.message);
    console.log('\n🔧 Necesitamos crear las tablas manualmente en Supabase...');
    
    console.log('\n📋 INSTRUCCIONES MANUALES:');
    console.log('1. Ve a https://supabase.com/dashboard');
    console.log('2. Abre el SQL Editor');
    console.log('3. Ejecuta el siguiente SQL:');
    console.log('\n--- COPY THIS SQL ---');
    console.log(`
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
`);
    console.log('--- END SQL ---\n');
    
    return false;
  } else {
    console.log('✅ Tabla viajes funciona correctamente');
    
    // Limpiar el viaje de prueba
    await supabaseAdmin.from('viajes').delete().eq('numero_viaje', 'TEST-001');
    
    return true;
  }
}

async function main() {
  const tablasFuncionan = await crearTablas();
  
  if (tablasFuncionan) {
    console.log('🎉 Tablas funcionando! Ejecutando seed de viajes...\n');
    
    // Ejecutar el seed de viajes
    const { exec } = require('child_process');
    exec('node scripts/seed_viajes_qr_demo.js', (error, stdout, stderr) => {
      if (error) {
        console.log('❌ Error ejecutando seed:', error.message);
      }
      if (stdout) console.log(stdout);
      if (stderr) console.log(stderr);
    });
  }
}

main();