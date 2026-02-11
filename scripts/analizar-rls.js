// Verificar políticas RLS y roles de usuarios
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verificarRLS() {
  console.log('🔍 ANÁLISIS DE RLS Y ROLES\n');

  // 1. Ver políticas RLS actuales
  console.log('📋 POLÍTICAS RLS EN relaciones_empresas:');
  const { data: policies, error: polError } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT policyname, cmd, qual::text, with_check::text 
        FROM pg_policies 
        WHERE tablename = 'relaciones_empresas'
        ORDER BY policyname
      `
    });

  if (polError) {
    console.log('⚠️  No se pudo obtener con RPC, intentando otra forma...');
  } else {
    console.log(JSON.stringify(policies, null, 2));
  }

  // 2. Ver roles de usuarios en la empresa del usuario logueado
  console.log('\n👥 ROLES DE USUARIOS (muestra):');
  const { data: roles, error: rolesError } = await supabase
    .from('usuarios_empresa')
    .select('rol_interno, COUNT(*)')
    .limit(100);

  if (!rolesError && roles) {
    const rolesUnicos = {};
    roles.forEach(r => {
      rolesUnicos[r.rol_interno] = (rolesUnicos[r.rol_interno] || 0) + 1;
    });
    
    console.log('Roles encontrados en usuarios_empresa:');
    Object.entries(rolesUnicos).forEach(([rol, count]) => {
      console.log(`  - "${rol}": ${count} usuarios`);
    });
  }

  // 3. Ver usuario específico (logistica@aceiterasanmiguel.com)
  console.log('\n🔍 USUARIO logistica@aceiterasanmiguel.com:');
  const { data: usuario, error: userError } = await supabase
    .from('usuarios')
    .select('id, email')
    .eq('email', 'logistica@aceiterasanmiguel.com')
    .single();

  if (!userError && usuario) {
    console.log('Usuario ID:', usuario.id);
    
    const { data: empresas, error: empError } = await supabase
      .from('usuarios_empresa')
      .select('empresa_id, rol_interno, activo')
      .eq('user_id', usuario.id);
    
    if (!empError && empresas) {
      console.log('Empresas y roles:');
      empresas.forEach(e => {
        console.log(`  - Empresa: ${e.empresa_id}, Rol: "${e.rol_interno}", Activo: ${e.activo}`);
      });
    }
  }

  console.log('\n✅ Análisis completado');
}

verificarRLS().catch(console.error);
