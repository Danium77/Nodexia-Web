// Script para ejecutar datos demo usando queries individuales
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERROR: Variables de entorno no configuradas');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

console.log('🔧 Creando datos demo para testing...\n');

async function crearDatosDemo() {
    try {
        // PASO 1: Crear 10 Empresas
        console.log('📦 Paso 1/4: Creando 10 empresas de transporte...');
        const empresasNombres = [
            'Transportes Norte Demo',
            'Transportes Sur Demo',
            'Transportes Este Demo',
            'Transportes Oeste Demo',
            'Transportes Central Demo',
            'Transportes Rápido Demo',
            'Transportes Express Demo',
            'Transportes Continental Demo',
            'Transportes Nacional Demo',
            'Transportes Regional Demo'
        ];

        const empresasCreadas = [];
        for (let i = 0; i < empresasNombres.length; i++) {
            const { data, error } = await supabase
                .from('empresas')
                .insert({
                    nombre: empresasNombres[i],
                    tipo_empresa: 'transporte',
                    cuit: `20-${String(30000000 + i + 1).padStart(8, '0')}-${(i + 1) % 10}`,
                    telefono: `+54 11 ${4000 + (i + 1) * 100}-${1000 + (i + 1) * 10}`,
                    email: `contacto@${empresasNombres[i].toLowerCase().replace(/\s/g, '')}.com.ar`,
                    direccion: `Av. Libertador ${1000 + (i + 1) * 100}, CABA`,
                    activo: true
                })
                .select()
                .single();

            if (error) {
                console.error(`   ❌ Error creando ${empresasNombres[i]}:`, error.message);
            } else {
                empresasCreadas.push(data);
                console.log(`   ✓ ${empresasNombres[i]}`);
            }
        }

        console.log(`\n   ✅ ${empresasCreadas.length} empresas creadas\n`);

        // PASO 2: Crear 30 Usuarios Choferes
        console.log('👥 Paso 2/4: Creando 30 usuarios choferes...');
        
        const nombres = ['Juan', 'Pedro', 'Carlos', 'Luis', 'Miguel', 'Jorge', 'Roberto', 'Diego', 'Martín', 'Fernando'];
        const apellidos = ['García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Díaz', 'Torres', 'Ramírez', 'Flores', 'Silva', 'Morales'];
        
        const usuariosCreados = [];
        for (let i = 1; i <= 30; i++) {
            const nombre = nombres[i % 10];
            const apellido = `${apellidos[i % 15]} Demo`;
            const email = `chofer${i}@demo.com.ar`;
            const nombreCompleto = `${nombre} ${apellido}`;

            // Crear en auth.users usando admin API
            const { data: userData, error: authError } = await supabase.auth.admin.createUser({
                email: email,
                password: 'Demo2025!',
                email_confirm: true,
                user_metadata: {
                    full_name: nombreCompleto
                }
            });

            if (authError) {
                console.error(`   ❌ Error creando usuario ${email}:`, authError.message);
                continue;
            }

            // Crear en profiles
            await supabase
                .from('profiles')
                .upsert({
                    id: userData.user.id,
                    name: nombreCompleto
                });

            // Crear en usuarios
            await supabase
                .from('usuarios')
                .upsert({
                    id: userData.user.id,
                    email: email,
                    nombre_completo: nombreCompleto
                });

            usuariosCreados.push({
                id: userData.user.id,
                email: email,
                nombre: nombre,
                apellido: apellido
            });

            console.log(`   ✓ ${nombreCompleto} (${email})`);
        }

        console.log(`\n   ✅ ${usuariosCreados.length} usuarios creados\n`);

        // PASO 3: Obtener rol_id de chofer
        console.log('🔑 Paso 3/4: Obteniendo rol de chofer...');
        const { data: rolData, error: rolError } = await supabase
            .from('roles_empresa')
            .select('id')
            .eq('nombre_rol', 'chofer')
            .eq('tipo_empresa', 'transporte')
            .single();

        if (rolError || !rolData) {
            console.error('   ❌ Error: No se encontró el rol de chofer');
            process.exit(1);
        }

        console.log(`   ✓ Rol ID: ${rolData.id}\n`);

        // PASO 4: Vincular choferes a empresas (3 por empresa)
        console.log('🔗 Paso 4/4: Vinculando choferes a empresas...');
        
        let choferIndex = 0;
        const choferesVinculados = [];

        for (const empresa of empresasCreadas) {
            console.log(`\n   📍 ${empresa.nombre}:`);
            
            for (let i = 0; i < 3 && choferIndex < usuariosCreados.length; i++, choferIndex++) {
                const usuario = usuariosCreados[choferIndex];

                // Crear vinculación en usuarios_empresa
                const { error: vincError } = await supabase
                    .from('usuarios_empresa')
                    .insert({
                        user_id: usuario.id,
                        empresa_id: empresa.id,
                        rol_interno: 'chofer',
                        rol_empresa_id: rolData.id,
                        email_interno: usuario.email,
                        activo: true,
                        fecha_vinculacion: new Date().toISOString()
                    });

                if (vincError) {
                    console.error(`      ❌ Error vinculando ${usuario.email}:`, vincError.message);
                    continue;
                }

                // Crear registro en tabla choferes
                const dni = String(30000000 + Math.floor(Math.random() * 9999999));
                const telefono = `+54 9 11 ${4000 + Math.floor(Math.random() * 5999)}-${1000 + Math.floor(Math.random() * 8999)}`;

                const { error: choferError } = await supabase
                    .from('choferes')
                    .insert({
                        nombre: usuario.nombre,
                        apellido: usuario.apellido,
                        dni: dni,
                        telefono: telefono,
                        id_transporte: empresa.id,
                        usuario_alta: usuario.id,
                        usuario_id: usuario.id
                    });

                if (choferError) {
                    console.error(`      ❌ Error creando registro chofer:`, choferError.message);
                } else {
                    choferesVinculados.push(usuario);
                    console.log(`      ✓ ${usuario.nombre} ${usuario.apellido}`);
                }
            }
        }

        console.log(`\n   ✅ ${choferesVinculados.length} choferes vinculados\n`);

        // Resumen Final
        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ DATOS DEMO CREADOS EXITOSAMENTE');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`📦 Empresas: ${empresasCreadas.length}`);
        console.log(`👥 Usuarios: ${usuariosCreados.length}`);
        console.log(`🔗 Vinculaciones: ${choferesVinculados.length}`);
        console.log(`🔑 Password: Demo2025!`);
        console.log('═══════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('\n❌ ERROR GENERAL:', error.message);
        process.exit(1);
    }
}

crearDatosDemo();
