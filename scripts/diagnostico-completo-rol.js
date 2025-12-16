require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnostico() {
  console.log('🔍 DIAGNÓSTICO COMPLETO\n');
  console.log('='.repeat(60));
  
  // 1. Empresa
  const { data: empresa } = await supabase
    .from('empresas')
    .select('*')
    .eq('id', '3cc1979e-1672-48b8-a5e5-2675f5cac527')
    .single();
    
  console.log('\n1. EMPRESA');
  console.log('   Nombre:', empresa.nombre);
  console.log('   Tipo:', empresa.tipo_empresa);
  console.log('   ID:', empresa.id);
  
  // 2. Rol buscado
  console.log('\n2. ROL "Control de Acceso"');
  const { data: rolesControl } = await supabase
    .from('roles_empresa')
    .select('*')
    .eq('nombre_rol', 'Control de Acceso');
    
  rolesControl?.forEach(rol => {
    console.log(`   - ID: ${rol.id}`);
    console.log(`     Tipo Empresa: ${rol.tipo_empresa}`);
    console.log(`     Activo: ${rol.activo}`);
  });
  
  // 3. Validación con función
  console.log('\n3. VALIDACIÓN CON FUNCIÓN validar_rol_empresa()');
  const { data: validacion, error: valError } = await supabase.rpc('validar_rol_empresa', {
    p_rol: 'Control de Acceso',
    p_tipo_empresa: 'planta'
  });
  
  if (valError) {
    console.error('   ❌ Error al ejecutar función:', valError.message);
  } else {
    console.log(`   Resultado: ${validacion ? '✅ VÁLIDO' : '❌ NO VÁLIDO'}`);
  }
  
  // 4. Roles válidos para 'planta'
  console.log('\n4. TODOS LOS ROLES VÁLIDOS PARA TIPO "planta"');
  const { data: rolesPlanta } = await supabase
    .from('roles_empresa')
    .select('nombre_rol, tipo_empresa, activo')
    .or(`tipo_empresa.eq.planta,tipo_empresa.eq.ambos`)
    .eq('activo', true);
    
  rolesPlanta?.forEach(rol => {
    console.log(`   - ${rol.nombre_rol} (${rol.tipo_empresa})`);
  });
  
  // 5. Verificar si rol "Control de Acceso" para "planta" o "ambos"
  console.log('\n5. ROL "Control de Acceso" EN tipos planta/ambos');
  const { data: rolEspecifico } = await supabase
    .from('roles_empresa')
    .select('*')
    .eq('nombre_rol', 'Control de Acceso')
    .or('tipo_empresa.eq.planta,tipo_empresa.eq.ambos')
    .eq('activo', true);
    
  if (!rolEspecifico || rolEspecifico.length === 0) {
    console.log('   ❌ NO EXISTE rol "Control de Acceso" para planta/ambos');
  } else {
    console.log('   ✅ EXISTE:');
    rolEspecifico.forEach(r => {
      console.log(`      ID: ${r.id}, Tipo: ${r.tipo_empresa}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
}

diagnostico().catch(console.error);
