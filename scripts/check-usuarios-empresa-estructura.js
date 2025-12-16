require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEstructura() {
  console.log('🔍 Verificando estructura de usuarios_empresa...\n');
  
  // 1. Obtener registros de ejemplo
  const { data: registros, error: regError } = await supabase
    .from('usuarios_empresa')
    .select('*')
    .limit(3);
    
  if (regError) {
    console.error('❌ Error al leer usuarios_empresa:', regError);
    return;
  }
  
  if (!registros || registros.length === 0) {
    console.log('⚠️  No hay registros en usuarios_empresa');
    return;
  }
  
  console.log('✅ Registros encontrados:', registros.length);
  console.log('\n📋 Columnas disponibles:');
  const columns = Object.keys(registros[0]);
  columns.forEach(col => console.log(`  - ${col}`));
  
  console.log('\n📊 Primer registro (ejemplo):');
  console.log(JSON.stringify(registros[0], null, 2));
  
  // 2. Verificar si existe rol_empresa_id
  const tieneRolEmpresaId = columns.includes('rol_empresa_id');
  console.log(`\n${tieneRolEmpresaId ? '✅' : '❌'} Columna 'rol_empresa_id': ${tieneRolEmpresaId ? 'EXISTE' : 'NO EXISTE'}`);
  
  // 3. Verificar empresa específica
  console.log('\n🏢 Verificando empresa Aceitera San Miguel...');
  const { data: empresas, error: empError } = await supabase
    .from('empresas')
    .select('id, nombre')
    .ilike('nombre', '%aceitera%miguel%');
    
  if (empresas && empresas.length > 0) {
    console.log('✅ Empresa encontrada:', empresas[0]);
    
    // Verificar usuarios de esa empresa
    const { data: usuarios, error: usrError } = await supabase
      .from('usuarios_empresa')
      .select('*')
      .eq('empresa_id', empresas[0].id);
      
    console.log(`\n👥 Usuarios en esa empresa: ${usuarios?.length || 0}`);
    if (usuarios && usuarios.length > 0) {
      console.log('Ejemplo:', JSON.stringify(usuarios[0], null, 2));
    }
  } else {
    console.log('⚠️  Empresa no encontrada');
  }
}

checkEstructura().catch(console.error);
