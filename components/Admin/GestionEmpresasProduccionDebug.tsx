import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function GestionEmpresasProduccionDebug() {
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [datos, setDatos] = useState({
    planes: [],
    tipos: [],
    roles: [],
    empresas: [],
    usuarios: []
  });

  useEffect(() => {
    console.log('🚀 Componente montado, iniciando carga...');
    cargarDatosSimple();
  }, []);

  const cargarDatosSimple = async () => {
    console.log('📊 Iniciando carga de datos...');
    setLoading(true);
    setMensaje('Iniciando carga...');

    try {
      // Test 1: Cargar planes
      console.log('1️⃣ Cargando planes...');
      setMensaje('Cargando planes...');
      
      const { data: planes, error: errorPlanes } = await supabase
        .from('planes_suscripcion')
        .select('*');
      
      if (errorPlanes) {
        console.error('❌ Error planes:', errorPlanes);
        setMensaje(`Error en planes: ${errorPlanes.message}`);
        setLoading(false);
        return;
      }
      
      console.log('✅ Planes cargados:', planes?.length || 0);
      setMensaje(`✅ Planes: ${planes?.length || 0}`);

      // Test 2: Cargar tipos
      console.log('2️⃣ Cargando tipos ecosistema...');
      setMensaje('Cargando tipos ecosistema...');
      
      const { data: tipos, error: errorTipos } = await supabase
        .from('tipos_empresa_ecosistema')
        .select('*');
      
      if (errorTipos) {
        console.error('❌ Error tipos:', errorTipos);
        setMensaje(`Error en tipos: ${errorTipos.message}`);
        setLoading(false);
        return;
      }
      
      console.log('✅ Tipos cargados:', tipos?.length || 0);
      setMensaje(`✅ Planes: ${planes?.length || 0}, Tipos: ${tipos?.length || 0}`);

      // Test 3: Cargar roles
      console.log('3️⃣ Cargando roles...');
      setMensaje('Cargando roles...');
      
      const { data: roles, error: errorRoles } = await supabase
        .from('roles_empresa')
        .select('*');
      
      if (errorRoles) {
        console.error('❌ Error roles:', errorRoles);
        setMensaje(`Error en roles: ${errorRoles.message}`);
        setLoading(false);
        return;
      }
      
      console.log('✅ Roles cargados:', roles?.length || 0);

      // Test 4: Cargar empresas (tabla simple primero)
      console.log('4️⃣ Cargando empresas...');
      setMensaje('Cargando empresas...');
      
      const { data: empresas, error: errorEmpresas } = await supabase
        .from('empresas')
        .select('*')
        .limit(10);
      
      if (errorEmpresas) {
        console.error('❌ Error empresas:', errorEmpresas);
        setMensaje(`Error en empresas: ${errorEmpresas.message}`);
        setLoading(false);
        return;
      }
      
      console.log('✅ Empresas cargadas:', empresas?.length || 0);

      // Éxito total
      console.log('🎉 ¡Todos los datos cargados exitosamente!');
      setDatos({
        planes: planes || [],
        tipos: tipos || [],
        roles: roles || [],
        empresas: empresas || [],
        usuarios: []
      });
      
      setMensaje(`🎉 ¡Éxito! Planes: ${planes?.length || 0}, Tipos: ${tipos?.length || 0}, Roles: ${roles?.length || 0}, Empresas: ${empresas?.length || 0}`);
      setLoading(false);

    } catch (error) {
      console.error('💥 Error general:', error);
      setMensaje(`💥 Error general: ${error}`);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🏢 Gestión de Empresas - Debug
          </h1>
          
          <div className="flex flex-col items-center justify-center min-h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-lg text-gray-600">{mensaje || 'Cargando...'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          🏢 Gestión de Empresas - Debug
        </h1>
        
        <div className="mb-6 p-4 bg-green-100 rounded-lg">
          <p className="text-green-800 font-medium">{mensaje}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900">📋 Planes</h3>
            <p className="text-2xl font-bold text-blue-600">{datos.planes.length}</p>
            <ul className="text-sm text-blue-700 mt-2">
              {datos.planes.map((plan: any) => (
                <li key={plan.id}>• {plan.nombre}</li>
              ))}
            </ul>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-900">🏭 Tipos</h3>
            <p className="text-2xl font-bold text-green-600">{datos.tipos.length}</p>
            <ul className="text-sm text-green-700 mt-2">
              {datos.tipos.map((tipo: any) => (
                <li key={tipo.id}>• {tipo.nombre}</li>
              ))}
            </ul>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-900">👤 Roles</h3>
            <p className="text-2xl font-bold text-purple-600">{datos.roles.length}</p>
            <ul className="text-sm text-purple-700 mt-2">
              {datos.roles.slice(0, 3).map((rol: any) => (
                <li key={rol.id}>• {rol.nombre}</li>
              ))}
              {datos.roles.length > 3 && <li>• ...</li>}
            </ul>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="font-semibold text-orange-900">🏢 Empresas</h3>
            <p className="text-2xl font-bold text-orange-600">{datos.empresas.length}</p>
            <ul className="text-sm text-orange-700 mt-2">
              {datos.empresas.slice(0, 3).map((empresa: any) => (
                <li key={empresa.id}>• {empresa.nombre}</li>
              ))}
              {datos.empresas.length > 3 && <li>• ...</li>}
            </ul>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={cargarDatosSimple}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            🔄 Recargar Datos
          </button>
        </div>

        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">📊 Datos Detallados</h2>
          <div className="bg-gray-100 p-4 rounded-lg">
            <pre className="text-sm overflow-auto">
              {JSON.stringify({
                planes: datos.planes.length,
                tipos: datos.tipos.length,
                roles: datos.roles.length,
                empresas: datos.empresas.length
              }, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}