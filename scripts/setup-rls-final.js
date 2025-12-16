require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupRLSPolicies() {
  console.log('🔧 Configurando políticas RLS correctas...\n');
  
  const policies = [
    {
      name: 'Eliminar política anterior de viajes_red_nodexia',
      sql: `DROP POLICY IF EXISTS "Solo transportes sin vinculo ven viajes" ON viajes_red_nodexia;`
    },
    {
      name: 'Crear política correcta en viajes_red_nodexia',
      sql: `
        CREATE POLICY "Solo transportes sin vinculo ven viajes"
        ON viajes_red_nodexia
        FOR SELECT
        TO authenticated
        USING (
          NOT EXISTS (
            SELECT 1 FROM relaciones_empresas re
            WHERE re.empresa_transporte_id = public.uid_empresa()
            AND re.empresa_cliente_id = viajes_red_nodexia.empresa_solicitante_id
            AND re.estado = 'activo'
          )
        );`
    },
    {
      name: 'Habilitar RLS en relaciones_empresas',
      sql: `ALTER TABLE relaciones_empresas ENABLE ROW LEVEL SECURITY;`
    },
    {
      name: 'Eliminar política anterior de relaciones_empresas',
      sql: `DROP POLICY IF EXISTS "Transportes ven sus relaciones" ON relaciones_empresas;
             DROP POLICY IF EXISTS "Empresas ven sus relaciones" ON relaciones_empresas;`
    },
    {
      name: 'Crear política en relaciones_empresas (para debugging)',
      sql: `
        CREATE POLICY "Empresas ven sus relaciones"
        ON relaciones_empresas FOR SELECT
        TO authenticated
        USING (
          empresa_transporte_id = public.uid_empresa()
          OR empresa_cliente_id = public.uid_empresa()
        );`
    }
  ];
  
  // Escribir SQL completo a archivo
  const fullSQL = policies.map(p => `-- ${p.name}\n${p.sql}\n`).join('\n');
  fs.writeFileSync('sql/migrations/017_fix_rls_final.sql', fullSQL);
  console.log('📝 SQL guardado en: sql/migrations/017_fix_rls_final.sql\n');
  
  console.log('📋 EJECUTA ESTE SQL EN SUPABASE DASHBOARD > SQL Editor:\n');
  console.log('═'.repeat(80));
  console.log(fullSQL);
  console.log('═'.repeat(80));
  
  // Verificar relaciones con service role
  console.log('\n🔍 Verificando datos actuales...\n');
  
  const { data: relaciones } = await supabase
    .from('relaciones_empresas')
    .select('empresa_transporte_id, empresa_cliente_id, estado')
    .eq('estado', 'activo');
  
  console.log(`✅ Relaciones activas en BD: ${relaciones?.length || 0}`);
  
  const { data: viajes } = await supabase
    .from('viajes_red_nodexia')
    .select('id, empresa_solicitante_id');
  
  console.log(`✅ Viajes en Red Nodexia: ${viajes?.length || 0}\n`);
  
  if (relaciones && viajes) {
    console.log('🔍 Análisis del filtro:');
    viajes.forEach(viaje => {
      const bloqueado = relaciones.some(r => 
        r.empresa_transporte_id === '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a39a0d' && // Logística Express
        r.empresa_cliente_id === viaje.empresa_solicitante_id
      );
      console.log(`  Viaje ${viaje.id.substring(0,8)}... - ${bloqueado ? '🚫 BLOQUEADO' : '✅ VISIBLE'} para Logística Express`);
    });
  }
}

setupRLSPolicies().catch(console.error);
