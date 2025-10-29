const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function vincularUsuario(email, empresaNombre, rolInterno) {
  try {
    console.log('🔗 Vinculando usuario a empresa...\n');
    console.log(`📧 Email: ${email}`);
    console.log(`🏢 Empresa: ${empresaNombre}`);
    console.log(`👤 Rol: ${rolInterno}\n`);

    // 1. Buscar el usuario en Auth
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error listando usuarios:', authError);
      return;
    }

    const user = users.find(u => u.email === email);
    
    if (!user) {
      console.error('❌ Usuario no encontrado en Auth');
      return;
    }

    console.log('✅ Usuario encontrado en Auth:', user.id);

    // 2. Buscar la empresa
    const { data: empresa, error: empresaError } = await supabaseAdmin
      .from('empresas')
      .select('*')
      .ilike('nombre', `%${empresaNombre}%`)
      .single();

    if (empresaError || !empresa) {
      console.error('❌ Empresa no encontrada');
      return;
    }

    console.log(`✅ Empresa encontrada: ${empresa.nombre} (${empresa.tipo_empresa})`);

    // 3. Verificar que el rol sea válido para el tipo de empresa
    const rolesValidos = {
      transporte: ['coordinador_transporte', 'chofer', 'administrativo'],
      planta: ['coordinador', 'control_acceso', 'supervisor_carga'],
      cliente: ['visor']
    };

    if (!rolesValidos[empresa.tipo_empresa]?.includes(rolInterno)) {
      console.error(`❌ Rol "${rolInterno}" no es válido para empresa tipo "${empresa.tipo_empresa}"`);
      console.log(`   Roles válidos: ${rolesValidos[empresa.tipo_empresa].join(', ')}`);
      return;
    }

    console.log('✅ Rol válido para el tipo de empresa');

    // 4. Verificar si ya existe el vínculo
    const { data: vinculoExistente } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('*')
      .eq('user_id', user.id)
      .eq('empresa_id', empresa.id)
      .maybeSingle();

    if (vinculoExistente) {
      console.log('⚠️ El vínculo ya existe. Actualizando...');
      
      const { error: updateError } = await supabaseAdmin
        .from('usuarios_empresa')
        .update({
          rol_interno: rolInterno,
          activo: true,
          fecha_vinculacion: new Date().toISOString()
        })
        .eq('id', vinculoExistente.id);

      if (updateError) {
        console.error('❌ Error actualizando vínculo:', updateError);
        return;
      }

      console.log('✅ Vínculo actualizado exitosamente');
    } else {
      // 5. Crear el vínculo
      const { error: insertError } = await supabaseAdmin
        .from('usuarios_empresa')
        .insert({
          user_id: user.id,
          empresa_id: empresa.id,
          rol_interno: rolInterno,
          nombre_completo: user.user_metadata?.nombre && user.user_metadata?.apellido 
            ? `${user.user_metadata.nombre} ${user.user_metadata.apellido}`
            : email.split('@')[0],
          telefono_interno: user.user_metadata?.telefono || '',
          activo: true,
          fecha_vinculacion: new Date().toISOString()
        });

      if (insertError) {
        console.error('❌ Error creando vínculo:', insertError);
        return;
      }

      console.log('✅ Vínculo creado exitosamente');
    }

    // 6. Verificar el resultado
    const { data: verificacion } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('*')
      .eq('user_id', user.id)
      .eq('empresa_id', empresa.id)
      .single();

    console.log('\n📊 RESULTADO FINAL:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Usuario: ${email}`);
    console.log(`✅ Empresa: ${empresa.nombre}`);
    console.log(`✅ Rol: ${verificacion.rol_interno}`);
    console.log(`✅ Estado: ${verificacion.activo ? 'Activo' : 'Inactivo'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎉 El usuario ya puede iniciar sesión!');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

// Ejecutar
const email = process.argv[2];
const empresa = process.argv[3];
const rol = process.argv[4] || 'coordinador_transporte';

if (!email || !empresa) {
  console.log('❌ Uso: node scripts/vincular_usuario_empresa.js EMAIL EMPRESA [ROL]');
  console.log('\nEjemplos:');
  console.log('  node scripts/vincular_usuario_empresa.js gonzalo@logisticaexpres.com "Logística Express" coordinador_transporte');
  console.log('  node scripts/vincular_usuario_empresa.js chofer@empresa.com "Mi Transporte" chofer');
  console.log('\nRoles disponibles:');
  console.log('  - Transporte: coordinador_transporte, chofer, administrativo');
  console.log('  - Planta: coordinador, control_acceso, supervisor_carga');
  console.log('  - Cliente: visor');
  process.exit(1);
}

vincularUsuario(email, empresa, rol);
