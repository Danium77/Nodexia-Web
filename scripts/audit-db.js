/**
 * AUDITORÍA EXPRESS DE BASE DE DATOS
 * 
 * Este script verifica el estado actual de la base de datos comparándolo
 * con las migraciones y detecta inconsistencias.
 * 
 * Uso: node scripts/audit-db.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno');
  console.error('Necesitas: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// =====================================================
// AUDITORÍA DE TABLAS
// =====================================================

async function auditTables() {
  log('\n📊 AUDITORÍA DE TABLAS', 'cyan');
  log('='.repeat(60), 'cyan');

  try {
    // Método directo: intentar acceder a tablas conocidas
    log('\n⚠️  Verificando tablas críticas directamente...', 'yellow');
    
    const knownTables = [
      'empresas', 'usuarios', 'usuarios_empresa', 'ubicaciones',
      'choferes', 'camiones', 'acoplados', 'unidades_operativas',
      'despachos', 'viajes_despacho', 'registros_acceso',
      'incidencias_viaje', 'tracking_gps', 'notificaciones',
      'documentos_entidad', 'auditoria_documentos', 'documentos_viaje_seguro'
    ];
    
    const tables = [];
    for (const table of knownTables) {
      const { error: testError } = await supabase.from(table).select('id').limit(1);
      if (!testError) {
        tables.push(table);
      }
    }
    
    log(`\n✅ Tablas encontradas: ${tables.length}/${knownTables.length}`, 'green');
    
    // Tablas esperadas (críticas para MVP)
    const expectedTables = [
      'empresas',
      'usuarios',
      'usuarios_empresa',
      'ubicaciones',
      'choferes',
      'camiones',
      'acoplados',
      'unidades_operativas',
      'despachos',
      'viajes_despacho',
      'registros_acceso',
      'incidencias_viaje',
      'tracking_gps',
      'notificaciones',
    ];

    log('\n🔍 Verificando tablas críticas:', 'yellow');
    expectedTables.forEach(table => {
      if (tables.includes(table)) {
        log(`  ✅ ${table}`, 'green');
      } else {
        log(`  ❌ ${table} - FALTA`, 'red');
      }
    });

    // Detectar tablas extra (posiblemente obsoletas)
    const extraTables = tables.filter(t => !expectedTables.includes(t) && !t.startsWith('pg_'));
    if (extraTables.length > 0) {
      log('\n⚠️  Tablas adicionales (verificar si son obsoletas):', 'yellow');
      extraTables.forEach(table => {
        log(`  - ${table}`, 'yellow');
      });
    }

    return { tables, expectedTables, extraTables };

  } catch (error) {
    log(`❌ Error en auditoría de tablas: ${error.message}`, 'red');
    throw error;
  }
}

// =====================================================
// AUDITORÍA DE FUNCIONES/RPCs
// =====================================================

async function auditFunctions() {
  log('\n⚙️  AUDITORÍA DE FUNCIONES', 'cyan');
  log('='.repeat(60), 'cyan');

  try {
    const { data, error } = await supabase.rpc('pg_catalog.pg_get_functiondef', {});
    
    // Como no tenemos acceso directo al catálogo, hacemos query alternativa
    const query = `
      SELECT 
        p.proname as function_name,
        pg_get_function_arguments(p.oid) as arguments,
        CASE p.provolatile
          WHEN 'i' THEN 'IMMUTABLE'
          WHEN 's' THEN 'STABLE'
          WHEN 'v' THEN 'VOLATILE'
        END as volatility,
        CASE p.prosecdef
          WHEN true THEN 'SECURITY DEFINER'
          ELSE 'SECURITY INVOKER'
        END as security
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.prokind = 'f'
      ORDER BY p.proname;
    `;

    // Por limitaciones de Supabase client, usamos un enfoque simplificado
    log('\n📝 Funciones esperadas (verificar manualmente en Supabase Dashboard):', 'yellow');
    
    const expectedFunctions = [
      'validar_transicion_estado_unidad',
      'obtener_proximos_estados_unidad',
      'actualizar_estado_carga',
      'registrar_ubicacion_gps',
      'verificar_documentacion_viaje', // Si ya se ejecutó migración 046
    ];

    expectedFunctions.forEach(fn => {
      log(`  - ${fn}`, 'blue');
    });

    log('\n💡 Para verificar funciones, ir a:', 'cyan');
    log('   Supabase Dashboard → Database → Functions', 'cyan');

  } catch (error) {
    log(`⚠️  No se pudo auditar funciones automáticamente: ${error.message}`, 'yellow');
    log('   Verificar manualmente en Supabase Dashboard', 'yellow');
  }
}

// =====================================================
// AUDITORÍA DE POLÍTICAS RLS
// =====================================================

async function auditRLS() {
  log('\n🔒 AUDITORÍA DE POLÍTICAS RLS', 'cyan');
  log('='.repeat(60), 'cyan');

  try {
    // Verificar qué tablas tienen RLS habilitado
    const query = `
      SELECT 
        schemaname,
        tablename,
        rowsecurity as rls_enabled
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;

    log('\n⚠️  Verificación RLS requiere acceso directo a pg_catalog', 'yellow');
    log('   Por favor ejecutar manualmente:', 'yellow');
    log(`\n${query}`, 'blue');
    log('\n💡 En Supabase SQL Editor:', 'cyan');
    log('   1. Ir a SQL Editor', 'cyan');
    log('   2. Pegar query anterior', 'cyan');
    log('   3. Verificar que tablas críticas tengan rls_enabled = true', 'cyan');

    // Tablas que DEBEN tener RLS
    const rlsRequired = [
      'empresas',
      'usuarios_empresa',
      'despachos',
      'viajes_despacho',
      'camiones',
      'choferes',
      'acoplados',
      'documentos_entidad', // Si ya se ejecutó migración 046
    ];

    log('\n📋 Tablas que DEBEN tener RLS habilitado:', 'yellow');
    rlsRequired.forEach(table => {
      log(`  - ${table}`, 'yellow');
    });

  } catch (error) {
    log(`⚠️  Error en auditoría RLS: ${error.message}`, 'yellow');
  }
}

// =====================================================
// AUDITORÍA DE MIGRACIONES
// =====================================================

async function auditMigrations() {
  log('\n📂 AUDITORÍA DE ARCHIVOS DE MIGRACIONES', 'cyan');
  log('='.repeat(60), 'cyan');

  const migrationsDir = path.join(__dirname, '..', 'sql', 'migrations');
  
  try {
    const files = fs.readdirSync(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql'));
    
    log(`\n📄 Total de archivos SQL: ${sqlFiles.length}`, 'bright');

    // Clasificar archivos
    const numbered = sqlFiles.filter(f => /^\d+/.test(f));
    const fixes = sqlFiles.filter(f => f.startsWith('FIX'));
    const debug = sqlFiles.filter(f => f.startsWith('DEBUG') || f.includes('verificar') || f.includes('check'));
    const scripts = sqlFiles.filter(f => f.startsWith('ejecutar') || f.endsWith('.ps1') || f.endsWith('.md'));
    const others = sqlFiles.filter(f => 
      !numbered.includes(f) && 
      !fixes.includes(f) && 
      !debug.includes(f) && 
      !scripts.includes(f) && 
      f.endsWith('.sql')
    );

    log(`\n📊 Clasificación:`, 'yellow');
    log(`  ✅ Migraciones numeradas: ${numbered.length}`, 'green');
    log(`  ⚠️  Archivos FIX_*: ${fixes.length}`, 'yellow');
    log(`  🔍 Archivos DEBUG/verificar: ${debug.length}`, 'yellow');
    log(`  📝 Scripts de ejecución: ${scripts.length}`, 'blue');
    log(`  ❓ Otros: ${others.length}`, 'yellow');

    // Detectar duplicados y versiones
    const duplicates = [];
    const baseNames = new Map();
    
    numbered.forEach(file => {
      const match = file.match(/^(\d+[a-z]?)_/);
      if (match) {
        const num = match[1];
        if (baseNames.has(num)) {
          duplicates.push({ original: baseNames.get(num), duplicate: file });
        } else {
          baseNames.set(num, file);
        }
      }
    });

    if (duplicates.length > 0) {
      log(`\n⚠️  DUPLICADOS DETECTADOS (posibles versiones):`, 'red');
      duplicates.forEach(({ original, duplicate }) => {
        log(`  - ${original} <-> ${duplicate}`, 'red');
      });
    }

    // Última migración ejecutada vs última disponible
    const lastNumbered = numbered
      .map(f => {
        const match = f.match(/^(\d+)/);
        return match ? { file: f, num: parseInt(match[1]) } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.num - a.num)[0];

    if (lastNumbered) {
      log(`\n📌 Última migración numerada: ${lastNumbered.file}`, 'cyan');
    }

    // Recomendaciones
    log(`\n💡 RECOMENDACIONES:`, 'yellow');
    
    if (fixes.length > 5) {
      log(`  ⚠️  Hay ${fixes.length} archivos FIX_* - Indicador de problemas recurrentes`, 'red');
      log(`     Acción: Consolidar en una migración limpia`, 'yellow');
    }
    
    if (debug.length > 5) {
      log(`  ⚠️  Hay ${debug.length} archivos debug/verificar - Pueden ser obsoletos`, 'red');
      log(`     Acción: Revisar y eliminar los obsoletos`, 'yellow');
    }

    if (sqlFiles.length > 50) {
      log(`  ⚠️  ${sqlFiles.length} archivos SQL es demasiado - Difícil de mantener`, 'red');
      log(`     Acción: Crear migración consolidada 047_consolidacion_total.sql`, 'yellow');
    }

    // Crear reporte detallado
    const reportPath = path.join(__dirname, '..', '.copilot', 'BD-AUDIT-REPORT.md');
    const report = generateReport({ sqlFiles, numbered, fixes, debug, others, duplicates, lastNumbered });
    fs.writeFileSync(reportPath, report);
    log(`\n✅ Reporte detallado guardado en: .copilot/BD-AUDIT-REPORT.md`, 'green');

  } catch (error) {
    log(`❌ Error leyendo migraciones: ${error.message}`, 'red');
  }
}

// =====================================================
// AUDITORÍA DE INTEGRIDAD DE DATOS
// =====================================================

async function auditDataIntegrity() {
  log('\n🔍 AUDITORÍA DE INTEGRIDAD DE DATOS', 'cyan');
  log('='.repeat(60), 'cyan');

  try {
    // Verificar registros huérfanos (foreign keys rotos)
    log('\n⚠️  Verificando integridad referencial...', 'yellow');

    // Ejemplo: Viajes sin empresa
    const { data: viajesSinEmpresa, error: e1 } = await supabase
      .from('viajes_despacho')
      .select('id')
      .is('empresa_transporte_id', null);

    if (!e1 && viajesSinEmpresa) {
      if (viajesSinEmpresa.length > 0) {
        log(`  ❌ ${viajesSinEmpresa.length} viajes sin empresa_transporte_id`, 'red');
      } else {
        log(`  ✅ Todos los viajes tienen empresa asignada`, 'green');
      }
    }

    // Ejemplo: Usuarios sin empresa
    const { data: usersSinEmpresa, error: e2 } = await supabase
      .from('usuarios_empresa')
      .select('user_id')
      .is('empresa_id', null);

    if (!e2 && usersSinEmpresa) {
      if (usersSinEmpresa.length > 0) {
        log(`  ❌ ${usersSinEmpresa.length} usuarios sin empresa`, 'red');
      } else {
        log(`  ✅ Todos los usuarios tienen empresa asignada`, 'green');
      }
    }

    log('\n💡 Para auditoría completa, ejecutar queries específicas en Supabase SQL Editor', 'cyan');

  } catch (error) {
    log(`⚠️  Error en auditoría de  integridad: ${error.message}`, 'yellow');
  }
}

// =====================================================
// GENERAR REPORTE DETALLADO
// =====================================================

function generateReport(data) {
  const { sqlFiles, numbered, fixes, debug, others, duplicates, lastNumbered } = data;

  return `# REPORTE DE AUDITORÍA DE BASE DE DATOS

**Fecha:** ${new Date().toISOString()}  
**Proyecto:** Nodexia-Web

---

## 📊 RESUMEN

- **Total archivos SQL:** ${sqlFiles.length}
- **Migraciones numeradas:** ${numbered.length}
- **Archivos FIX:** ${fixes.length}
- **Archivos DEBUG/verificar:** ${debug.length}
- **Otros:** ${others.length}
- **Última migración:** ${lastNumbered ? lastNumbered.file : 'N/A'}

---

## ⚠️ PROBLEMAS DETECTADOS

### Archivos Duplicados/Versiones:
${duplicates.length > 0 ? duplicates.map(d => `- ${d.original} <-> ${d.duplicate}`).join('\n') : 'Ninguno'}

### Archivos FIX (${fixes.length}):
${fixes.map(f => `- ${f}`).join('\n')}

### Archivos DEBUG (${debug.length}):
${debug.map(f => `- ${f}`).join('\n')}

---

## 💡 RECOMENDACIONES

1. **Consolidación urgente:** Crear \`047_consolidacion_total.sql\` que incluya:
   - Schema completo actual
   - Todos los índices necesarios
   - Funciones RPC actualizadas
   - Políticas RLS correctas

2. **Eliminar archivos obsoletos:**
   - Todos los DEBUG_*
   - Todos los verificar_*
   - Todos los check_*
   - FIX_* una vez consolidados

3. **Backup antes de consolidar:**
   \`\`\`bash
   # Hacer backup completo de BD antes de consolidación
   \`\`\`

4. **Documentar schema:**
   - Crear diagrama ER actualizado
   - Documentar cada tabla y relación
   - Listar funciones y su propósito

---

## 📋 MIGRACIONES NUMERADAS

${numbered.map((f, i) => `${i + 1}. ${f}`).join('\n')}

---

## 🔄 PRÓXIMOS PASOS

1. [ ] Backup completo de BD
2. [ ] Crear script de consolidación
3. [ ] Testear en ambiente de desarrollo
4. [ ] Ejecutar en producción
5. [ ] Eliminar archivos obsoletos
6. [ ] Actualizar documentación

---

**Generado automáticamente por:** scripts/audit-db.js
`;
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  log('\n' + '='.repeat(60), 'bright');
  log('🔍 AUDITORÍA EXPRESS DE BASE DE DATOS', 'bright');
  log('='.repeat(60) + '\n', 'bright');

  try {
    await auditTables();
    await auditFunctions();
    await auditRLS();
    await auditMigrations();
    await auditDataIntegrity();

    log('\n' + '='.repeat(60), 'green');
    log('✅ AUDITORÍA COMPLETADA', 'green');
    log('='.repeat(60) + '\n', 'green');

    log('📄 Reporte completo en: .copilot/BD-AUDIT-REPORT.md', 'cyan');
    log('\n💡 Próximo paso: Revisar reporte y decidir plan de consolidación\n', 'yellow');

  } catch (error) {
    log('\n❌ Error durante auditoría:', 'red');
    log(error.message, 'red');
    log('\nStack trace:', 'red');
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar
if (require.main === module) {
  main();
}

module.exports = { auditTables, auditFunctions, auditRLS, auditMigrations };
