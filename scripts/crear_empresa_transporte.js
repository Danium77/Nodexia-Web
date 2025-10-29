// Script para crear una empresa transportista de prueba
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function crearEmpresaTransporte() {
  console.log('🚛 Creando empresa transportista de prueba...\n');
  
  const empresaData = {
    nombre: 'Transportes Express SA',
    razon_social: 'Transportes Express Sociedad Anónima',
    cuit: '30987654321',
    tipo_empresa: 'transporte',
    direccion: 'Av. Libertador 5000',
    localidad: 'Rosario',
    provincia: 'Santa Fe',
    codigo_postal: '2000',
    telefono: '0341-4567890',
    email: 'contacto@transportesexpress.com',
    sitio_web: 'www.transportesexpress.com',
    activo: true,
    verificado: true,
    fecha_alta: new Date().toISOString().split('T')[0]
  };

  // Verificar si ya existe
  const { data: existente } = await supabase
    .from('empresas')
    .select('id, nombre')
    .eq('cuit', empresaData.cuit)
    .maybeSingle();

  if (existente) {
    console.log('⚠️ La empresa ya existe:');
    console.log(`   ID: ${existente.id}`);
    console.log(`   Nombre: ${existente.nombre}`);
    console.log(`   CUIT: ${empresaData.cuit}`);
    return;
  }

  // Crear la empresa
  const { data: empresaCreada, error } = await supabase
    .from('empresas')
    .insert([empresaData])
    .select()
    .single();

  if (error) {
    console.error('❌ Error al crear empresa:', error);
    return;
  }

  console.log('✅ Empresa transportista creada exitosamente!\n');
  console.log('📋 Datos de la empresa:');
  console.log(`   ID: ${empresaCreada.id}`);
  console.log(`   Nombre: ${empresaCreada.nombre}`);
  console.log(`   CUIT: ${empresaCreada.cuit}`);
  console.log(`   Tipo: ${empresaCreada.tipo_empresa}`);
  console.log(`   Localidad: ${empresaCreada.localidad}, ${empresaCreada.provincia}`);
  console.log(`   Teléfono: ${empresaCreada.telefono}`);
  console.log(`   Email: ${empresaCreada.email}`);
  
  console.log('\n✨ Ahora puedes buscar esta empresa con el CUIT: 30987654321');
  console.log('   O con guiones: 30-98765432-1');
}

crearEmpresaTransporte().then(() => process.exit(0));
