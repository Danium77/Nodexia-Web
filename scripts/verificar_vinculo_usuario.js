/**
 * Verificar vínculo del usuario en usuarios_empresa
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verificarVinculo() {
  const email = 'logistica@aceiterasanmiguel.com';

  console.log('\n🔍 VERIFICANDO VÍNCULO DEL USUARIO\n');

  // 1. Buscar en auth.users
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const authUser = users.find(u => u.email === email);
  
  if (!authUser) {
    console.error('❌ Usuario no encontrado en auth.users');
    return;
  }

  console.log(`✅ Usuario en auth.users: ${authUser.id}\n`);

  // 2. Buscar en tabla usuarios
  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TABLA: usuarios');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (usuarioData) {
    console.log(JSON.stringify(usuarioData, null, 2));
  } else {
    console.log('❌ No encontrado');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 3. Buscar en usuarios_empresa con user_id
  const { data: vinculoData, error: vinculoError } = await supabase
    .from('usuarios_empresa')
    .select(`
      *,
      empresas (
        id,
        nombre,
        tipo_empresa
      )
    `)
    .eq('user_id', authUser.id);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TABLA: usuarios_empresa (buscando con user_id)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (vinculoError) {
    console.log('❌ Error:', vinculoError.message);
  } else if (!vinculoData || vinculoData.length === 0) {
    console.log('❌ No se encontró vínculo');
  } else {
    console.log(JSON.stringify(vinculoData, null, 2));
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 4. Buscar TODOS los vínculos de usuarios_empresa para ver qué hay
  const { data: allVinculos } = await supabase
    .from('usuarios_empresa')
    .select('user_id, email_interno, rol_interno, activo')
    .limit(10);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TODOS LOS VÍNCULOS (primeros 10)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (allVinculos) {
    allVinculos.forEach(v => {
      console.log(`- user_id: ${v.user_id}`);
      console.log(`  email: ${v.email_interno}`);
      console.log(`  rol: ${v.rol_interno}`);
      console.log(`  activo: ${v.activo}\n`);
    });
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 5. Verificar si existe en super_admins
  const { data: superAdminData } = await supabase
    .from('super_admins')
    .select('*')
    .eq('user_id', authUser.id)
    .maybeSingle();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TABLA: super_admins');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (superAdminData) {
    console.log(JSON.stringify(superAdminData, null, 2));
  } else {
    console.log('✅ No es super admin (correcto)');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

verificarVinculo().catch(console.error);
