// pages/gestion-relaciones.tsx
// Gestión de Relaciones entre Empresas - Red Nodexia
// Permite vincular/desvincular empresas de transporte con empresas cliente

import { useState, useEffect } from 'react';
import { useUserRole } from '../lib/contexts/UserRoleContext';
import { supabase } from '../lib/supabaseClient';
import MainLayout from '../components/layout/MainLayout';
import {
  LinkIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  TruckIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

interface Empresa {
  id: string;
  nombre: string;
  razon_social: string;
  tipo_empresa: 'transporte' | 'cliente' | 'ambas';
  cuit: string;
  direccion?: string;
}

interface Relacion {
  id: string;
  empresa_cliente_id: string;
  empresa_transporte_id: string;
  estado: 'activa' | 'inactiva' | 'pendiente';
  fecha_inicio: string;
  fecha_fin?: string;
  condiciones?: any;
  empresa_cliente: Empresa;
  empresa_transporte: Empresa;
  creado_por?: string;
  fecha_modificacion?: string;
}

type TabType = 'activas' | 'inactivas' | 'pendientes' | 'todas';

export default function GestionRelaciones() {
  const { empresaId, user, rol } = useUserRole();
  
  const [activeTab, setActiveTab] = useState<TabType>('activas');
  const [relaciones, setRelaciones] = useState<Relacion[]>([]);
  const [relacionesFiltradas, setRelacionesFiltradas] = useState<Relacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'crear' | 'editar'>('crear');
  const [selectedRelacion, setSelectedRelacion] = useState<Relacion | null>(null);
  
  // Estados para el modal de crear/editar
  const [empresaClienteId, setEmpresaClienteId] = useState('');
  const [empresaTransporteId, setEmpresaTransporteId] = useState('');
  const [estadoRelacion, setEstadoRelacion] = useState<'activa' | 'inactiva' | 'pendiente'>('activa');
  const [condicionesJson, setCondicionesJson] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    cargarRelaciones();
    cargarEmpresas();
  }, [empresaId]);

  useEffect(() => {
    filtrarRelaciones();
  }, [relaciones, activeTab, searchTerm]);

  const cargarEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nombre, razon_social, tipo_empresa, cuit, direccion')
        .order('nombre');

      if (error) throw error;
      setEmpresas(data || []);
    } catch (error: any) {
      console.error('Error cargando empresas:', error);
    }
  };

  const cargarRelaciones = async () => {
    setLoading(true);
    try {
      console.log('🔄 [gestion-relaciones] Cargando relaciones...');

      const { data, error } = await supabase
        .from('relaciones_empresas')
        .select(`
          *,
          empresa_cliente:empresas!relaciones_empresas_empresa_cliente_id_fkey(
            id,
            nombre,
            razon_social,
            tipo_empresa,
            cuit,
            direccion
          ),
          empresa_transporte:empresas!relaciones_empresas_empresa_transporte_id_fkey(
            id,
            nombre,
            razon_social,
            tipo_empresa,
            cuit,
            direccion
          )
        `)
        .order('fecha_inicio', { ascending: false });

      if (error) {
        console.error('❌ Error cargando relaciones:', error);
        throw error;
      }

      console.log(`✅ [gestion-relaciones] ${data?.length || 0} relaciones cargadas`);
      setRelaciones(data || []);
    } catch (error: any) {
      console.error('Error en cargarRelaciones:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filtrarRelaciones = () => {
    let filtradas = [...relaciones];

    // Filtrar por tab
    if (activeTab !== 'todas') {
      filtradas = filtradas.filter(r => r.estado === activeTab.slice(0, -1) as any); // 'activas' -> 'activa'
    }

    // Filtrar por búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtradas = filtradas.filter(r => 
        r.empresa_cliente.nombre.toLowerCase().includes(term) ||
        r.empresa_cliente.razon_social.toLowerCase().includes(term) ||
        r.empresa_transporte.nombre.toLowerCase().includes(term) ||
        r.empresa_transporte.razon_social.toLowerCase().includes(term) ||
        r.empresa_cliente.cuit.includes(term) ||
        r.empresa_transporte.cuit.includes(term)
      );
    }

    setRelacionesFiltradas(filtradas);
  };

  const abrirModalCrear = () => {
    setModalMode('crear');
    setEmpresaClienteId('');
    setEmpresaTransporteId('');
    setEstadoRelacion('activa');
    setCondicionesJson('');
    setSelectedRelacion(null);
    setMessage('');
    setShowModal(true);
  };

  const abrirModalEditar = (relacion: Relacion) => {
    setModalMode('editar');
    setEmpresaClienteId(relacion.empresa_cliente_id);
    setEmpresaTransporteId(relacion.empresa_transporte_id);
    setEstadoRelacion(relacion.estado);
    setCondicionesJson(relacion.condiciones ? JSON.stringify(relacion.condiciones, null, 2) : '');
    setSelectedRelacion(relacion);
    setMessage('');
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setSelectedRelacion(null);
    setMessage('');
  };

  const validarRelacionDuplicada = async (clienteId: string, transporteId: string, relacionId?: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('relaciones_empresas')
      .select('id, estado')
      .eq('empresa_cliente_id', clienteId)
      .eq('empresa_transporte_id', transporteId)
      .eq('estado', 'activa');

    if (error) {
      console.error('Error validando duplicados:', error);
      return false;
    }

    // Si estamos editando, permitir la misma relación
    if (relacionId && data?.length === 1 && data[0].id === relacionId) {
      return true;
    }

    // Si hay relaciones activas duplicadas, no permitir
    if (data && data.length > 0) {
      setMessage('⚠️ Ya existe una relación activa entre estas empresas');
      return false;
    }

    return true;
  };

  const handleCrearRelacion = async () => {
    if (!empresaClienteId || !empresaTransporteId) {
      setMessage('⚠️ Debe seleccionar ambas empresas');
      return;
    }

    if (empresaClienteId === empresaTransporteId) {
      setMessage('⚠️ Las empresas deben ser diferentes');
      return;
    }

    // Validar que no exista duplicado activo
    const esValida = await validarRelacionDuplicada(empresaClienteId, empresaTransporteId);
    if (!esValida) return;

    setLoading(true);
    try {
      let condiciones = null;
      if (condicionesJson.trim()) {
        try {
          condiciones = JSON.parse(condicionesJson);
        } catch (e) {
          setMessage('⚠️ El JSON de condiciones no es válido');
          setLoading(false);
          return;
        }
      }

      const { data, error } = await supabase
        .from('relaciones_empresas')
        .insert({
          empresa_cliente_id: empresaClienteId,
          empresa_transporte_id: empresaTransporteId,
          estado: estadoRelacion,
          condiciones,
          fecha_inicio: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Relación creada:', data);
      setMessage('✅ Relación creada exitosamente');
      
      // Recargar relaciones
      await cargarRelaciones();
      
      setTimeout(() => {
        cerrarModal();
      }, 1500);
    } catch (error: any) {
      console.error('Error creando relación:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleActualizarRelacion = async () => {
    if (!selectedRelacion) return;

    setLoading(true);
    try {
      let condiciones = null;
      if (condicionesJson.trim()) {
        try {
          condiciones = JSON.parse(condicionesJson);
        } catch (e) {
          setMessage('⚠️ El JSON de condiciones no es válido');
          setLoading(false);
          return;
        }
      }

      const updateData: any = {
        estado: estadoRelacion,
        condiciones,
        fecha_modificacion: new Date().toISOString()
      };

      // Si se desactiva, agregar fecha_fin
      if (estadoRelacion === 'inactiva' && !selectedRelacion.fecha_fin) {
        updateData.fecha_fin = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('relaciones_empresas')
        .update(updateData)
        .eq('id', selectedRelacion.id)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Relación actualizada:', data);
      setMessage('✅ Relación actualizada exitosamente');
      
      // Recargar relaciones
      await cargarRelaciones();
      
      setTimeout(() => {
        cerrarModal();
      }, 1500);
    } catch (error: any) {
      console.error('Error actualizando relación:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCambiarEstado = async (relacion: Relacion, nuevoEstado: 'activa' | 'inactiva') => {
    if (!window.confirm(`¿Confirmar cambio de estado a "${nuevoEstado}"?`)) return;

    setLoading(true);
    try {
      const updateData: any = {
        estado: nuevoEstado,
        fecha_modificacion: new Date().toISOString()
      };

      if (nuevoEstado === 'inactiva') {
        updateData.fecha_fin = new Date().toISOString();
      }

      const { error } = await supabase
        .from('relaciones_empresas')
        .update(updateData)
        .eq('id', relacion.id);

      if (error) throw error;

      console.log(`✅ Estado cambiado a ${nuevoEstado}`);
      setMessage(`✅ Relación ${nuevoEstado === 'activa' ? 'activada' : 'desactivada'} correctamente`);
      
      await cargarRelaciones();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error('Error cambiando estado:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarRelacion = async (relacion: Relacion) => {
    if (!window.confirm(`¿Está seguro de eliminar la relación entre ${relacion.empresa_cliente.nombre} y ${relacion.empresa_transporte.nombre}?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('relaciones_empresas')
        .delete()
        .eq('id', relacion.id);

      if (error) throw error;

      console.log('✅ Relación eliminada');
      setMessage('✅ Relación eliminada correctamente');
      
      await cargarRelaciones();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error('Error eliminando relación:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'activa':
        return 'bg-green-600 text-green-100';
      case 'inactiva':
        return 'bg-gray-600 text-gray-100';
      case 'pendiente':
        return 'bg-yellow-600 text-yellow-100';
      default:
        return 'bg-gray-600 text-gray-100';
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'activa':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'inactiva':
        return <XCircleIcon className="h-4 w-4" />;
      case 'pendiente':
        return <ClockIcon className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const contarPorEstado = (estado: TabType) => {
    if (estado === 'todas') return relaciones.length;
    return relaciones.filter(r => r.estado === estado.slice(0, -1)).length;
  };

  return (
    <MainLayout pageTitle="Gestión de Relaciones">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <LinkIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Gestión de Relaciones</h1>
              <p className="text-slate-300 mt-1">
                Vinculación de empresas de transporte con empresas cliente
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={cargarRelaciones}
              disabled={loading}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button
              onClick={abrirModalCrear}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl transition-colors flex items-center gap-2 font-medium shadow-lg"
            >
              <PlusIcon className="h-5 w-5" />
              Nueva Relación
            </button>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-4 rounded-xl flex items-center space-x-3 ${
          message.includes('✅') ? 'bg-green-900 text-green-100 border border-green-700' :
          message.includes('⚠️') ? 'bg-yellow-900 text-yellow-100 border border-yellow-700' :
          'bg-red-900 text-red-100 border border-red-700'
        }`}>
          {message}
        </div>
      )}

      {/* Barra de búsqueda */}
      <div className="mb-6 bg-slate-800 rounded-xl shadow-sm border border-slate-700 p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por empresa, razón social o CUIT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-600 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none bg-slate-700 text-slate-100 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 bg-slate-800 rounded-xl shadow-sm border border-slate-700 p-2">
        <div className="flex gap-2">
          {(['activas', 'inactivas', 'pendientes', 'todas'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === tab
                  ? 'bg-cyan-600 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className="ml-2 px-2 py-1 rounded-full text-xs bg-slate-900/30">
                {contarPorEstado(tab)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Lista de relaciones */}
      <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700">
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <ArrowPathIcon className="h-8 w-8 text-cyan-600 animate-spin" />
            </div>
          ) : relacionesFiltradas.length === 0 ? (
            <div className="text-center py-12">
              <LinkIcon className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">
                {searchTerm ? 'No se encontraron relaciones' : 'No hay relaciones registradas'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {relacionesFiltradas.map((relacion) => (
                <div
                  key={relacion.id}
                  className="bg-slate-700 rounded-xl p-6 border border-slate-600 hover:border-slate-500 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    {/* Información de la relación */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${getEstadoBadge(relacion.estado)}`}>
                          {getEstadoIcon(relacion.estado)}
                          {relacion.estado.charAt(0).toUpperCase() + relacion.estado.slice(1)}
                        </span>
                        <span className="text-xs text-slate-400">
                          Desde {new Date(relacion.fecha_inicio).toLocaleDateString('es-AR')}
                        </span>
                        {relacion.fecha_fin && (
                          <span className="text-xs text-slate-400">
                            Hasta {new Date(relacion.fecha_fin).toLocaleDateString('es-AR')}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Empresa Cliente */}
                        <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
                          <div className="flex items-center gap-2 mb-2">
                            <BuildingOfficeIcon className="h-5 w-5 text-purple-400" />
                            <span className="text-xs font-semibold text-slate-400 uppercase">Empresa Cliente</span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-100 mb-1">
                            {relacion.empresa_cliente.nombre}
                          </h3>
                          <p className="text-sm text-slate-300 mb-1">
                            {relacion.empresa_cliente.razon_social}
                          </p>
                          <p className="text-xs text-slate-400">
                            CUIT: {relacion.empresa_cliente.cuit}
                          </p>
                        </div>

                        {/* Empresa Transporte */}
                        <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
                          <div className="flex items-center gap-2 mb-2">
                            <TruckIcon className="h-5 w-5 text-cyan-400" />
                            <span className="text-xs font-semibold text-slate-400 uppercase">Empresa Transporte</span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-100 mb-1">
                            {relacion.empresa_transporte.nombre}
                          </h3>
                          <p className="text-sm text-slate-300 mb-1">
                            {relacion.empresa_transporte.razon_social}
                          </p>
                          <p className="text-xs text-slate-400">
                            CUIT: {relacion.empresa_transporte.cuit}
                          </p>
                        </div>
                      </div>

                      {/* Condiciones */}
                      {relacion.condiciones && (
                        <div className="mt-4 bg-slate-800 rounded-lg p-3 border border-slate-600">
                          <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Condiciones</p>
                          <pre className="text-xs text-slate-300 overflow-x-auto">
                            {JSON.stringify(relacion.condiciones, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="ml-6 flex flex-col gap-2">
                      {relacion.estado === 'activa' && (
                        <button
                          onClick={() => handleCambiarEstado(relacion, 'inactiva')}
                          disabled={loading}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
                        >
                          <XCircleIcon className="h-4 w-4" />
                          Desactivar
                        </button>
                      )}
                      
                      {relacion.estado === 'inactiva' && (
                        <button
                          onClick={() => handleCambiarEstado(relacion, 'activa')}
                          disabled={loading}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                          Activar
                        </button>
                      )}
                      
                      <button
                        onClick={() => abrirModalEditar(relacion)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                      >
                        Editar
                      </button>
                      
                      <button
                        onClick={() => handleEliminarRelacion(relacion)}
                        disabled={loading}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
                      >
                        <TrashIcon className="h-4 w-4" />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-2xl font-bold text-slate-100">
                {modalMode === 'crear' ? 'Nueva Relación' : 'Editar Relación'}
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Empresa Cliente */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Empresa Cliente *
                </label>
                <select
                  value={empresaClienteId}
                  onChange={(e) => setEmpresaClienteId(e.target.value)}
                  disabled={modalMode === 'editar'}
                  className="w-full px-4 py-3 border border-slate-600 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none bg-slate-700 text-slate-100 disabled:opacity-50"
                >
                  <option value="">Seleccionar empresa...</option>
                  {empresas
                    .filter(e => e.tipo_empresa === 'cliente' || e.tipo_empresa === 'ambas')
                    .map(empresa => (
                      <option key={empresa.id} value={empresa.id}>
                        {empresa.nombre} - {empresa.razon_social} ({empresa.cuit})
                      </option>
                    ))}
                </select>
              </div>

              {/* Empresa Transporte */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Empresa Transporte *
                </label>
                <select
                  value={empresaTransporteId}
                  onChange={(e) => setEmpresaTransporteId(e.target.value)}
                  disabled={modalMode === 'editar'}
                  className="w-full px-4 py-3 border border-slate-600 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none bg-slate-700 text-slate-100 disabled:opacity-50"
                >
                  <option value="">Seleccionar transporte...</option>
                  {empresas
                    .filter(e => e.tipo_empresa === 'transporte' || e.tipo_empresa === 'ambas')
                    .map(empresa => (
                      <option key={empresa.id} value={empresa.id}>
                        {empresa.nombre} - {empresa.razon_social} ({empresa.cuit})
                      </option>
                    ))}
                </select>
              </div>

              {/* Estado */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Estado *
                </label>
                <select
                  value={estadoRelacion}
                  onChange={(e) => setEstadoRelacion(e.target.value as any)}
                  className="w-full px-4 py-3 border border-slate-600 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none bg-slate-700 text-slate-100"
                >
                  <option value="activa">Activa</option>
                  <option value="inactiva">Inactiva</option>
                  <option value="pendiente">Pendiente</option>
                </select>
              </div>

              {/* Condiciones (JSON) */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Condiciones (JSON - Opcional)
                </label>
                <textarea
                  value={condicionesJson}
                  onChange={(e) => setCondicionesJson(e.target.value)}
                  placeholder='{"tarifa_base": 50000, "descuento": "10%"}'
                  rows={6}
                  className="w-full px-4 py-3 border border-slate-600 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none bg-slate-700 text-slate-100 placeholder-slate-400 font-mono text-sm"
                />
                <p className="text-xs text-slate-400 mt-2">
                  Formato JSON válido. Ejemplo: {`{"tarifa_base": 50000, "notas": "..."}`}
                </p>
              </div>

              {/* Message en modal */}
              {message && (
                <div className={`p-4 rounded-xl ${
                  message.includes('✅') ? 'bg-green-900 text-green-100 border border-green-700' :
                  message.includes('⚠️') ? 'bg-yellow-900 text-yellow-100 border border-yellow-700' :
                  'bg-red-900 text-red-100 border border-red-700'
                }`}>
                  {message}
                </div>
              )}
            </div>

            {/* Botones del modal */}
            <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
              <button
                onClick={cerrarModal}
                disabled={loading}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={modalMode === 'crear' ? handleCrearRelacion : handleActualizarRelacion}
                disabled={loading}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-5 w-5" />
                    {modalMode === 'crear' ? 'Crear Relación' : 'Guardar Cambios'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Información */}
      <div className="mt-6 bg-blue-900/20 border border-blue-700 rounded-xl p-4">
        <h3 className="font-bold text-blue-300 mb-3 flex items-center space-x-2">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <span>ℹ️ Información Importante</span>
        </h3>
        <div className="text-blue-200 text-sm space-y-2">
          <p>• Las relaciones <strong>activas</strong> permiten que empresas de transporte vean viajes de la Red Nodexia publicados por empresas cliente vinculadas.</p>
          <p>• Al <strong>desactivar</strong> una relación, los transportes dejarán de ver viajes de esa empresa cliente en la Red.</p>
          <p>• Solo puede existir <strong>una relación activa</strong> entre el mismo par de empresas.</p>
          <p>• Las políticas RLS de Supabase utilizan estas relaciones para filtrar visibilidad de viajes.</p>
        </div>
      </div>
    </MainLayout>
  );
}
