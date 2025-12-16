/**
 * Script para configurar usuario Walter Zayas en usuarios_multi_rol
 * Fecha: 24 de Noviembre 2025
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const WALTER_USER_ID = '50da5768-b203-4719-ad16-62e03e2b151a';

async function main() {
  console.log('🚀 Iniciando configuración de Walter Zayas...\n');

  try {
    // PASO 1: Verificar que el usuario existe en auth.users
    console.log('📋 PASO 1: Verificando usuario en auth.users...');
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(WALTER_USER_ID);
    
    if (authError) {
      console.error('❌ Error al buscar usuario:', authError.message);
      process.exit(1);
    }
    
    if (!authUser.user) {
      console.error('❌ Usuario no encontrado en auth.users');
      process.exit(1);
    }
    
    console.log('✅ Usuario encontrado:', authUser.user.email);
    console.log('   Confirmado:', authUser.user.email_confirmed_at ? 'Sí' : 'No');
    console.log('   Creado:', authUser.user.created_at);
    console.log();

    // PASO 2: Buscar UUID de Logística Express
    console.log('📋 PASO 2: Buscando empresa Logística Express...');
    const { data: empresas, error: empresasError } = await supabase
      .from('empresas')
      .select('id, nombre, cuit, tipo_empresa, activa')
      .eq('nombre', 'Logística Express SRL');

    if (empresasError) {
      console.error('❌ Error al buscar empresa:', empresasError.message);
      process.exit(1);
    }

    if (!empresas || empresas.length === 0) {
      console.error('❌ No se encontró la empresa Logística Express');
      console.log('💡 Ejecuta esta query en Supabase para ver todas las empresas:');
      console.log('   SELECT id, nombre FROM empresas WHERE tipo_empresa = \'transporte\';');
      process.exit(1);
    }

    const empresa = empresas[0];
    console.log('✅ Empresa encontrada:');
    console.log('   ID:', empresa.id);
    console.log('   Nombre:', empresa.nombre);
    console.log('   CUIT:', empresa.cuit);
    console.log('   Tipo:', empresa.tipo_empresa);
    console.log('   Activa:', empresa.activa);
    console.log();

    // PASO 3: Verificar que NO existe registro previo
    console.log('📋 PASO 3: Verificando si ya existe registro en usuarios_empresa...');
    const { data: existingRecord, error: checkError } = await supabase
      .from('usuarios_empresa')
      .select('*')
      .eq('user_id', WALTER_USER_ID)
      .eq('empresa_id', empresa.id);

    if (checkError) {
      console.error('❌ Error al verificar registro:', checkError.message);
      process.exit(1);
    }

    if (existingRecord && existingRecord.length > 0) {
      console.log('⚠️  Ya existe un registro para este usuario:');
      console.log('   Empresa ID:', existingRecord[0].empresa_id);
      console.log('   Rol:', existingRecord[0].rol_interno);
      console.log('\n💡 Si quieres actualizar el registro, elimínalo primero:');
      console.log('   DELETE FROM usuarios_empresa WHERE user_id = \'' + WALTER_USER_ID + '\' AND empresa_id = \'' + empresa.id + '\';');
      process.exit(0);
    }

    console.log('✅ No existe registro previo (correcto)');
    console.log();

    // PASO 4: Crear el registro en usuarios_empresa
    console.log('📋 PASO 4: Creando registro en usuarios_empresa...');
    const { data: newRecord, error: insertError } = await supabase
      .from('usuarios_empresa')
      .insert({
        user_id: WALTER_USER_ID,
        empresa_id: empresa.id,
        rol_interno: 'chofer',
        activo: true
      })
      .select();

    if (insertError) {
      console.error('❌ Error al crear registro:', insertError.message);
      console.error('   Detalles:', insertError);
      process.exit(1);
    }

    console.log('✅ Registro creado exitosamente!');
    console.log();

    // PASO 5: Verificar el registro creado
    console.log('📋 PASO 5: Verificando registro creado...');
    const { data: verification, error: verifyError } = await supabase
      .from('usuarios_empresa')
      .select(`
        user_id,
        empresa_id,
        rol_interno,
        activo
      `)
      .eq('user_id', WALTER_USER_ID)
      .eq('empresa_id', empresa.id);

    if (verifyError) {
      console.error('❌ Error al verificar registro:', verifyError.message);
      process.exit(1);
    }

    if (!verification || verification.length === 0) {
      console.error('❌ No se pudo verificar el registro creado');
      process.exit(1);
    }

    console.log('✅ Registro verificado correctamente:');
    console.log('   User ID:', verification[0].user_id);
    console.log('   Empresa ID:', verification[0].empresa_id);
    console.log('   Rol:', verification[0].rol_interno);
    console.log('   Activo:', verification[0].activo);
    console.log();

    // PASO 6: Verificar JOIN con empresas
    console.log('📋 PASO 6: Verificando JOIN con tabla empresas...');
    const { data: joinTest, error: joinError } = await supabase
      .from('usuarios_empresa')
      .select(`
        user_id,
        empresa_id,
        rol_interno,
        empresas!inner(nombre, tipo_empresa, activa)
      `)
      .eq('user_id', WALTER_USER_ID)
      .eq('empresa_id', empresa.id);

    if (joinError) {
      console.error('❌ Error en JOIN:', joinError.message);
      process.exit(1);
    }

    console.log('✅ JOIN exitoso con tabla empresas');
    console.log('   Empresa verificada:', joinTest[0].empresas.nombre);
    console.log('   Tipo:', joinTest[0].empresas.tipo_empresa);
    console.log('   Activa:', joinTest[0].empresas.activa);
    console.log();

    // RESUMEN FINAL
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ CONFIGURACIÓN COMPLETADA EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('📱 CREDENCIALES PARA PRUEBA:');
    console.log('   URL: http://localhost:3000/chofer-mobile');
    console.log('   Email:', authUser.user.email);
    console.log('   Password: (la configurada al crear el usuario)');
    console.log('');
    console.log('🎯 PRÓXIMOS PASOS:');
    console.log('   1. Iniciar sesión con las credenciales de Walter');
    console.log('   2. Verificar que se muestra la interfaz de chofer');
    console.log('   3. Confirmar que puede ver sus viajes asignados');
    console.log('');
    console.log('═══════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error inesperado:', error);
    process.exit(1);
  }
}

main();
