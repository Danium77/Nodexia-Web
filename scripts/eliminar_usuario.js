// scripts/eliminar_usuario.js
// Script para eliminar un usuario completo de Supabase Auth y todas sus referencias
// Usage: node scripts/eliminar_usuario.js [email]
// Ejemplo: node scripts/eliminar_usuario.js user@example.com

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Cargar variables de entorno
require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Configurar readline para input interactivo
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function pregunta(texto) {
  return new Promise((resolve) => {
    rl.question(texto, resolve);
  });
}

async function eliminarUsuarioCompleto(email) {
  console.log(`\n🔍 Buscando usuario: ${email}...`);

  try {
    // 1. Buscar usuario en auth.users
    const { data: users, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (getUserError) {
      throw new Error(`Error al obtener usuarios: ${getUserError.message}`);
    }

    const user = users.users.find(u => u.email === email);
    if (!user) {
      console.log(`❌ Usuario con email ${email} no encontrado en auth.users`);
      console.log('\n📋 Usuarios disponibles:');
      users.users.forEach((u, i) => {
        console.log(`   ${i + 1}. ${u.email} (${u.id})`);
      });
      return false;
    }

    console.log(`✅ Usuario encontrado: ${user.email} (${user.id})`);
    console.log(`📅 Creado: ${new Date(user.created_at).toLocaleString('es-ES')}`);
    console.log(`🔐 Confirmado: ${user.email_confirmed_at ? '✅' : '❌'}`);

    // 2. Mostrar referencias existentes
    console.log(`\n🔍 Verificando referencias existentes...`);

    const tablas = [
      'profile_users',
      'usuarios', 
      'usuarios_empresa',
      'documentos',
      'despachos',
      'camiones',
      'choferes',
      'acoplados',
      'transportes',
      'super_admins'
    ];

    const referencias = {};
    for (const tabla of tablas) {
      try {
        // Buscar por user_id
        const { count: countUserId } = await supabaseAdmin
          .from(tabla)
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Buscar por created_by
        const { count: countCreatedBy } = await supabaseAdmin
          .from(tabla)
          .select('*', { count: 'exact', head: true })
          .eq('created_by', user.id);

        const total = (countUserId || 0) + (countCreatedBy || 0);
        if (total > 0) {
          referencias[tabla] = {
            user_id: countUserId || 0,
            created_by: countCreatedBy || 0,
            total
          };
        }
      } catch (error) {
        // Tabla no existe o no tiene las columnas, ignorar
      }
    }

    if (Object.keys(referencias).length > 0) {
      console.log(`\n📊 Referencias encontradas:`);
      Object.entries(referencias).forEach(([tabla, counts]) => {
        console.log(`   • ${tabla}: ${counts.total} registros (${counts.user_id} por user_id, ${counts.created_by} por created_by)`);
      });
    } else {
      console.log(`✅ No se encontraron referencias adicionales`);
    }

    // 3. Confirmar eliminación
    console.log(`\n⚠️  ELIMINACIÓN COMPLETA DE USUARIO`);
    console.log(`📧 Email: ${email}`);
    console.log(`🆔 ID: ${user.id}`);
    console.log(`📊 Referencias a eliminar: ${Object.keys(referencias).length} tablas afectadas`);
    
    const confirmar = await pregunta('\n❓ ¿Proceder con la eliminación COMPLETA? (escribir "ELIMINAR" para confirmar): ');
    
    if (confirmar !== 'ELIMINAR') {
      console.log('❌ Operación cancelada');
      return false;
    }

    // 4. Eliminar referencias en orden
    console.log(`\n🗑️  Iniciando eliminación...`);

    const resultados = {
      referencias: {},
      authUser: false,
      errores: []
    };

    // Eliminar referencias en todas las tablas
    for (const [tabla, counts] of Object.entries(referencias)) {
      try {
        let eliminados = 0;

        // Eliminar por user_id
        if (counts.user_id > 0) {
          const { error: error1 } = await supabaseAdmin
            .from(tabla)
            .delete()
            .eq('user_id', user.id);
          
          if (!error1) eliminados += counts.user_id;
        }

        // Eliminar por created_by
        if (counts.created_by > 0) {
          const { error: error2 } = await supabaseAdmin
            .from(tabla)
            .delete()
            .eq('created_by', user.id);
          
          if (!error2) eliminados += counts.created_by;
        }

        resultados.referencias[tabla] = eliminados;
        console.log(`   ✅ ${tabla}: ${eliminados}/${counts.total} registros eliminados`);

      } catch (error) {
        const mensaje = `Error en ${tabla}: ${error.message}`;
        resultados.errores.push(mensaje);
        console.log(`   ❌ ${mensaje}`);
      }
    }

    // 5. Eliminar de auth.users
    console.log(`\n🔐 Eliminando de auth.users...`);
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    
    if (authError) {
      resultados.errores.push(`Error eliminando auth.users: ${authError.message}`);
      console.log(`❌ Error: ${authError.message}`);
    } else {
      resultados.authUser = true;
      console.log(`✅ Usuario eliminado de auth.users`);
    }

    // 6. Resumen final
    console.log(`\n📋 RESUMEN DE ELIMINACIÓN`);
    console.log(`📧 Email liberado: ${email}`);
    console.log(`🔐 Auth user: ${resultados.authUser ? '✅ Eliminado' : '❌ Error'}`);
    
    const totalReferenciasEliminadas = Object.values(resultados.referencias).reduce((sum, count) => sum + count, 0);
    console.log(`📊 Referencias eliminadas: ${totalReferenciasEliminadas}`);
    
    if (resultados.errores.length > 0) {
      console.log(`⚠️  Errores encontrados: ${resultados.errores.length}`);
      resultados.errores.forEach(error => console.log(`   • ${error}`));
    }

    const exito = resultados.authUser && resultados.errores.length === 0;
    console.log(`\n${exito ? '✅ ELIMINACIÓN EXITOSA' : '⚠️  ELIMINACIÓN PARCIAL'}`);
    
    if (exito) {
      console.log(`💡 El email ${email} está ahora disponible para registro nuevamente`);
    }

    return exito;

  } catch (error) {
    console.error(`❌ Error durante la eliminación:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🗑️  ELIMINADOR DE USUARIOS SUPABASE');
  console.log('====================================\n');

  let email = process.argv[2];

  if (!email) {
    email = await pregunta('📧 Ingresa el email del usuario a eliminar: ');
  }

  if (!email || !email.includes('@')) {
    console.log('❌ Email inválido');
    rl.close();
    return;
  }

  const success = await eliminarUsuarioCompleto(email);
  
  console.log(`\n🏁 Proceso ${success ? 'completado exitosamente' : 'terminado con errores'}`);
  rl.close();
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Error fatal:', error);
    rl.close();
    process.exit(1);
  });
}

module.exports = { eliminarUsuarioCompleto };