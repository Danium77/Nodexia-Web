import React, { useState } from 'react';

interface SimpleSuperAdminPanelProps {
  onClose?: () => void;
}

export default function SimpleSuperAdminPanel({ onClose }: SimpleSuperAdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'setup' | 'info'>('info');

  const sqlScript = `
-- Super Admin System Setup
-- Execute this SQL in your Supabase SQL Editor

-- 1. Create subscription plans table
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

-- 2. Create company subscriptions table
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

-- 3. Create payments table
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

-- 4. Create super admins table
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

-- 5. Create system configuration table
CREATE TABLE IF NOT EXISTS configuracion_sistema (
    clave TEXT PRIMARY KEY,
    valor JSONB NOT NULL,
    descripcion TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- 6. Create admin logs table
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

-- 7. Insert default subscription plans
INSERT INTO planes_suscripcion (nombre, descripcion, precio_mensual, precio_anual, limite_usuarios, limite_despachos, caracteristicas) 
VALUES 
(
    'Gratuito',
    'Plan básico para pequeñas empresas',
    0,
    0,
    2,
    50,
    '["Gestión básica de despachos", "2 usuarios", "50 despachos/mes", "Soporte por email"]'::jsonb
),
(
    'Empresarial',
    'Plan ideal para empresas medianas',
    15000,
    150000,
    10,
    500,
    '["Gestión completa", "10 usuarios", "500 despachos/mes", "Red de empresas", "Soporte prioritario", "Reportes avanzados"]'::jsonb
),
(
    'Premium',
    'Plan para grandes empresas',
    30000,
    300000,
    NULL,
    NULL,
    '["Sin límites", "Usuarios ilimitados", "Despachos ilimitados", "API personalizada", "Soporte 24/7", "Integración personalizada"]'::jsonb
)
ON CONFLICT (nombre) DO NOTHING;

-- 8. Insert system configuration
INSERT INTO configuracion_sistema (clave, valor, descripcion)
VALUES 
('version_sistema', '"1.0.0"', 'Versión actual del sistema'),
('mantenimiento', 'false', 'Indica si el sistema está en mantenimiento'),
('registro_empresas_abierto', 'true', 'Permite el registro libre de nuevas empresas')
ON CONFLICT (clave) DO NOTHING;

-- 9. Create core functions
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM super_admins 
        WHERE user_id = auth.uid() 
        AND activo = true
    );
END;
$$;

-- 10. Enable RLS and create policies
ALTER TABLE planes_suscripcion ENABLE ROW LEVEL SECURITY;
ALTER TABLE suscripciones_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_admin ENABLE ROW LEVEL SECURITY;

-- Policies for super_admins table
CREATE POLICY "Super admins can manage super admin records" ON super_admins
    FOR ALL USING (is_super_admin());

-- Policies for planes_suscripcion
CREATE POLICY "Super admins can manage subscription plans" ON planes_suscripcion
    FOR ALL USING (is_super_admin());

CREATE POLICY "Users can view active subscription plans" ON planes_suscripcion
    FOR SELECT USING (activo = true);

-- 11. Create your super admin user (replace with your actual user ID)
-- First, get your user ID by running: SELECT id, email FROM auth.users;
-- Then replace 'YOUR_USER_ID_HERE' with your actual user ID

-- INSERT INTO super_admins (user_id, email, nombre_completo, activo, permisos)
-- VALUES (
--     '840dbdcd-5171-40e2-afe8-61446cf5c2b4',  -- Replace with your user ID
--     'admin@example.com',  -- Replace with your email
--     'Super Administrador',
--     true,
--     '{"manage_companies": true, "manage_subscriptions": true, "manage_payments": true, "view_analytics": true, "manage_users": true}'::jsonb
-- );

-- 12. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_suscripciones_empresa_id ON suscripciones_empresa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pagos_empresa_id ON pagos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_super_admins_user_id ON super_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_admin_timestamp ON logs_admin(timestamp);
  `;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('¡Script copiado al portapapeles!');
    } catch (err) {
      console.error('Error al copiar:', err);
      alert('Error al copiar al portapapeles');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Configuración de Super Administración</h2>
            <p className="text-sm text-gray-600 mt-1">
              Configuración inicial del sistema de super administración
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          {[
            { key: 'info', label: 'Información' },
            { key: 'setup', label: 'Script SQL' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'info' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-blue-900 mb-2">
                🚀 Sistema de Super Administración
              </h3>
              <p className="text-blue-800 mb-4">
                El sistema de super administración te permitirá:
              </p>
              <ul className="list-disc list-inside text-blue-700 space-y-1">
                <li>Gestionar todas las empresas del sistema</li>
                <li>Administrar planes de suscripción y pagos</li>
                <li>Controlar usuarios y permisos</li>
                <li>Ver estadísticas del sistema completo</li>
                <li>Auditar todas las acciones administrativas</li>
              </ul>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-orange-900 mb-2">
                ⚙️ Pasos para la configuración
              </h3>
              <ol className="list-decimal list-inside text-orange-800 space-y-2">
                <li>Ve a la pestaña "Script SQL"</li>
                <li>Copia el script SQL completo</li>
                <li>Abre el editor SQL de Supabase</li>
                <li>Pega y ejecuta el script</li>
                <li>Actualiza la página para ver el panel de Super Admin</li>
              </ol>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-green-900 mb-2">
                📊 Funcionalidades incluidas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-green-800">
                <div>
                  <h4 className="font-medium">Gestión de Empresas</h4>
                  <ul className="text-sm list-disc list-inside ml-2">
                    <li>Crear nuevas empresas</li>
                    <li>Activar/desactivar empresas</li>
                    <li>Ver estadísticas por empresa</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium">Suscripciones y Pagos</h4>
                  <ul className="text-sm list-disc list-inside ml-2">
                    <li>Planes: Gratuito, Empresarial, Premium</li>
                    <li>Control de límites por plan</li>
                    <li>Gestión de pagos</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium">Auditoría</h4>
                  <ul className="text-sm list-disc list-inside ml-2">
                    <li>Logs de todas las acciones</li>
                    <li>Rastreo de cambios</li>
                    <li>Reportes de actividad</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium">Configuración</h4>
                  <ul className="text-sm list-disc list-inside ml-2">
                    <li>Configuración del sistema</li>
                    <li>Modo mantenimiento</li>
                    <li>Gestión de super admins</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('setup')}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-medium"
              >
                Ver Script SQL
              </button>
              <a
                href={`https://supabase.com/dashboard`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 font-medium"
              >
                Abrir Editor SQL
              </a>
            </div>
          </div>
        )}

        {activeTab === 'setup' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Script SQL de Configuración</h3>
              <button
                onClick={() => copyToClipboard(sqlScript)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm"
              >
                Copiar Script
              </button>
            </div>
            
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
                <code>{sqlScript}</code>
              </pre>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">📝 Instrucciones:</h4>
              <ol className="text-yellow-800 text-sm space-y-1 list-decimal list-inside">
                <li>Copia el script SQL completo usando el botón "Copiar Script"</li>
                <li>Abre el editor SQL de Supabase usando el enlace proporcionado</li>
                <li>Pega el script en el editor</li>
                <li>Ejecuta el script haciendo clic en "Run"</li>
                <li>Busca el comentario del paso 11 y descomenta la línea INSERT para crear tu usuario super admin</li>
                <li>Reemplaza el user_id con tu ID real (puedes obtenerlo ejecutando: SELECT id, email FROM auth.users;)</li>
                <li>Actualiza esta página para ver el panel de Super Admin</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}