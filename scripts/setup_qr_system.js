// scripts/setup_qr_system.js
// Script para crear el sistema QR de viajes paso a paso

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function crearTablaViajes() {
  console.log('🚛 Creando tabla viajes...');
  
  const createViajesSQL = `
    CREATE TABLE IF NOT EXISTS viajes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      -- Datos del viaje
      numero_viaje VARCHAR(50) UNIQUE NOT NULL,
      qr_code TEXT UNIQUE NOT NULL,
      tipo_operacion VARCHAR(20) CHECK (tipo_operacion IN ('carga', 'descarga')) NOT NULL,
      
      -- Relaciones
      chofer_id UUID REFERENCES choferes(id),
      camion_id UUID REFERENCES camiones(id),
      acoplado_id UUID REFERENCES acoplados(id),
      empresa_origen_id UUID REFERENCES empresas(id),
      empresa_destino_id UUID REFERENCES empresas(id),
      
      -- Estados del viaje
      estado_viaje VARCHAR(30) DEFAULT 'confirmado' CHECK (
        estado_viaje IN (
          'confirmado', 'en_transito', 'ingresado_planta', 'en_playa_esperando',
          'llamado_carga', 'iniciando_carga', 'cargando', 'carga_finalizada',
          'listo_egreso', 'egresado_planta', 'viaje_completado', 'incidencia'
        )
      ),
      
      -- Timestamps de control
      fecha_confirmacion TIMESTAMPTZ DEFAULT NOW(),
      fecha_ingreso_planta TIMESTAMPTZ,
      fecha_llamado_carga TIMESTAMPTZ,
      fecha_inicio_carga TIMESTAMPTZ,
      fecha_fin_carga TIMESTAMPTZ,
      fecha_egreso_planta TIMESTAMPTZ,
      
      -- Datos de carga/descarga
      producto TEXT,
      peso_estimado DECIMAL(10,2),
      peso_real DECIMAL(10,2),
      observaciones TEXT,
      
      -- Control de responsables
      ingreso_por UUID REFERENCES auth.users(id),
      llamado_por UUID REFERENCES auth.users(id),
      carga_iniciada_por UUID REFERENCES auth.users(id),
      carga_finalizada_por UUID REFERENCES auth.users(id),
      egreso_por UUID REFERENCES auth.users(id),
      
      -- Documentación
      documentacion_validada BOOLEAN DEFAULT false,
      documentos_faltantes TEXT[],
      remito_url TEXT,
      fotos_carga TEXT,
      
      -- Audit
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  const { error } = await supabaseAdmin.rpc('exec_sql', { 
    sql_query: createViajesSQL 
  });
  
  if (error) {
    console.log('❌ Error creando tabla viajes:', error.message);
    return false;
  }
  
  console.log('✅ Tabla viajes creada');
  return true;
}

async function crearTablasComplementarias() {
  console.log('📋 Creando tablas complementarias...');

  const tablas = [
    {
      nombre: 'incidencias_viaje',
      sql: `
        CREATE TABLE IF NOT EXISTS incidencias_viaje (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          viaje_id UUID REFERENCES viajes(id) ON DELETE CASCADE,
          tipo_incidencia VARCHAR(50) NOT NULL,
          descripcion TEXT NOT NULL,
          estado_incidencia VARCHAR(20) DEFAULT 'abierta' CHECK (
            estado_incidencia IN ('abierta', 'en_proceso', 'resuelta', 'cerrada')
          ),
          prioridad VARCHAR(10) DEFAULT 'media' CHECK (
            prioridad IN ('baja', 'media', 'alta', 'critica')
          ),
          reportada_por UUID REFERENCES auth.users(id),
          asignada_a UUID REFERENCES auth.users(id),
          fecha_reporte TIMESTAMPTZ DEFAULT NOW(),
          fecha_resolucion TIMESTAMPTZ,
          solucion TEXT,
          fotos_incidencia TEXT,
          datos_extra JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    },
    {
      nombre: 'notificaciones',
      sql: `
        CREATE TABLE IF NOT EXISTS notificaciones (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          viaje_id UUID REFERENCES viajes(id) ON DELETE SET NULL,
          tipo_notificacion VARCHAR(50) NOT NULL,
          titulo VARCHAR(255) NOT NULL,
          mensaje TEXT NOT NULL,
          leida BOOLEAN DEFAULT false,
          enviada BOOLEAN DEFAULT false,
          fecha_envio TIMESTAMPTZ,
          datos_extra JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    }
  ];

  for (const tabla of tablas) {
    const { error } = await supabaseAdmin.rpc('exec_sql', { 
      sql_query: tabla.sql 
    });
    
    if (error) {
      console.log(`❌ Error creando ${tabla.nombre}:`, error.message);
    } else {
      console.log(`✅ Tabla ${tabla.nombre} creada`);
    }
  }
}

async function habilitarRLS() {
  console.log('🔐 Configurando RLS...');
  
  const rlsSQL = `
    -- Habilitar RLS
    ALTER TABLE viajes ENABLE ROW LEVEL SECURITY;
    ALTER TABLE incidencias_viaje ENABLE ROW LEVEL SECURITY;
    ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
    
    -- Políticas básicas (simplificadas para demo)
    DROP POLICY IF EXISTS "Usuarios pueden ver viajes de su empresa" ON viajes;
    CREATE POLICY "Usuarios pueden ver viajes de su empresa" ON viajes
      FOR SELECT USING (
        empresa_origen_id IN (
          SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid()
        )
        OR empresa_destino_id IN (
          SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid()
        )
      );
      
    DROP POLICY IF EXISTS "Control y supervisores pueden modificar viajes" ON viajes;
    CREATE POLICY "Control y supervisores pueden modificar viajes" ON viajes
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM usuarios_empresa ue
          WHERE ue.user_id = auth.uid() 
          AND ue.rol_interno IN ('Control de Acceso', 'Supervisor de Carga', 'Super Admin')
        )
      );
  `;

  const { error } = await supabaseAdmin.rpc('exec_sql', { 
    sql_query: rlsSQL 
  });
  
  if (error) {
    console.log('❌ Error configurando RLS:', error.message);
  } else {
    console.log('✅ RLS configurado');
  }
}

async function main() {
  try {
    console.log('🚀 Configurando sistema QR de viajes...\n');
    
    await crearTablaViajes();
    await crearTablasComplementarias();
    await habilitarRLS();
    
    console.log('\n🎉 Sistema QR configurado exitosamente!');
    console.log('Ahora puedes ejecutar: node scripts/seed_viajes_qr_demo.js');
    
  } catch (error) {
    console.error('❌ Error configurando sistema:', error);
  }
}

main();