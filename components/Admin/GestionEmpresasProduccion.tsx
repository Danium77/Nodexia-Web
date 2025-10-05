import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface Plan {
  id: string;
  nombre: string;
  descripcion: string;
  precio_mensual: number;
  caracteristicas: any;
}

interface TipoEcosistema {
  id: string;
  nombre: string;
  descripcion: string;
  permisos_base: any;
}

interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
  tipo_ecosistema_id: string;
  permisos: any;
}

interface FormEmpresa {
  nombre: string;
  cuit: string;
  email: string;
  telefono: string;
  direccion: string;
  plan_id: string;
  tipo_ecosistema_id: string;
}

interface FormUsuario {
  email: string;
  nombre_completo: string;
  email_interno: string;
  departamento: string;
  rol_id: string;
}

export default function GestionEmpresasProduccion() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [tiposEcosistema, setTiposEcosistema] = useState<TipoEcosistema[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  
  const [formEmpresa, setFormEmpresa] = useState<FormEmpresa>({
    nombre: '',
    cuit: '',
    email: '',
    telefono: '',
    direccion: '',
    plan_id: '',
    tipo_ecosistema_id: ''
  });
  
  const [formUsuario, setFormUsuario] = useState<FormUsuario>({
    email: '',
    nombre_completo: '',
    email_interno: '',
    departamento: '',
    rol_id: ''
  });
  
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [mostrarFormEmpresa, setMostrarFormEmpresa] = useState(false);
  const [mostrarFormUsuario, setMostrarFormUsuario] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    setMensaje('Cargando datos...');
    
    try {
      console.log('Iniciando carga de datos...');
      
      // Cargar planes
      console.log('Cargando planes...');
      const { data: planesData, error: planesError } = await supabase
        .from('planes_suscripcion')
        .select('*')
        .eq('activo', true);
      
      if (planesError) {
        console.error('Error cargando planes:', planesError);
        setMensaje(`Error cargando planes: ${planesError.message}`);
        setLoading(false);
        return;
      }
      
      console.log('Planes cargados:', planesData?.length || 0);
      
      // Cargar tipos de ecosistema
      console.log('Cargando tipos de ecosistema...');
      const { data: tiposData, error: tiposError } = await supabase
        .from('tipos_empresa_ecosistema')
        .select('*')
        .eq('activo', true);
      
      if (tiposError) {
        console.error('Error cargando tipos:', tiposError);
        setMensaje(`Error cargando tipos de ecosistema: ${tiposError.message}`);
        setLoading(false);
        return;
      }
      
      console.log('Tipos cargados:', tiposData?.length || 0);
      
      // Cargar roles
      console.log('Cargando roles...');
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles_empresa')
        .select('*, tipos_empresa_ecosistema(nombre)')
        .eq('activo', true);
      
      if (rolesError) {
        console.error('Error cargando roles:', rolesError);
        setMensaje(`Error cargando roles: ${rolesError.message}`);
        setLoading(false);
        return;
      }
      
      console.log('Roles cargados:', rolesData?.length || 0);
      
      // Cargar empresas con información completa
      console.log('Cargando empresas...');
      const { data: empresasData, error: empresasError } = await supabase
        .from('view_empresas_completa')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (empresasError) {
        console.error('Error cargando empresas:', empresasError);
        setMensaje(`Error cargando empresas: ${empresasError.message}`);
        setLoading(false);
        return;
      }
      
      console.log('Empresas cargadas:', empresasData?.length || 0);
      
      // Cargar usuarios de empresas
      console.log('Cargando usuarios...');
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('usuarios_empresa')
        .select(`
          *,
          empresas(nombre),
          roles_empresa(nombre, descripcion)
        `)
        .eq('activo', true);

      if (usuariosError) {
        console.error('Error cargando usuarios:', usuariosError);
        setMensaje(`Error cargando usuarios: ${usuariosError.message}`);
        setLoading(false);
        return;
      }
      
      console.log('Usuarios cargados:', usuariosData?.length || 0);

      setPlanes(planesData || []);
      setTiposEcosistema(tiposData || []);
      setRoles(rolesData || []);
      setEmpresas(empresasData || []);
      setUsuarios(usuariosData || []);
      
      setMensaje(`✅ Datos cargados exitosamente: ${planesData?.length || 0} planes, ${tiposData?.length || 0} tipos, ${rolesData?.length || 0} roles, ${empresasData?.length || 0} empresas, ${usuariosData?.length || 0} usuarios`);
      
    } catch (error) {
      console.error('Error general cargando datos:', error);
      setMensaje(`Error: ${error}. Verifica la consola del navegador para más detalles.`);
    }
    setLoading(false);
  };

  const crearEmpresa = async () => {
    if (!formEmpresa.nombre || !formEmpresa.cuit || !formEmpresa.email) {
      setMensaje('Completa los campos obligatorios');
      return;
    }

    setLoading(true);
    try {
      const tipoSeleccionado = tiposEcosistema.find(t => t.id === formEmpresa.tipo_ecosistema_id);
      const planSeleccionado = planes.find(p => p.id === formEmpresa.plan_id);
      
      const { data, error } = await supabase.rpc('crear_empresa_completa', {
        p_nombre: formEmpresa.nombre,
        p_cuit: formEmpresa.cuit,
        p_email: formEmpresa.email,
        p_telefono: formEmpresa.telefono || null,
        p_direccion: formEmpresa.direccion || null,
        p_plan_nombre: planSeleccionado?.nombre || 'Básico',
        p_tipo_ecosistema: tipoSeleccionado?.nombre || 'Cliente'
      });

      if (error) {
        setMensaje(`Error: ${error.message}`);
      } else {
        setMensaje(`✅ Empresa creada exitosamente con ID: ${data}`);
        setFormEmpresa({
          nombre: '', cuit: '', email: '', telefono: '', direccion: '',
          plan_id: '', tipo_ecosistema_id: ''
        });
        setMostrarFormEmpresa(false);
        cargarDatos();
      }
    } catch (error) {
      setMensaje(`Error creando empresa: ${error}`);
    }
    setLoading(false);
  };

  const asignarUsuario = async () => {
    if (!empresaSeleccionada || !formUsuario.email || !formUsuario.nombre_completo || !formUsuario.rol_id) {
      setMensaje('Completa todos los campos obligatorios');
      return;
    }

    setLoading(true);
    try {
      // Primero crear el usuario en auth si no existe
      const { data: userData, error: authError } = await supabase.auth.admin.createUser({
        email: formUsuario.email,
        password: 'TempPass123!', // Password temporal
        email_confirm: true
      });

      let userId = userData?.user?.id;
      
      if (authError && authError.message.includes('already registered')) {
        // Si el usuario ya existe, obtener su ID
        const { data: existingUser } = await supabase.auth.admin.listUsers();
        const user = existingUser.users.find(u => u.email === formUsuario.email);
        userId = user?.id;
      }

      if (!userId) {
        setMensaje('Error obteniendo ID de usuario');
        setLoading(false);
        return;
      }

      const rolSeleccionado = roles.find(r => r.id === formUsuario.rol_id);
      
      const { data, error } = await supabase.rpc('asignar_usuario_empresa', {
        p_user_id: userId,
        p_empresa_id: empresaSeleccionada,
        p_rol_nombre: rolSeleccionado?.nombre,
        p_nombre_completo: formUsuario.nombre_completo,
        p_email_interno: formUsuario.email_interno || formUsuario.email,
        p_departamento: formUsuario.departamento || 'General'
      });

      if (error) {
        setMensaje(`Error: ${error.message}`);
      } else {
        setMensaje(`✅ Usuario asignado exitosamente a la empresa`);
        setFormUsuario({
          email: '', nombre_completo: '', email_interno: '', departamento: '', rol_id: ''
        });
        setMostrarFormUsuario(false);
        cargarDatos();
      }
    } catch (error) {
      setMensaje(`Error asignando usuario: ${error}`);
    }
    setLoading(false);
  };

  const rolesParaTipo = roles.filter(r => {
    const empresa = empresas.find(e => e.id === empresaSeleccionada);
    return empresa && r.tipo_ecosistema_id === empresa.tipo_ecosistema_id;
  });

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Encabezado con gradiente */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl shadow-lg p-8">
        <div className="flex items-center">
          <div className="bg-white/20 p-4 rounded-lg mr-6">
            <span className="text-4xl">🏢</span>
          </div>
          <div>
            <h1 className="text-4xl font-bold mb-2">Gestión de Empresas - Producción</h1>
            <p className="text-blue-100 text-lg">Sistema multi-tenant con base de datos real</p>
          </div>
        </div>
      </div>
      
      {/* Mensaje de estado */}
      {mensaje && (
        <div className={`p-4 rounded-lg shadow-md border-l-4 ${
          mensaje.includes('Error') ? 'bg-red-50 border-red-500 text-red-800' : 
          mensaje.includes('✅') ? 'bg-green-50 border-green-500 text-green-800' : 
          'bg-blue-50 border-blue-500 text-blue-800'
        }`}>
          <div className="flex items-center">
            <span className="text-xl mr-3">
              {mensaje.includes('Error') ? '❌' : mensaje.includes('✅') ? '✅' : 'ℹ️'}
            </span>
            <span className="font-medium">{mensaje}</span>
          </div>
        </div>
      )}

      {/* Tarjetas de estadísticas mejoradas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">📋 Planes Disponibles</h3>
              <p className="text-3xl font-bold">{planes.length}</p>
              <p className="text-blue-100 text-sm mt-1">Configuraciones activas</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <span className="text-2xl">📋</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">🏢 Empresas Activas</h3>
              <p className="text-3xl font-bold">{empresas.length}</p>
              <p className="text-green-100 text-sm mt-1">En el ecosistema</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <span className="text-2xl">🏢</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">👥 Usuarios Asignados</h3>
              <p className="text-3xl font-bold">{usuarios.length}</p>
              <p className="text-purple-100 text-sm mt-1">Con roles específicos</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </div>
      </div>

      {/* Botones de acción mejorados */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setMostrarFormEmpresa(!mostrarFormEmpresa)}
            className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all shadow-md font-medium"
          >
            <span className="mr-2">➕</span>
            Nueva Empresa
          </button>
          <button
            onClick={() => setMostrarFormUsuario(!mostrarFormUsuario)}
            className="flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transform hover:scale-105 transition-all shadow-md font-medium"
          >
            <span className="mr-2">👤</span>
            Asignar Usuario
          </button>
          <button
            onClick={cargarDatos}
            disabled={loading}
            className="flex items-center px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all shadow-md font-medium"
          >
            <span className="mr-2">♻️</span>
            {loading ? 'Cargando...' : 'Recargar'}
          </button>
        </div>
      </div>
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            ➕ Nueva Empresa
          </button>
          <button
            onClick={() => setMostrarFormUsuario(!mostrarFormUsuario)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            👤 Asignar Usuario
          </button>
          <button
            onClick={cargarDatos}
            disabled={loading}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          >
            ♻️ Recargar
          </button>
        </div>

      {/* Formulario Nueva Empresa */}
      {mostrarFormEmpresa && (
        <div className="bg-white rounded-xl shadow-lg border border-blue-200">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-xl">
            <h2 className="text-2xl font-bold flex items-center">
              <span className="mr-3">➕</span>
              Crear Nueva Empresa
            </h2>
            <p className="text-blue-100 mt-1">Completa los datos para registrar una nueva empresa en el ecosistema</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nombre de la Empresa *</label>
                <input
                  type="text"
                  value={formEmpresa.nombre}
                  onChange={(e) => setFormEmpresa({...formEmpresa, nombre: e.target.value})}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="Ej: Transportes LogiCorp SA"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">CUIT *</label>
                <input
                  type="text"
                  value={formEmpresa.cuit}
                  onChange={(e) => setFormEmpresa({...formEmpresa, cuit: e.target.value})}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="20-12345678-9"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email Corporativo *</label>
                <input
                  type="email"
                  value={formEmpresa.email}
                  onChange={(e) => setFormEmpresa({...formEmpresa, email: e.target.value})}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="contacto@empresa.com"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Teléfono</label>
                <input
                  type="text"
                  value={formEmpresa.telefono}
                  onChange={(e) => setFormEmpresa({...formEmpresa, telefono: e.target.value})}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="+54 11 1234-5678"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Dirección</label>
                <input
                  type="text"
                  value={formEmpresa.direccion}
                  onChange={(e) => setFormEmpresa({...formEmpresa, direccion: e.target.value})}
                  className="w-full p-2 border rounded"
                  placeholder="Dirección completa"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Plan de Suscripción</label>
                <select
                  value={formEmpresa.plan_id}
                  onChange={(e) => setFormEmpresa({...formEmpresa, plan_id: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Seleccionar plan</option>
                  {planes.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.nombre} - ${plan.precio_mensual}/mes
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo en Ecosistema</label>
                <select
                  value={formEmpresa.tipo_ecosistema_id}
                  onChange={(e) => setFormEmpresa({...formEmpresa, tipo_ecosistema_id: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Seleccionar tipo</option>
                  {tiposEcosistema.map(tipo => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nombre} - {tipo.descripcion}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={crearEmpresa}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Creando...' : 'Crear Empresa'}
              </button>
              <button
                onClick={() => setMostrarFormEmpresa(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Formulario Asignar Usuario */}
        {mostrarFormUsuario && (
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <h2 className="text-xl font-semibold mb-4">👤 Asignar Usuario a Empresa</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Empresa *</label>
                <select
                  value={empresaSeleccionada}
                  onChange={(e) => setEmpresaSeleccionada(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Seleccionar empresa</option>
                  {empresas.map(empresa => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nombre} ({empresa.tipo_ecosistema})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email del Usuario *</label>
                <input
                  type="email"
                  value={formUsuario.email}
                  onChange={(e) => setFormUsuario({...formUsuario, email: e.target.value})}
                  className="w-full p-2 border rounded"
                  placeholder="usuario@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={formUsuario.nombre_completo}
                  onChange={(e) => setFormUsuario({...formUsuario, nombre_completo: e.target.value})}
                  className="w-full p-2 border rounded"
                  placeholder="Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email Interno</label>
                <input
                  type="email"
                  value={formUsuario.email_interno}
                  onChange={(e) => setFormUsuario({...formUsuario, email_interno: e.target.value})}
                  className="w-full p-2 border rounded"
                  placeholder="juan.perez@empresa.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Departamento</label>
                <input
                  type="text"
                  value={formUsuario.departamento}
                  onChange={(e) => setFormUsuario({...formUsuario, departamento: e.target.value})}
                  className="w-full p-2 border rounded"
                  placeholder="Logística"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Rol en la Empresa *</label>
                <select
                  value={formUsuario.rol_id}
                  onChange={(e) => setFormUsuario({...formUsuario, rol_id: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Seleccionar rol</option>
                  {rolesParaTipo.map(rol => (
                    <option key={rol.id} value={rol.id}>
                      {rol.nombre} - {rol.descripcion}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={asignarUsuario}
                disabled={loading}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? 'Asignando...' : 'Asignar Usuario'}
              </button>
              <button
                onClick={() => setMostrarFormUsuario(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista de Empresas */}
        <div className="bg-white rounded-lg border">
          <h2 className="text-xl font-semibold p-4 border-b">🏢 Empresas Registradas</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Empresa</th>
                  <th className="px-4 py-2 text-left">Tipo</th>
                  <th className="px-4 py-2 text-left">Plan</th>
                  <th className="px-4 py-2 text-left">CUIT</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                </tr>
              </thead>
              <tbody>
                {empresas.map(empresa => (
                  <tr key={empresa.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{empresa.nombre}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        empresa.tipo_ecosistema === 'Planta' ? 'bg-blue-100 text-blue-800' :
                        empresa.tipo_ecosistema === 'Transporte' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {empresa.tipo_ecosistema}
                      </span>
                    </td>
                    <td className="px-4 py-2">{empresa.plan_nombre}</td>
                    <td className="px-4 py-2">{empresa.cuit}</td>
                    <td className="px-4 py-2">{empresa.email}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        empresa.estado_suscripcion === 'activa' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {empresa.estado_suscripcion}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lista de Usuarios */}
        <div className="bg-white rounded-lg border">
          <h2 className="text-xl font-semibold p-4 border-b">👥 Usuarios Asignados</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Usuario</th>
                  <th className="px-4 py-2 text-left">Empresa</th>
                  <th className="px-4 py-2 text-left">Rol</th>
                  <th className="px-4 py-2 text-left">Departamento</th>
                  <th className="px-4 py-2 text-left">Email Interno</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(usuario => (
                  <tr key={`${usuario.user_id}-${usuario.empresa_id}`} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{usuario.nombre_completo}</td>
                    <td className="px-4 py-2">{usuario.empresas?.nombre}</td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {usuario.roles_empresa?.nombre}
                      </span>
                    </td>
                    <td className="px-4 py-2">{usuario.departamento}</td>
                    <td className="px-4 py-2">{usuario.email_interno}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}