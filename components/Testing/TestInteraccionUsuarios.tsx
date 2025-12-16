import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface EmpresaInfo {
  id: string;
  nombre: string;
  tipo_empresa: string;
  cuit: string;
  email: string;
  activa: boolean;
}

interface UsuarioEmpresa {
  id: string;
  nombre_completo: string;
  email_interno: string;
  rol_interno: string;
  departamento: string;
  activo: boolean;
  empresa: {
    nombre: string;
    tipo_empresa: string;
  };
}

interface DespachoRed {
  id: string;
  origen: string;
  destino: string;
  fecha_despacho: string;
  estado: string;
  empresa_cliente: string;
  empresa_transporte: string;
  puede_editar: boolean;
}

interface ContextoUsuario {
  user_id: string;
  email: string;
  empresa_id: string;
  empresa_nombre: string;
  empresa_tipo: string;
  rol_interno: string;
  permisos: Record<string, boolean>;
}

export default function TestInteraccionUsuarios() {
  const [empresas, setEmpresas] = useState<EmpresaInfo[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioEmpresa[]>([]);
  const [despachos, setDespachos] = useState<DespachoRed[]>([]);
  const [contextoActual, setContextoActual] = useState<ContextoUsuario | null>(null);
  const [emailSeleccionado, setEmailSeleccionado] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setMensaje('Verificando estructura de base de datos...');
      
      // Primero verificar si las funciones RPC existen
      const { data: funcionesData, error: funcionesError } = await supabase
        .rpc('configurar_estructura_empresas');
      
      if (funcionesError) {
        if (funcionesError.message.includes('function') && funcionesError.message.includes('does not exist')) {
          setMensaje(`Las funciones RPC no existen. Por favor ejecuta el script sql/funciones_configuracion.sql en Supabase SQL Editor primero.`);
          return;
        }
      } else {
        setMensaje(`Estructura verificada: ${funcionesData}`);
      }

      // Intentar cargar empresas con un query más simple primero
      const { data: empresasData, error: empresasError } = await supabase
        .from('empresas')
        .select('id, nombre, tipo_empresa, cuit, email, activa');
      
      if (empresasError) {
        console.error('Error específico empresas:', empresasError);
        if (empresasError.code === 'PGRST116') {
          setMensaje(`Tabla 'empresas' no existe. Ejecuta: SELECT configurar_estructura_empresas(); en Supabase SQL Editor.`);
        } else {
          setMensaje(`Error cargando empresas: ${empresasError.message}. Código: ${empresasError.code}`);
        }
        return;
      }
      
      setEmpresas(empresasData || []);

      // Intentar cargar usuarios con un query más específico
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('usuarios_empresa')
        .select(`
          id,
          user_id,
          empresa_id,
          rol_interno,
          nombre_completo,
          email_interno,
          departamento,
          activo,
          empresas!inner(
            id,
            nombre,
            tipo_empresa
          )
        `)
        .eq('activo', true);
      
      if (usuariosError) {
        console.error('Error específico usuarios:', usuariosError);
        if (usuariosError.code === 'PGRST116') {
          setMensaje(`Tabla 'usuarios_empresa' no existe. Ejecuta: SELECT configurar_estructura_empresas(); en Supabase SQL Editor.`);
        } else if (usuariosError.message.includes('relationship')) {
          setMensaje(`Error de relación entre tablas: ${usuariosError.message}. 
            Posibles causas:
            1. Las tablas se crearon pero las relaciones foreign key faltan
            2. RLS (Row Level Security) está bloqueando el acceso
            3. El schema cache de Supabase necesita refrescarse
            
            Solución: Ve a Supabase → Settings → Database → Connection pooling → Reset connection`);
        } else {
          setMensaje(`Error cargando usuarios: ${usuariosError.message}. Código: ${usuariosError.code}`);
        }
        return;
      }
      
      // Transformar datos para compatibilidad
      const usuariosTransformados = usuariosData?.map(usuario => ({
        ...usuario,
        empresa: {
          nombre: Array.isArray(usuario.empresas) && usuario.empresas[0] ? usuario.empresas[0].nombre : 'Sin empresa',
          tipo_empresa: Array.isArray(usuario.empresas) && usuario.empresas[0] ? usuario.empresas[0].tipo_empresa : 'unknown'
        }
      })) || [];
      
      setUsuarios(usuariosTransformados);
      
      if (empresasData.length === 0) {
        setMensaje('Tablas creadas pero sin datos. Ejecuta: SELECT vincular_usuarios_demo(); en Supabase SQL Editor.');
      } else {
        setMensaje(`✅ Sistema cargado: ${empresasData.length} empresas, ${usuariosTransformados.length} usuarios`);
      }

    } catch (error: any) {
      console.error('Error cargando datos:', error);
      setMensaje(`Error inesperado: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const simularContextoUsuario = async (email: string) => {
    try {
      setLoading(true);
      setMensaje('');

      // Llamar función RPC para simular contexto
      const { data, error } = await supabase
        .rpc('simular_contexto_usuario', { p_email: email });

      if (error) throw error;

      if (data && data.length > 0) {
        setContextoActual(data[0]);
        setMensaje(`Contexto cargado para ${email}`);
        
        // Cargar despachos para este usuario
        await cargarDespachosUsuario(data[0].user_id);
      } else {
        setMensaje(`Usuario ${email} no encontrado o no vinculado a empresa`);
        setContextoActual(null);
        setDespachos([]);
      }
    } catch (error: any) {
      console.error('Error simulando contexto:', error);
      setMensaje(`Error: ${error.message}`);
      setContextoActual(null);
    } finally {
      setLoading(false);
    }
  };

  const cargarDespachosUsuario = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('obtener_despachos_usuario', { p_user_id: userId });

      if (error) throw error;
      setDespachos(data || []);
    } catch (error: any) {
      console.error('Error cargando despachos:', error);
      setMensaje(`Error cargando despachos: ${error.message}`);
    }
  };

  const crearDespachoDemo = async () => {
    if (!contextoActual) {
      setMensaje('Debe seleccionar un usuario primero');
      return;
    }

    try {
      setLoading(true);
      
      // Obtener empresas para el despacho
      const empresaCoordinadora = empresas.find(e => e.tipo_empresa === 'coordinador');
      const empresaTransporte = empresas.find(e => e.tipo_empresa === 'transporte');

      if (!empresaCoordinadora || !empresaTransporte) {
        setMensaje('No se encontraron empresas coordinadora y de transporte');
        return;
      }

      const { error } = await supabase
        .from('despachos_red')
        .insert({
          empresa_cliente_id: empresaCoordinadora.id,
          empresa_transporte_id: empresaTransporte.id,
          origen: 'Puerto Madero, CABA',
          destino: 'Córdoba Capital',
          fecha_despacho: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          estado: 'planificado',
          observaciones: `Despacho creado por ${contextoActual.email} desde interfaz de prueba`,
          creado_por: contextoActual.user_id
        });

      if (error) throw error;

      setMensaje('Despacho demo creado exitosamente');
      await cargarDespachosUsuario(contextoActual.user_id);
    } catch (error: any) {
      console.error('Error creando despacho:', error);
      setMensaje(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const ejecutarConfiguracionInicial = async () => {
    try {
      setLoading(true);
      setMensaje('🔧 Ejecutando configuración inicial...');

      // Paso 1: Configurar estructura
      const { data: resultadoEstructura, error: errorEstructura } = await supabase
        .rpc('configurar_estructura_empresas');

      if (errorEstructura) {
        console.error('Error en configurar_estructura_empresas:', errorEstructura);
        setMensaje(`❌ Error: ${errorEstructura.message}. 
          
          Verifica que ejecutaste el script sql/funciones_configuracion.sql en Supabase SQL Editor.
          
          Si ya lo ejecutaste, prueba esto en SQL Editor:
          SELECT configurar_estructura_empresas();`);
        return;
      }

      setMensaje(`✅ Estructura: ${resultadoEstructura}. Vinculando usuarios...`);

      // Paso 2: Vincular usuarios
      const { data: resultadoUsuarios, error: errorUsuarios } = await supabase
        .rpc('vincular_usuarios_demo');

      if (errorUsuarios) {
        console.error('Error en vincular_usuarios_demo:', errorUsuarios);
        setMensaje(`⚠️ Estructura creada pero error vinculando usuarios: ${errorUsuarios.message}.
          
          Esto puede ser normal si los usuarios admin.demo@nodexia.com y transporte.demo@nodexia.com no existen.`);
      } else {
        setMensaje(`✅ Configuración completa: ${resultadoEstructura} ${resultadoUsuarios}`);
      }

      // Paso 3: Verificar con una consulta simple
      const { data: verificacion, error: errorVerificacion } = await supabase
        .from('empresas')
        .select('count', { count: 'exact' });

      if (!errorVerificacion) {
        setMensaje(prev => prev + ` ✅ Verificación: ${verificacion?.length || 0} empresas accesibles.`);
      }

      // Recargar datos
      setTimeout(() => {
        cargarDatos();
      }, 1000);

    } catch (error: any) {
      console.error('Error en configuración inicial:', error);
      setMensaje(`❌ Error inesperado: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const usuariosEmails = [
    'admin.demo@nodexia.com',
    'transporte.demo@nodexia.com',
    'coordinador.demo@nodexia.com',
    'chofer.demo@nodexia.com'
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test de Interacción Entre Usuarios y Empresas</h1>
      
      {mensaje && (
        <div className={`p-4 mb-4 rounded ${
          mensaje.includes('Error') ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-green-100 text-green-700 border border-green-300'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {mensaje.includes('Error') ? (
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm whitespace-pre-line">{mensaje}</p>
              {mensaje.includes('funciones_configuracion.sql') && (
                <div className="mt-2 text-sm">
                  <strong>Pasos para solucionar:</strong>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>Ve a Supabase Dashboard → SQL Editor</li>
                    <li>Ejecuta el archivo <code>sql/funciones_configuracion.sql</code></li>
                    <li>Luego haz clic en "Configurar BD" nuevamente</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Panel de Control */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Panel de Control</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Seleccionar usuario:
            </label>
            <select
              value={emailSeleccionado}
              onChange={(e) => setEmailSeleccionado(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Seleccione un usuario...</option>
              {usuariosEmails.map(email => (
                <option key={email} value={email}>{email}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => simularContextoUsuario(emailSeleccionado)}
              disabled={!emailSeleccionado || loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
            >
              {loading ? 'Cargando...' : 'Simular Login'}
            </button>
            
            <button
              onClick={crearDespachoDemo}
              disabled={!contextoActual || loading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 text-sm"
            >
              Crear Despacho Demo
            </button>
            
            <button
              onClick={ejecutarConfiguracionInicial}
              disabled={loading}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 text-sm"
            >
              🔧 Configurar BD
            </button>
            
            <button
              onClick={cargarDatos}
              disabled={loading}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 text-sm"
            >
              ♻️ Recargar
            </button>
          </div>

          {/* Panel de Diagnóstico Rápido */}
          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">🩺 Diagnóstico Rápido</h3>
            <div className="text-xs text-blue-700 space-y-1">
              <div>📊 Empresas cargadas: {empresas.length}</div>
              <div>👥 Usuarios vinculados: {usuarios.length}</div>
              <div>📋 Estado: {loading ? 'Cargando...' : 'Listo'}</div>
            </div>
            {empresas.length === 0 && !loading && (
              <div className="mt-2 text-xs text-orange-600">
                ⚠️ No hay empresas. Haz clic en "🔧 Configurar BD"
              </div>
            )}
          </div>

          {contextoActual && (
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <h3 className="font-semibold mb-2">Contexto Actual:</h3>
              <p><strong>Email:</strong> {contextoActual.email}</p>
              <p><strong>Empresa:</strong> {contextoActual.empresa_nombre}</p>
              <p><strong>Tipo:</strong> {contextoActual.empresa_tipo}</p>
              <p><strong>Rol:</strong> {contextoActual.rol_interno}</p>
              
              <div className="mt-2">
                <strong>Permisos:</strong>
                <ul className="text-sm mt-1">
                  {Object.entries(contextoActual.permisos).map(([permiso, tiene]) => (
                    <li key={permiso} className={tiene ? 'text-green-600' : 'text-red-600'}>
                      {permiso}: {tiene ? '✓' : '✗'}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Información de Empresas */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Empresas Configuradas</h2>
          
          <div className="space-y-4">
            {empresas.map(empresa => (
              <div key={empresa.id} className="p-3 border rounded">
                <h3 className="font-semibold">{empresa.nombre}</h3>
                <p className="text-sm text-gray-600">Tipo: {empresa.tipo_empresa}</p>
                <p className="text-sm text-gray-600">CUIT: {empresa.cuit}</p>
                <p className="text-sm text-gray-600">Email: {empresa.email}</p>
                <p className={`text-sm ${empresa.activa ? 'text-green-600' : 'text-red-600'}`}>
                  Estado: {empresa.activa ? 'Activa' : 'Inactiva'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Usuarios por Empresa */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Usuarios por Empresa</h2>
          
          <div className="space-y-4">
            {usuarios.map(usuario => (
              <div key={usuario.id} className="p-3 border rounded">
                <h3 className="font-semibold">{usuario.nombre_completo}</h3>
                <p className="text-sm text-gray-600">Email: {usuario.email_interno}</p>
                <p className="text-sm text-gray-600">Rol: {usuario.rol_interno}</p>
                <p className="text-sm text-gray-600">Empresa: {usuario.empresa.nombre} ({usuario.empresa.tipo_empresa})</p>
                <p className="text-sm text-gray-600">Departamento: {usuario.departamento}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Despachos Visibles */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            Despachos Visibles {contextoActual && `(${contextoActual.email})`}
          </h2>
          
          {despachos.length === 0 ? (
            <p className="text-gray-500">No hay despachos visibles para este usuario</p>
          ) : (
            <div className="space-y-4">
              {despachos.map(despacho => (
                <div key={despacho.id} className="p-3 border rounded">
                  <h3 className="font-semibold">{despacho.origen} → {despacho.destino}</h3>
                  <p className="text-sm text-gray-600">Fecha: {despacho.fecha_despacho}</p>
                  <p className="text-sm text-gray-600">Estado: {despacho.estado}</p>
                  <p className="text-sm text-gray-600">Cliente: {despacho.empresa_cliente}</p>
                  <p className="text-sm text-gray-600">Transporte: {despacho.empresa_transporte}</p>
                  <p className={`text-sm ${despacho.puede_editar ? 'text-green-600' : 'text-gray-600'}`}>
                    Puede editar: {despacho.puede_editar ? 'Sí' : 'No'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}