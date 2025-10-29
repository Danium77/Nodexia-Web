/**
 * Script para verificar y asignar rol super_admin a admin.demo@nodexia.com
 * Ejecutar cuando Supabase esté operativo
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no encontradas');
  console.error('Verificar .env.local con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🔍 Verificando configuración...\n');

  // 1. Verificar empresa Nodexia (debe ser tipo sistema)
  console.log('📋 Paso 1: Verificar empresa Nodexia');
  const { data: empresaNodexia, error: errorEmpresa } = await supabase
    .from('empresas')
    .select('id, nombre, tipo_empresa')
    .eq('tipo_empresa', 'sistema')
    .eq('nombre', 'Nodexia')
    .limit(1)
    .single();

  if (errorEmpresa && errorEmpresa.code !== 'PGRST116') {
    console.error('❌ Error al buscar empresa:', errorEmpresa);
    return;
  }

  if (!empresaNodexia) {
    console.log('⚠️  Empresa Nodexia no existe, creándola...');
    const { data: nuevaEmpresa, error: errorCrear } = await supabase
      .from('empresas')
      .insert({
        nombre: 'Nodexia',
        cuit: '30-12345678-0',
        tipo_empresa: 'sistema',
        direccion: 'Sistema Central',
        activo: true
      })
      .select()
      .single();

    if (errorCrear) {
      console.error('❌ Error al crear empresa:', errorCrear);
      return;
    }
    console.log('✅ Empresa Nodexia creada:', nuevaEmpresa.id);
  } else {
    console.log('✅ Empresa Nodexia encontrada:', empresaNodexia.id);
    console.log('   Nombre:', empresaNodexia.nombre);
    console.log('   Tipo:', empresaNodexia.tipo_empresa);
  }

  const empresaId = empresaNodexia?.id || nuevaEmpresa?.id;

  // 2. Verificar usuario admin.demo@nodexia.com
  console.log('\n📋 Paso 2: Verificar usuario admin.demo@nodexia.com');
  const { data: { users }, error: errorUsers } = await supabase.auth.admin.listUsers();
  
  if (errorUsers) {
    console.error('❌ Error al listar usuarios:', errorUsers);
    return;
  }

  const adminUser = users.find(u => u.email === 'admin.demo@nodexia.com');
  
  if (!adminUser) {
    console.error('❌ Usuario admin.demo@nodexia.com no encontrado en auth.users');
    console.log('   Debe crearse desde la UI de signup primero');
    return;
  }

  console.log('✅ Usuario encontrado:', adminUser.id);

  // 3. Verificar si ya está en usuarios_empresa
  console.log('\n📋 Paso 3: Verificar asignación en usuarios_empresa');
  const { data: usuarioEmpresa, error: errorUE } = await supabase
    .from('usuarios_empresa')
    .select('*')
    .eq('user_id', adminUser.id)
    .eq('empresa_id', empresaId)
    .single();

  if (errorUE && errorUE.code !== 'PGRST116') {
    console.error('❌ Error al verificar usuarios_empresa:', errorUE);
    return;
  }

  if (usuarioEmpresa) {
    console.log('⚠️  Usuario ya existe en usuarios_empresa');
    console.log('   Rol actual:', usuarioEmpresa.rol_interno);
    
    if (usuarioEmpresa.rol_interno !== 'super_admin') {
      console.log('   Actualizando a super_admin...');
      const { error: errorUpdate } = await supabase
        .from('usuarios_empresa')
        .update({ rol_interno: 'super_admin', activo: true })
        .eq('user_id', adminUser.id)
        .eq('empresa_id', empresaId);

      if (errorUpdate) {
        console.error('❌ Error al actualizar:', errorUpdate);
        return;
      }
      console.log('✅ Rol actualizado a super_admin');
    } else {
      console.log('✅ Ya tiene rol super_admin');
    }
  } else {
    console.log('⚠️  Asignando usuario a empresa como super_admin...');
    const { data: nuevaAsignacion, error: errorInsert } = await supabase
      .from('usuarios_empresa')
      .insert({
        user_id: adminUser.id,
        empresa_id: empresaId,
        rol_interno: 'super_admin',
        activo: true
      })
      .select()
      .single();

    if (errorInsert) {
      console.error('❌ Error al asignar:', errorInsert);
      return;
    }
    console.log('✅ Usuario asignado como super_admin');
  }

  // 4. Verificación final
  console.log('\n📋 Paso 4: Verificación final');
  const { data: verificacion, error: errorVerif } = await supabase
    .from('usuarios_empresa')
    .select(`
      rol_interno,
      activo,
      empresas:empresa_id (
        nombre,
        tipo_empresa
      )
    `)
    .eq('user_id', adminUser.id)
    .eq('empresa_id', empresaId)
    .single();

  if (errorVerif) {
    console.error('❌ Error en verificación:', errorVerif);
    return;
  }

  console.log('✅ Configuración completada exitosamente!\n');
  console.log('📊 Resumen:');
  console.log('   Email: admin.demo@nodexia.com');
  console.log('   User ID:', adminUser.id);
  console.log('   Empresa:', verificacion.empresas.nombre);
  console.log('   Tipo empresa:', verificacion.empresas.tipo_empresa);
  console.log('   Rol:', verificacion.rol_interno);
  console.log('   Activo:', verificacion.activo);
  console.log('\n🎉 Ahora puedes crear ubicaciones desde /admin/ubicaciones');
}

main().catch(console.error);
