require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ⚠️ Script de uso restringido: solo ejecutar si lo indica la documentación oficial.
// Corrige y vincula el usuario admin en tablas internas. No usar en producción sin revisión.
async function fixAdminUser() {
  console.log(' Diagnosticando usuario admin...\n');

  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error(' Error al listar usuarios:', authError.message);
    return;
  }

  const adminUser = authUsers.users.find(u => u.email === 'admin@example.com');
  
  if (!adminUser) {
    console.error(' Usuario admin@example.com NO encontrado');
    return;
  }

  console.log(' Usuario encontrado:', adminUser.email);
  const userId = adminUser.id;

  const { data: usuariosData } = await supabase.from('usuarios').select('*').eq('id', userId).single();

  if (!usuariosData) {
    console.log('  Creando en tabla usuarios...');
    await supabase.from('usuarios').insert({ id: userId, email: 'admin@example.com', nombre_completo: 'Admin Demo', is_super_admin: true });
  } else if (!usuariosData.is_super_admin) {
    console.log('  Actualizando is_super_admin...');
    await supabase.from('usuarios').update({ is_super_admin: true }).eq('id', userId);
  }

  const { data: adminNodexia } = await supabase.from('admin_nodexia').select('*').eq('user_id', userId).single();

  if (!adminNodexia) {
    console.log('  Creando en admin_nodexia...');
    await supabase.from('admin_nodexia').insert({ user_id: userId, nombre_completo: 'Admin Demo', admin_email: 'admin@example.com', activo: true });
  }

  console.log('\n Admin configurado correctamente!');
  console.log(' Email: admin@example.com');
  console.log(' Password: StrongPass123!');
}

fixAdminUser().catch(console.error);
