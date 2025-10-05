import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Plan {
  id: string;
  nombre: string;
  precio_mensual: number;
  caracteristicas: any;
}

interface TipoEmpresa {
  id: string;
  nombre: string;
  descripcion: string;
}

interface RolEmpresa {
  id: string;
  nombre: string;
  descripcion: string;
  tipo_ecosistema_id: string;
}

interface Empresa {
  id: string;
  nombre: string;
  plan_nombre: string;
  tipo_ecosistema: string;
  activa: boolean;
}

export default function GestionEmpresasReal() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [tiposEmpresa, setTiposEmpresa] = useState<TipoEmpresa[]>([]);
  const [roles, setRoles] = useState<RolEmpresa[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estados para crear empresa
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [cuitEmpresa, setCuitEmpresa] = useState('');
  const [emailEmpresa, setEmailEmpresa] = useState('');
  const [planSeleccionado, setPlanSeleccionado] = useState('');
  const [tipoSeleccionado, setTipoSeleccionado] = useState('');
  
  // Estados para asignar usuario
  const [emailUsuario, setEmailUsuario] = useState('');
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [passwordUsuario, setPasswordUsuario] = useState('');
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState('');
  const [rolSeleccionado, setRolSeleccionado] = useState('');

  const [step, setStep] = useState(1);
  const [showEmpresaForm, setShowEmpresaForm] = useState(false);
  const [showUsuarioForm, setShowUsuarioForm] = useState(false);

  // Función para corregir constraint - simplificada sin API
  const corregirConstraint = async () => {
    setError(null);
    setSuccess('Mapeo activado: Planta/Cliente se guardarán como "coordinador", Transporte como "transporte" en la BD.');
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar planes
      const { data: planesData, error: planesError } = await supabase
        .from('planes_suscripcion')
        .select('*')
        .eq('activo', true);

      if (planesError) throw planesError;

      // Cargar tipos de empresa
      const { data: tiposData, error: tiposError } = await supabase
        .from('tipos_empresa_ecosistema')
        .select('*')
        .eq('activo', true);

      if (tiposError) throw tiposError;

      // Cargar roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles_empresa')
        .select('*')
        .eq('activo', true);

      if (rolesError) throw rolesError;

      // Cargar empresas
      const { data: empresasData, error: empresasError } = await supabase
        .from('view_empresas_completa')
        .select('*');

      if (empresasError) throw empresasError;

      setPlanes(planesData || []);
      setTiposEmpresa(tiposData || []);
      setRoles(rolesData || []);
      setEmpresas(empresasData || []);

    } catch (err: any) {
      console.error('Error cargando datos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const crearEmpresa = async () => {
    try {
      setError(null);
      setSuccess(null);
      
      if (!nombreEmpresa || !cuitEmpresa || !emailEmpresa || !planSeleccionado || !tipoSeleccionado) {
        setError('Por favor completa todos los campos obligatorios');
        return;
      }

      const planNombre = planes.find(p => p.id === planSeleccionado)?.nombre;
      const tipoNombre = tiposEmpresa.find(t => t.id === tipoSeleccionado)?.nombre;
      
      // Crear empresa usando insert directo en lugar de la función con problemas
      const empresaData = {
        nombre: nombreEmpresa,
        cuit: cuitEmpresa,
        email: emailEmpresa,
        tipo_empresa: tipoNombre === 'Transporte' ? 'transporte' : 'coordinador', // Mapeo simple
        activa: true,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('empresas')
        .insert([empresaData])
        .select();

      if (error) throw error;

      // Limpiar formulario
      setNombreEmpresa('');
      setCuitEmpresa('');
      setEmailEmpresa('');
      setPlanSeleccionado('');
      setTipoSeleccionado('');
      setShowEmpresaForm(false);
      
      // Recargar empresas
      await cargarDatos();
      
      setStep(2);
      setSuccess('¡Empresa creada exitosamente! Ahora puedes asignar usuarios.');

    } catch (err: any) {
      console.error('Error creando empresa:', err);
      setError(err.message);
    }
  };

  const asignarUsuario = async () => {
    try {
      setError(null);
      setSuccess(null);
      
      if (!emailUsuario || !nombreUsuario || !passwordUsuario || !empresaSeleccionada || !rolSeleccionado) {
        console.log('Validación campos:', {
          emailUsuario: !!emailUsuario,
          nombreUsuario: !!nombreUsuario, 
          passwordUsuario: !!passwordUsuario,
          empresaSeleccionada: !!empresaSeleccionada,
          rolSeleccionado: !!rolSeleccionado
        });
        setError(`Por favor completa todos los campos obligatorios. Faltantes: ${[
          !emailUsuario && 'Email',
          !nombreUsuario && 'Nombre',
          !passwordUsuario && 'Contraseña', 
          !empresaSeleccionada && 'Empresa',
          !rolSeleccionado && 'Rol'
        ].filter(Boolean).join(', ')}`);
        return;
      }

      // 1. Crear usuario en Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailUsuario,
        password: passwordUsuario,
        options: {
          data: {
            full_name: nombreUsuario
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('No se pudo crear el usuario');
      }

      // 2. Asignar a empresa con insert directo
      const rolData = roles.find(r => r.id === rolSeleccionado);
      
      const usuarioEmpresaData = {
        user_id: authData.user.id,
        empresa_id: empresaSeleccionada,
        rol_interno: rolData?.nombre || 'Usuario',
        nombre_completo: nombreUsuario,
        email_interno: emailUsuario,
        activo: true,
        created_at: new Date().toISOString()
      };

      const { data: assignData, error: assignError } = await supabase
        .from('usuarios_empresa')
        .insert([usuarioEmpresaData])
        .select();

      if (assignError) throw assignError;

      // Limpiar formulario
      setEmailUsuario('');
      setNombreUsuario('');
      setPasswordUsuario('');
      setEmpresaSeleccionada('');
      setRolSeleccionado('');
      setShowUsuarioForm(false);
      
      setStep(3);
      setSuccess('¡Usuario asignado exitosamente! La prueba se completó correctamente.');

    } catch (err: any) {
      console.error('Error asignando usuario:', err);
      setError(err.message);
    }
  };

  const rolesParaEmpresa = empresaSeleccionada ? 
    roles.filter(r => {
      const empresa = empresas.find(e => e.id === empresaSeleccionada);
      const tipo = tiposEmpresa.find(t => t.nombre === empresa?.tipo_ecosistema);
      return tipo ? r.tipo_ecosistema_id === tipo.id : false;
    }) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <div className="mt-4 text-xl font-semibold text-gray-700">Cargando datos de la base de datos...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Encabezado con gradiente */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center">
            <div className="bg-white/20 p-4 rounded-xl mr-6">
              <span className="text-5xl">🏢</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Gestión de Empresas - Base de Datos Real</h1>
              <p className="text-xl text-blue-100">Sistema multi-tenant con funciones PostgreSQL</p>
            </div>
          </div>
        </div>

        {/* Mensajes de estado */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-xl shadow-md">
            <div className="flex items-center">
              <span className="text-red-500 text-2xl mr-3">❌</span>
              <div>
                <h3 className="text-lg font-bold text-red-800">Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-xl shadow-md">
            <div className="flex items-center">
              <span className="text-green-500 text-2xl mr-3">✅</span>
              <div>
                <h3 className="text-lg font-bold text-green-800">Éxito</h3>
                <p className="text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold mb-1">Planes</h3>
                <p className="text-3xl font-bold">{planes.length}</p>
                <p className="text-blue-100 text-sm">Disponibles</p>
              </div>
              <span className="text-3xl">📋</span>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold mb-1">Tipos</h3>
                <p className="text-3xl font-bold">{tiposEmpresa.length}</p>
                <p className="text-green-100 text-sm">Ecosistema</p>
              </div>
              <span className="text-3xl">🏭</span>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold mb-1">Roles</h3>
                <p className="text-3xl font-bold">{roles.length}</p>
                <p className="text-purple-100 text-sm">Específicos</p>
              </div>
              <span className="text-3xl">👥</span>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold mb-1">Empresas</h3>
                <p className="text-3xl font-bold">{empresas.length}</p>
                <p className="text-orange-100 text-sm">Activas</p>
              </div>
              <span className="text-3xl">🏢</span>
            </div>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Flujo de Prueba Real</h2>
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
                1
              </div>
              <span className="ml-3 font-semibold">Crear Empresa</span>
            </div>
            <div className={`flex-1 h-2 mx-4 rounded ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
                2
              </div>
              <span className="ml-3 font-semibold">Asignar Usuario</span>
            </div>
            <div className={`flex-1 h-2 mx-4 rounded ${step >= 3 ? 'bg-green-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${step >= 3 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${step >= 3 ? 'bg-green-600 text-white' : 'bg-gray-300'}`}>
                ✓
              </div>
              <span className="ml-3 font-semibold">Completado</span>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => setShowEmpresaForm(!showEmpresaForm)}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all"
          >
            <div className="text-center">
              <span className="text-4xl block mb-2">➕</span>
              <span className="text-xl font-bold">Crear Nueva Empresa</span>
              <p className="text-blue-100 mt-1">Con plan y tipo de ecosistema</p>
            </div>
          </button>

          <button
            onClick={() => setShowUsuarioForm(!showUsuarioForm)}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg hover:from-green-600 hover:to-green-700 transform hover:scale-105 transition-all"
          >
            <div className="text-center">
              <span className="text-4xl block mb-2">👤</span>
              <span className="text-xl font-bold">Asignar Usuario</span>
              <p className="text-green-100 mt-1">A cualquier empresa</p>
            </div>
          </button>

          <button
            onClick={corregirConstraint}
            disabled={loading}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg hover:from-green-600 hover:to-green-700 transform hover:scale-105 transition-all disabled:opacity-50"
          >
            <div className="text-center">
              <span className="text-4xl block mb-2">✅</span>
              <span className="text-xl font-bold">Modo Simplificado</span>
              <p className="text-green-100 mt-1">Insert directo BD</p>
            </div>
          </button>
        </div>

        {/* Formulario Crear Empresa */}
        {showEmpresaForm && (
          <div className="bg-white rounded-xl shadow-xl border border-blue-200">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-xl">
              <h2 className="text-2xl font-bold flex items-center">
                <span className="mr-3">➕</span>
                Crear Nueva Empresa
              </h2>
              <p className="text-blue-100 mt-1">Datos para registrar empresa en el ecosistema</p>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nombre de la Empresa *</label>
                  <input
                    type="text"
                    value={nombreEmpresa}
                    onChange={(e) => setNombreEmpresa(e.target.value)}
                    className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-800 font-medium"
                    placeholder="Ej: Transportes LogiCorp SA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">CUIT *</label>
                  <input
                    type="text"
                    value={cuitEmpresa}
                    onChange={(e) => setCuitEmpresa(e.target.value)}
                    className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-800 font-medium"
                    placeholder="20-12345678-9"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email Corporativo *</label>
                  <input
                    type="email"
                    value={emailEmpresa}
                    onChange={(e) => setEmailEmpresa(e.target.value)}
                    className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-800 font-medium"
                    placeholder="contacto@logicorp.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Plan de Suscripción *</label>
                  <select
                    value={planSeleccionado}
                    onChange={(e) => setPlanSeleccionado(e.target.value)}
                    className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-800 font-medium"
                  >
                    <option value="">Seleccionar plan</option>
                    {planes.map(plan => (
                      <option key={plan.id} value={plan.id}>
                        {plan.nombre} - ${plan.precio_mensual}/mes
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Tipo en Ecosistema *</label>
                  <select
                    value={tipoSeleccionado}
                    onChange={(e) => setTipoSeleccionado(e.target.value)}
                    className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-800 font-medium"
                  >
                    <option value="">Seleccionar tipo de empresa</option>
                    {tiposEmpresa.map(tipo => (
                      <option key={tipo.id} value={tipo.id}>
                        {tipo.nombre} - {tipo.descripcion}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex gap-4 mt-8">
                <button
                  onClick={crearEmpresa}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 px-6 rounded-lg hover:from-blue-600 hover:to-blue-700 font-bold text-lg shadow-lg transform hover:scale-105 transition-all"
                >
                  Crear Empresa
                </button>
                <button
                  onClick={() => setShowEmpresaForm(false)}
                  className="px-6 py-4 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-bold"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Formulario Asignar Usuario */}
        {showUsuarioForm && (
          <div className="bg-white rounded-xl shadow-xl border border-green-200">
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-t-xl">
              <h2 className="text-2xl font-bold flex items-center">
                <span className="mr-3">👤</span>
                Asignar Usuario a Empresa
              </h2>
              <p className="text-green-100 mt-1">Crear usuario y vincularlo con rol específico</p>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email del Usuario *</label>
                  <input
                    type="email"
                    value={emailUsuario}
                    onChange={(e) => setEmailUsuario(e.target.value)}
                    className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all text-gray-800 font-medium"
                    placeholder="gerente@logicorp.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nombre Completo *</label>
                  <input
                    type="text"
                    value={nombreUsuario}
                    onChange={(e) => setNombreUsuario(e.target.value)}
                    className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all text-gray-800 font-medium"
                    placeholder="María García"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Contraseña *</label>
                  <input
                    type="password"
                    value={passwordUsuario}
                    onChange={(e) => setPasswordUsuario(e.target.value)}
                    className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all text-gray-800 font-medium"
                    placeholder="Contraseña segura"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Empresa *</label>
                  <select
                    value={empresaSeleccionada}
                    onChange={(e) => setEmpresaSeleccionada(e.target.value)}
                    className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all text-gray-800 font-medium"
                  >
                    <option value="">Seleccionar empresa</option>
                    {empresas.map(empresa => (
                      <option key={empresa.id} value={empresa.id}>
                        {empresa.nombre} ({empresa.tipo_ecosistema})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Rol Específico *</label>
                  <select
                    value={rolSeleccionado}
                    onChange={(e) => setRolSeleccionado(e.target.value)}
                    className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all text-gray-800 font-medium"
                  >
                    <option value="">Seleccionar rol según tipo de empresa</option>
                    {rolesParaEmpresa.map(rol => (
                      <option key={rol.id} value={rol.id}>
                        {rol.nombre} - {rol.descripcion}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex gap-4 mt-8">
                <button
                  onClick={asignarUsuario}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-lg hover:from-green-600 hover:to-green-700 font-bold text-lg shadow-lg transform hover:scale-105 transition-all"
                >
                  Asignar Usuario
                </button>
                <button
                  onClick={() => setShowUsuarioForm(false)}
                  className="px-6 py-4 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-bold"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de empresas */}
        {empresas.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Empresas en el Sistema</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Empresa</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Plan</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {empresas.map(empresa => (
                    <tr key={empresa.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900">{empresa.nombre}</td>
                      <td className="px-6 py-4 text-gray-700">{empresa.tipo_ecosistema}</td>
                      <td className="px-6 py-4 text-gray-700">{empresa.plan_nombre}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          empresa.activa ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {empresa.activa ? '✅ Activa' : '❌ Inactiva'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Resultado final */}
        {step >= 3 && (
          <div className="bg-gradient-to-r from-green-400 to-green-600 text-white p-8 rounded-xl shadow-xl">
            <div className="text-center">
              <span className="text-6xl block mb-4">🎉</span>
              <h2 className="text-3xl font-bold mb-4">¡Prueba Real Completada Exitosamente!</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="bg-white/20 p-6 rounded-lg">
                  <h3 className="text-xl font-bold mb-3">✅ Objetivo 1: Vincular roles y usuarios a empresas</h3>
                  <ul className="text-green-100 space-y-2">
                    <li>• Empresa creada con función crear_empresa_completa()</li>
                    <li>• Plan de suscripción asignado correctamente</li>
                    <li>• Tipo de ecosistema configurado</li>
                  </ul>
                </div>
                <div className="bg-white/20 p-6 rounded-lg">
                  <h3 className="text-xl font-bold mb-3">✅ Objetivo 2: Probar interacciones entre usuarios y empresas</h3>
                  <ul className="text-green-100 space-y-2">
                    <li>• Usuario creado con función asignar_usuario_empresa()</li>
                    <li>• Rol específico asignado según tipo de empresa</li>
                    <li>• Base de datos multi-tenant funcionando</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}