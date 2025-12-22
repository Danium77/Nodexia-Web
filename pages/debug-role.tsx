// pages/debug-role.tsx
// Página de debug para verificar detección de roles

import { useUserRole } from '../lib/contexts/UserRoleContext';
import { createClient } from '@supabase/supabase-js';
import { supabase as clientSupabase } from '../lib/supabaseClient';
import { useState, useEffect } from 'react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DebugRole() {
  const [user, setUser] = useState<any>(null);
  const { role: userRole, primaryRole, roles, loading, refreshRoles } = useUserRole();
  const [manualCheck, setManualCheck] = useState<any>(null);

  useEffect(() => {
    // Get current user
    const getUser = async () => {
      const { data: { user }, error } = await clientSupabase.auth.getUser();
      if (user && !error) {
        setUser(user);
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    if (user?.email) {
      checkRoleManually();
    }
  }, [user]);

  const checkRoleManually = async () => {
    if (!user?.email) return;

    try {
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select(`
          id,
          email,
          nombre_completo,
          usuarios_empresa (
            rol_interno,
            empresas (nombre)
          )
        `)
        .eq('email', user.email)
        .single();

      setManualCheck(usuarioData);
    } catch (error) {
      console.error('Error checking role:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div>No hay usuario logueado. <a href="/login">Iniciar sesión</a></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">🔍 Debug de Roles</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Info del Contexto */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">📋 Contexto UserRole</h2>
            <div className="space-y-2">
              <p><strong>Loading:</strong> {loading ? 'Sí' : 'No'}</p>
              <p><strong>Rol Primario:</strong> <code>{primaryRole || 'null'}</code></p>
              <p><strong>Rol (legacy):</strong> <code>{userRole || 'null'}</code></p>
              <p><strong>Todos los roles:</strong> <code>[{roles?.join(', ')}]</code></p>
              <p><strong>Email:</strong> {user.email}</p>
            </div>
            
            <div className="mt-4 space-y-2">
              <button
                onClick={() => refreshRoles()}
                className="block w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                🔄 Refrescar Roles
              </button>
              <button
                onClick={() => window.location.reload()}
                className="block w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                🔃 Recargar Página Completa
              </button>
            </div>
          </div>

          {/* Verificación Manual */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">🔍 Verificación Manual</h2>
            {manualCheck ? (
              <div className="space-y-2">
                <p><strong>Email:</strong> {manualCheck.email}</p>
                <p><strong>Nombre:</strong> {manualCheck.nombre_completo}</p>
                {manualCheck.usuarios_empresa?.[0] ? (
                  <>
                    <p><strong>Rol Interno:</strong> <code>{manualCheck.usuarios_empresa[0].rol_interno}</code></p>
                    <p><strong>Empresa:</strong> {manualCheck.usuarios_empresa[0].empresas?.nombre}</p>
                    <div className="mt-4 p-3 bg-green-50 rounded">
                      <p className="text-green-800">
                        <strong>Rol esperado:</strong> {
                          manualCheck.usuarios_empresa[0].rol_interno === 'Control de Acceso' ? 'control_acceso' :
                          manualCheck.usuarios_empresa[0].rol_interno === 'Supervisor' ? 'supervisor' :
                          manualCheck.usuarios_empresa[0].rol_interno === 'Admin Nodexia' ? 'admin_nodexia' :
                          manualCheck.usuarios_empresa[0].rol_interno === 'Coordinador' ? 'coordinador' :
                          'coordinador'
                        }
                      </p>
                      <p className="text-sm text-green-600 mt-1">
                        {manualCheck.usuarios_empresa[0].rol_interno === 'Control de Acceso' && 
                          'Debería redirigir a /control-acceso'
                        }
                        {manualCheck.usuarios_empresa[0].rol_interno === 'Supervisor' && 
                          'Debería redirigir a /supervisor-carga o /supervisor-flota según tipo de empresa'
                        }
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-red-600">❌ Sin rol asignado</p>
                )}
              </div>
            ) : (
              <p>Cargando...</p>
            )}
            
            <button
              onClick={checkRoleManually}
              className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              🔍 Verificar Nuevamente
            </button>
          </div>
        </div>

        {/* Acciones */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">🚀 Acciones</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <a 
                href="/control-acceso" 
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                🚪 Ir a Control de Acceso
              </a>
              <a 
                href="/supervisor-carga" 
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                👷 Ir a Supervisor de Carga
              </a>
              <a 
                href="/dashboard" 
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                📊 Dashboard
              </a>
            </div>
            
            <div className="text-sm text-gray-600">
              <p>💡 <strong>Tip:</strong> Revisa la consola del navegador (F12) para ver los logs de debug</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}