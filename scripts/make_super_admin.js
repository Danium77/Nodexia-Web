const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variables de entorno de Supabase no encontradas');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function makeUserSuperAdmin(email) {
    console.log(`🔧 Configurando usuario ${email} como Super Administrador...\n`);

    try {
        // Buscar usuario por email
        const { data: users, error: getUserError } = await supabase.auth.admin.listUsers();
        
        if (getUserError) {
            console.error('❌ Error al obtener usuarios:', getUserError.message);
            return;
        }

        const user = users.users.find(u => u.email === email);
        
        if (!user) {
            console.error(`❌ Usuario con email ${email} no encontrado`);
            console.log('📋 Usuarios disponibles:');
            users.users.forEach(u => {
                console.log(`   - ${u.email} (${u.id})`);
            });
            return;
        }

        console.log(`✅ Usuario encontrado: ${user.email} (${user.id})`);

        // Verificar si ya es super admin
        const { data: existingSuperAdmin, error: checkError } = await supabase
            .from('super_admins')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('❌ Error al verificar super admin existente:', checkError.message);
            return;
        }

        if (existingSuperAdmin) {
            console.log('⚠️  El usuario ya es super administrador');
            
            // Actualizar para asegurar que esté activo
            const { error: updateError } = await supabase
                .from('super_admins')
                .update({ activo: true })
                .eq('user_id', user.id);

            if (updateError) {
                console.error('❌ Error al actualizar super admin:', updateError.message);
            } else {
                console.log('✅ Super admin reactivado');
            }
            return;
        }

        // Crear registro de super admin
        const { error: insertError } = await supabase
            .from('super_admins')
            .insert({
                user_id: user.id,
                email: user.email,
                nombre_completo: user.user_metadata?.nombre_completo || 'Super Administrador',
                activo: true,
                permisos: {
                    manage_companies: true,
                    manage_subscriptions: true,
                    manage_payments: true,
                    view_analytics: true,
                    manage_users: true,
                    system_configuration: true
                }
            });

        if (insertError) {
            console.error('❌ Error al crear super admin:', insertError.message);
            return;
        }

        console.log('✅ Super administrador creado exitosamente');

        // Insertar log de auditoría
        const { error: logError } = await supabase
            .from('logs_admin')
            .insert({
                admin_id: user.id,
                admin_email: user.email,
                accion: 'crear_super_admin',
                usuario_afectado: user.email,
                detalles_cambios: {
                    user_id: user.id,
                    email: user.email,
                    permisos_otorgados: ['manage_companies', 'manage_subscriptions', 'manage_payments', 'view_analytics', 'manage_users', 'system_configuration']
                },
                observaciones: 'Super administrador creado mediante script de configuración'
            });

        if (logError) {
            console.log('⚠️  Error al crear log de auditoría:', logError.message);
        } else {
            console.log('✅ Log de auditoría creado');
        }

        console.log('\n🎉 ¡Usuario configurado como Super Administrador exitosamente!');
        console.log('\n📋 Detalles:');
        console.log(`   • Email: ${user.email}`);
        console.log(`   • User ID: ${user.id}`);
        console.log('   • Permisos: Todos los permisos de super administrador');
        console.log('\n🔐 Para acceder al panel de Super Admin:');
        console.log('   1. Inicia sesión con este usuario');
        console.log('   2. Navega a /configuracion');
        console.log('   3. Busca la tarjeta "Super Admin" (ahora debería ser visible)');
        console.log('   4. Haz clic en "Gestionar" para acceder al panel completo');

    } catch (error) {
        console.error('❌ Error en la configuración:', error);
    }
}

// Obtener email del argumento de línea de comandos
const email = process.argv[2];

if (!email) {
    console.log('❌ Por favor proporciona un email como argumento');
    console.log('💡 Uso: node scripts/make_super_admin.js <email>');
    console.log('📧 Ejemplo: node scripts/make_super_admin.js admin@example.com');
    process.exit(1);
}

// Ejecutar el script
makeUserSuperAdmin(email);