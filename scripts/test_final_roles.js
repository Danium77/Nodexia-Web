// scripts/test_final_roles.js
// Verificación final del sistema de roles

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verificarRoles() {
  console.log('🎯 VERIFICACIÓN FINAL DEL SISTEMA DE ROLES\n');
  
  const emails = [
    'control.acceso@nodexia.com',
    'supervisor.carga@nodexia.com',
    'admin.demo@nodexia.com'
  ];
  
  for (const email of emails) {
    console.log(`🔍 Verificando ${email}...`);
    
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, email, nombre_completo')
      .eq('email', email)
      .single();
      
    if (!usuario) {
      console.log('   ❌ Usuario no encontrado');
      continue;
    }
    
    const { data: relacion } = await supabase
      .from('usuarios_empresa')
      .select('rol_interno')
      .eq('user_id', usuario.id)
      .single();
      
    if (relacion) {
      let mappedRole = 'desconocido';
      
      switch (relacion.rol_interno) {
        case 'Control de Acceso':
          mappedRole = 'control_acceso';
          break;
        case 'Supervisor de Carga':
          mappedRole = 'supervisor_carga';
          break;
        case 'Super Admin':
          mappedRole = 'admin';
          break;
        default:
          mappedRole = 'transporte';
      }
      
      console.log(`   ✅ ${usuario.nombre_completo}`);
      console.log(`   📧 Email: ${email}`);
      console.log(`   👔 Rol interno: ${relacion.rol_interno}`);
      console.log(`   🔄 Rol mapeado: ${mappedRole}`);
      
      if (relacion.rol_interno === 'Control de Acceso') {
        console.log('   🎯 → Debería redirigir a /control-acceso');
      } else if (relacion.rol_interno === 'Supervisor de Carga') {
        console.log('   🎯 → Debería redirigir a /supervisor-carga');
      }
      
    } else {
      console.log('   ❌ Sin rol asignado');
    }
    
    console.log();
  }
  
  console.log('🔑 CREDENCIALES PARA PROBAR:');
  console.log('═══════════════════════════════');
  console.log('📧 control.acceso@nodexia.com');
  console.log('🔑 Demo1234!');
  console.log('🎯 Debería ir a: /control-acceso');
  console.log();
  console.log('📧 supervisor.carga@nodexia.com');
  console.log('🔑 Demo1234!');
  console.log('🎯 Debería ir a: /supervisor-carga');
}

verificarRoles();