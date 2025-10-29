const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Roles correctos según types.ts
const ROLES_CORRECTOS = {
  planta: [
    { nombre_rol: 'coordinador', descripcion: 'Coordinador de planta', permisos: {} },
    { nombre_rol: 'control_acceso', descripcion: 'Control de acceso y seguridad', permisos: {} },
    { nombre_rol: 'supervisor_carga', descripcion: 'Supervisor de operaciones de carga', permisos: {} }
  ],
  transporte: [
    { nombre_rol: 'coordinador_transporte', descripcion: 'Coordinador de empresa de transporte', permisos: {} },
    { nombre_rol: 'chofer', descripcion: 'Conductor con acceso a sus viajes', permisos: {} },
    { nombre_rol: 'administrativo', descripcion: 'Personal administrativo de transporte', permisos: {} }
  ],
  cliente: [
    { nombre_rol: 'visor', descripcion: 'Usuario con acceso de solo lectura', permisos: {} }
  ]
};

async function sincronizarRoles() {
  console.log('🔄 Sincronizando roles con types.ts...\n');

  for (const [tipoEmpresa, roles] of Object.entries(ROLES_CORRECTOS)) {
    console.log(`📋 Procesando roles para tipo: ${tipoEmpresa}`);
    
    for (const rol of roles) {
      // Verificar si el rol ya existe
      const { data: existente, error: errorCheck } = await supabaseAdmin
        .from('roles_empresa')
        .select('*')
        .eq('nombre_rol', rol.nombre_rol)
        .eq('tipo_empresa', tipoEmpresa)
        .maybeSingle();

      if (errorCheck) {
        console.error(`  ❌ Error verificando ${rol.nombre_rol}:`, errorCheck.message);
        continue;
      }

      if (existente) {
        console.log(`  ✅ Ya existe: ${rol.nombre_rol}`);
      } else {
        // Insertar nuevo rol
        const { error: errorInsert } = await supabaseAdmin
          .from('roles_empresa')
          .insert({
            nombre_rol: rol.nombre_rol,
            descripcion: rol.descripcion,
            tipo_empresa: tipoEmpresa,
            permisos: rol.permisos,
            activo: true
          });

        if (errorInsert) {
          console.error(`  ❌ Error creando ${rol.nombre_rol}:`, errorInsert.message);
        } else {
          console.log(`  🆕 Creado: ${rol.nombre_rol}`);
        }
      }
    }
    console.log('');
  }

  // Mostrar resumen final
  console.log('\n📊 RESUMEN FINAL DE ROLES:\n');
  
  const { data: finalRoles } = await supabaseAdmin
    .from('roles_empresa')
    .select('*')
    .in('tipo_empresa', ['planta', 'transporte', 'cliente'])
    .eq('activo', true)
    .order('tipo_empresa, nombre_rol');

  const porTipo = {
    planta: [],
    transporte: [],
    cliente: []
  };

  finalRoles.forEach(rol => {
    if (porTipo[rol.tipo_empresa]) {
      porTipo[rol.tipo_empresa].push(rol.nombre_rol);
    }
  });

  console.log('🏭 PLANTA:');
  porTipo.planta.forEach(r => console.log(`  ✅ ${r}`));
  
  console.log('\n🚛 TRANSPORTE:');
  porTipo.transporte.forEach(r => console.log(`  ✅ ${r}`));
  
  console.log('\n👤 CLIENTE:');
  porTipo.cliente.forEach(r => console.log(`  ✅ ${r}`));

  console.log('\n✅ Sincronización completada!');
}

sincronizarRoles();
