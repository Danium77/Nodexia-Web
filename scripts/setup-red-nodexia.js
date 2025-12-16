// Crear Red Nodexia - tabla por tabla
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false }, db: { schema: 'public' } }
);

console.log('🚀 Creando Red Nodexia...\n');

async function crearTablas() {
    try {
        // TABLA 1: viajes_red_nodexia
        console.log('📦 Creando viajes_red_nodexia...');
        await supabase.rpc('exec_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS viajes_red_nodexia (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    viaje_id UUID NOT NULL REFERENCES viajes_despacho(id) ON DELETE CASCADE,
                    empresa_solicitante_id UUID NOT NULL REFERENCES empresas(id),
                    tarifa_ofrecida DECIMAL(10, 2) NOT NULL,
                    moneda VARCHAR(3) DEFAULT 'ARS',
                    descripcion_carga TEXT,
                    estado_red VARCHAR(50) NOT NULL DEFAULT 'abierto',
                    fecha_publicacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    fecha_cierre TIMESTAMP WITH TIME ZONE,
                    fecha_asignacion TIMESTAMP WITH TIME ZONE,
                    transporte_asignado_id UUID REFERENCES empresas(id),
                    oferta_aceptada_id UUID,
                    publicado_por UUID REFERENCES auth.users(id),
                    asignado_por UUID REFERENCES auth.users(id),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    CONSTRAINT check_tarifa_positiva CHECK (tarifa_ofrecida > 0)
                );
                
                CREATE INDEX IF NOT EXISTS idx_viajes_red_estado ON viajes_red_nodexia(estado_red);
                CREATE INDEX IF NOT EXISTS idx_viajes_red_viaje ON viajes_red_nodexia(viaje_id);
                CREATE INDEX IF NOT EXISTS idx_viajes_red_empresa ON viajes_red_nodexia(empresa_solicitante_id);
            `
        });
        console.log('  ✓ viajes_red_nodexia\n');

        // TABLA 2: requisitos_viaje_red
        console.log('📦 Creando requisitos_viaje_red...');
        await supabase.rpc('exec_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS requisitos_viaje_red (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    viaje_red_id UUID NOT NULL REFERENCES viajes_red_nodexia(id) ON DELETE CASCADE,
                    tipo_camion VARCHAR(100),
                    tipo_acoplado VARCHAR(100),
                    cantidad_ejes_minimo INTEGER,
                    peso_maximo_kg DECIMAL(10, 2),
                    volumen_maximo_m3 DECIMAL(10, 2),
                    largo_minimo_metros DECIMAL(5, 2),
                    requiere_carga_peligrosa BOOLEAN DEFAULT FALSE,
                    requiere_termo BOOLEAN DEFAULT FALSE,
                    requiere_gps BOOLEAN DEFAULT FALSE,
                    requiere_carga_segura BOOLEAN DEFAULT FALSE,
                    tipo_carga VARCHAR(100),
                    clase_carga_peligrosa VARCHAR(50),
                    observaciones TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    CONSTRAINT unique_requisitos_viaje UNIQUE(viaje_red_id)
                );
                
                CREATE INDEX IF NOT EXISTS idx_requisitos_viaje_red ON requisitos_viaje_red(viaje_red_id);
            `
        });
        console.log('  ✓ requisitos_viaje_red\n');

        // TABLA 3: ofertas_red_nodexia (verificar si ya existe)
        console.log('📦 Verificando ofertas_red_nodexia...');
        const { data: ofertasExist } = await supabase
            .from('ofertas_red_nodexia')
            .select('*')
            .limit(0);
        
        if (ofertasExist !== null) {
            console.log('  ✓ ofertas_red_nodexia (ya existe)\n');
        }

        // TABLA 4: preferencias_transporte_red
        console.log('📦 Creando preferencias_transporte_red...');
        await supabase.rpc('exec_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS preferencias_transporte_red (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    transporte_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
                    zonas_interes TEXT[],
                    radio_operacion_km INTEGER,
                    acepta_nacional BOOLEAN DEFAULT TRUE,
                    tipos_carga_preferidos TEXT[],
                    acepta_carga_peligrosa BOOLEAN DEFAULT FALSE,
                    acepta_carga_refrigerada BOOLEAN DEFAULT FALSE,
                    notificaciones_activas BOOLEAN DEFAULT TRUE,
                    notificacion_email BOOLEAN DEFAULT TRUE,
                    notificacion_push BOOLEAN DEFAULT TRUE,
                    acepta_cargas_red BOOLEAN DEFAULT TRUE,
                    horario_atencion_desde TIME,
                    horario_atencion_hasta TIME,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    CONSTRAINT unique_preferencias_transporte UNIQUE(transporte_id)
                );
                
                CREATE INDEX IF NOT EXISTS idx_preferencias_transporte ON preferencias_transporte_red(transporte_id);
            `
        });
        console.log('  ✓ preferencias_transporte_red\n');

        // TABLA 5: historial_red_nodexia
        console.log('📦 Creando historial_red_nodexia...');
        await supabase.rpc('exec_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS historial_red_nodexia (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    viaje_red_id UUID REFERENCES viajes_red_nodexia(id) ON DELETE CASCADE,
                    oferta_id UUID REFERENCES ofertas_red_nodexia(id) ON DELETE SET NULL,
                    accion VARCHAR(100) NOT NULL,
                    descripcion TEXT,
                    usuario_id UUID REFERENCES auth.users(id),
                    empresa_id UUID REFERENCES empresas(id),
                    metadata JSONB,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                
                CREATE INDEX IF NOT EXISTS idx_historial_viaje_red ON historial_red_nodexia(viaje_red_id);
                CREATE INDEX IF NOT EXISTS idx_historial_accion ON historial_red_nodexia(accion);
            `
        });
        console.log('  ✓ historial_red_nodexia\n');

        console.log('═══════════════════════════════════════');
        console.log('✅ RED NODEXIA CREADA EXITOSAMENTE');
        console.log('═══════════════════════════════════════\n');
        console.log('📊 Tablas creadas:');
        console.log('  - viajes_red_nodexia');
        console.log('  - requisitos_viaje_red');
        console.log('  - ofertas_red_nodexia');
        console.log('  - preferencias_transporte_red');
        console.log('  - historial_red_nodexia\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.details) console.error('Detalles:', error.details);
        if (error.hint) console.error('Sugerencia:', error.hint);
    }
}

crearTablas();
