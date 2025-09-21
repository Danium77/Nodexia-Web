const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createTables() {
    console.log('🚀 Creando tablas del sistema de Super Administración...\n');

    const queries = [
        {
            name: 'planes_suscripcion',
            sql: `
                CREATE TABLE IF NOT EXISTS planes_suscripcion (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    nombre TEXT NOT NULL UNIQUE,
                    descripcion TEXT,
                    precio_mensual DECIMAL(10,2) NOT NULL DEFAULT 0,
                    precio_anual DECIMAL(10,2),
                    limite_usuarios INTEGER DEFAULT NULL,
                    limite_despachos INTEGER DEFAULT NULL,
                    caracteristicas JSONB,
                    activo BOOLEAN DEFAULT true,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `
        },
        {
            name: 'suscripciones_empresa',
            sql: `
                CREATE TABLE IF NOT EXISTS suscripciones_empresa (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
                    plan_id UUID NOT NULL REFERENCES planes_suscripcion(id),
                    estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'suspendida', 'cancelada', 'vencida')),
                    fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
                    fecha_fin DATE,
                    proximo_pago DATE,
                    monto_mensual DECIMAL(10,2) NOT NULL,
                    ciclo_facturacion TEXT DEFAULT 'mensual' CHECK (ciclo_facturacion IN ('mensual', 'anual')),
                    usuarios_actuales INTEGER DEFAULT 0,
                    despachos_mes_actual INTEGER DEFAULT 0,
                    auto_renovar BOOLEAN DEFAULT true,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    UNIQUE(empresa_id)
                );
            `
        },
        {
            name: 'pagos',
            sql: `
                CREATE TABLE IF NOT EXISTS pagos (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
                    suscripcion_id UUID REFERENCES suscripciones_empresa(id),
                    monto DECIMAL(10,2) NOT NULL,
                    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completado', 'fallido', 'cancelado')),
                    metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('transferencia', 'tarjeta', 'efectivo', 'cheque', 'mercadopago')),
                    referencia_externa TEXT,
                    fecha_pago TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    fecha_procesamiento TIMESTAMP WITH TIME ZONE,
                    observaciones TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `
        },
        {
            name: 'super_admins',
            sql: `
                CREATE TABLE IF NOT EXISTS super_admins (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                    email TEXT NOT NULL,
                    nombre_completo TEXT NOT NULL,
                    activo BOOLEAN DEFAULT true,
                    permisos JSONB DEFAULT '{}',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    created_by UUID REFERENCES auth.users(id),
                    UNIQUE(user_id)
                );
            `
        },
        {
            name: 'configuracion_sistema',
            sql: `
                CREATE TABLE IF NOT EXISTS configuracion_sistema (
                    clave TEXT PRIMARY KEY,
                    valor JSONB NOT NULL,
                    descripcion TEXT,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_by UUID REFERENCES auth.users(id)
                );
            `
        },
        {
            name: 'logs_admin',
            sql: `
                CREATE TABLE IF NOT EXISTS logs_admin (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    admin_id UUID NOT NULL REFERENCES auth.users(id),
                    admin_email TEXT NOT NULL,
                    accion TEXT NOT NULL,
                    empresa_afectada TEXT,
                    usuario_afectado TEXT,
                    detalles_cambios JSONB,
                    ip_address INET,
                    user_agent TEXT,
                    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    observaciones TEXT
                );
            `
        }
    ];

    for (const query of queries) {
        try {
            console.log(`📊 Creando tabla: ${query.name}...`);
            const { data, error } = await supabase.rpc('execute_sql', { sql_query: query.sql });
            
            if (error) {
                console.log(`⚠️  Error al crear ${query.name}:`, error.message);
            } else {
                console.log(`✅ Tabla ${query.name} creada exitosamente`);
            }
        } catch (error) {
            console.log(`⚠️  Error ejecutando query para ${query.name}:`, error.message);
        }
    }

    console.log('\n🎉 Proceso de creación de tablas completado');
}

createTables();