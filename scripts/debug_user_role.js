// scripts/debug_user_role.js
// ⚠️ Script de depuración. No usar en producción. Solo para diagnóstico puntual de roles de usuario.
// Debug del rol del usuario

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugUserRole() {
  console.log('🔍 DEBUG: Verificando detección de rol para control.acceso@nodexia.com\n');
  
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, email, nombre_completo')
    .eq('email', 'control.acceso@nodexia.com')
    .single();
    
  console.log('1. Usuario encontrado:', usuario);
  
  const { data: relacion } = await supabase
    .from('usuarios_empresa')
    .select('rol_interno, empresa_id')
    .eq('user_id', usuario.id)
    .single();
    
  console.log('2. Relación encontrada:', relacion);
  
  // Simular exactamente el mapeo que hace el contexto
  let mappedRole = 'transporte'; // default
  
  if (relacion?.rol_interno) {
    switch (relacion.rol_interno) {
      case 'Super Admin':
        mappedRole = 'admin';
        break;
      case 'Control de Acceso':
        mappedRole = 'control_acceso';
        break;
      case 'Supervisor de Carga':
        mappedRole = 'supervisor_carga';
        break;
      case 'Coordinador':
        mappedRole = 'coordinador';
        break;
      case 'Chofer':
        mappedRole = 'chofer';
        break;
      case 'Operador':
        mappedRole = 'transporte';
        break;
      default:
        mappedRole = 'transporte';
    }
  }
  
  console.log('\n3. 🔄 Mapeo de rol:');
  console.log('   Rol interno:', relacion?.rol_interno);
  console.log('   Rol mapeado:', mappedRole);
  console.log('   Debería mostrar menú de:', mappedRole === 'control_acceso' ? 'Control de Acceso ✅' : 'Otro ❌');
  
  console.log('\n4. 📋 Lo que debería pasar en el frontend:');
  console.log('   userRole en Sidebar:', mappedRole);
  console.log('   Condición userRole === "control_acceso":', mappedRole === 'control_acceso');
  console.log('   Dashboard redirección:', mappedRole === 'control_acceso' ? '/control-acceso' : 'dashboard normal');
}

debugUserRole();