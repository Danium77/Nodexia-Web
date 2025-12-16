// ============================================================================
// PANTALLA: Cargas en Red Nodexia
// Marketplace para transportes - ven y aceptan viajes disponibles
// ============================================================================

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useUserRole } from '@/lib/contexts/UserRoleContext';
import { useRedNodexia } from '@/lib/hooks/useRedNodexia';
import { ViajeRedCompleto } from '@/types/red-nodexia';
import {
  GlobeAltIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  TruckIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { NodexiaLogo } from '@/components/ui/NodexiaLogo';

export default function CargasEnRed() {
  const { user, userEmpresas } = useUserRole();
  const { obtenerViajesAbiertos, obtenerMisViajesAsignados, crearOferta, loading } = useRedNodexia();

  // 🔥 NUEVO: Estado de tabs
  const [activeTab, setActiveTab] = useState<'disponibles' | 'mis_asignados'>('disponibles');

  const [viajes, setViajes] = useState<ViajeRedCompleto[]>([]);
  const [viajesAsignados, setViajesAsignados] = useState<ViajeRedCompleto[]>([]); // 🔥 NUEVO
  const [filteredViajes, setFilteredViajes] = useState<ViajeRedCompleto[]>([]);
  const [error, setError] = useState('');
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoCargaFilter, setTipoCargaFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modal oferta
  const [selectedViaje, setSelectedViaje] = useState<ViajeRedCompleto | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 🔥 NUEVO: Modal de asignación de recursos
  const [viajeParaAsignarRecursos, setViajeParaAsignarRecursos] = useState<any>(null);

  const empresaTransporte = userEmpresas?.find(
    (rel: any) => rel.empresas?.tipo_empresa === 'transporte'
  );

  // Helper para verificar si ya tengo una oferta
  const tengoOfertaParaViaje = (viaje: ViajeRedCompleto) => {
    if (!empresaTransporte || !viaje.ofertas) return false;
    return viaje.ofertas.some(
      (oferta: any) => oferta.transporte_id === empresaTransporte.empresa_id
    );
  };

  const getEstadoOferta = (viaje: ViajeRedCompleto) => {
    if (!empresaTransporte || !viaje.ofertas) return null;
    const miOferta = viaje.ofertas.find(
      (oferta: any) => oferta.transporte_id === empresaTransporte.empresa_id
    );
    return miOferta?.estado_oferta || null;
  };

  useEffect(() => {
    if (user && empresaTransporte) {
      if (activeTab === 'disponibles') {
        cargarViajes();
      } else {
        cargarViajesAsignados(); // 🔥 NUEVO
      }
    }
  }, [user, empresaTransporte, activeTab]); // 🔥 Agregado activeTab

  // 🔥 Recargar automáticamente cada 30 segundos para mantener data fresca
  useEffect(() => {
    if (!user || !empresaTransporte) return;
    
    const interval = setInterval(() => {
      if (activeTab === 'disponibles') {
        cargarViajes();
      } else {
        cargarViajesAsignados();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [user, empresaTransporte, activeTab]);

  useEffect(() => {
    aplicarFiltros();
  }, [searchTerm, tipoCargaFilter, viajes]);

  const cargarViajes = async () => {
    try {
      setError('');
      console.log('🔄 [cargas-en-red] Cargando viajes abiertos...');
      
      // 🔥 LIMPIAR state anterior para forzar re-render
      setViajes([]);
      
      const data = await obtenerViajesAbiertos();
      console.log(`📦 [cargas-en-red] Recibidos ${data.length} viajes de Red Nodexia`);
      
      // 🔥 FILTRAR viajes donde YA tengo una oferta aceptada o el viaje ya fue asignado
      if (empresaTransporte?.empresa_id) {
        const viajesFiltrados = data.filter(viaje => {
          // Verificar si tengo alguna oferta aceptada para este viaje
          const miOfertaAceptada = viaje.ofertas?.some(
            (oferta: any) => oferta.transporte_id === empresaTransporte.empresa_id && oferta.estado_oferta === 'aceptada'
          );
          
          // Verificar si el viaje ya fue asignado (a cualquier transporte)
          const viajeYaAsignado = viaje.estado_red === 'asignado';
          
          // Debug de cada viaje
          if (miOfertaAceptada || viajeYaAsignado) {
            console.log(`❌ [cargas-en-red] Viaje ${viaje.id} EXCLUIDO:`, {
              estado_red: viaje.estado_red,
              miOfertaAceptada,
              viajeYaAsignado,
              transporte_asignado: viaje.transporte_asignado_id
            });
          }
          
          // Solo mostrar si NO tengo oferta aceptada Y el viaje NO está asignado
          return !miOfertaAceptada && !viajeYaAsignado;
        });
        
        console.log(`✅ [cargas-en-red] Filtrado: ${data.length} total → ${viajesFiltrados.length} disponibles`);
        setViajes(viajesFiltrados);
      } else {
        setViajes(data);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar viajes');
    }
  };

  // 🔥 NUEVO: Cargar viajes asignados a mi empresa
  const cargarViajesAsignados = async () => {
    try {
      setError('');
      if (!empresaTransporte?.empresa_id) {
        console.warn('⚠️ [cargas-en-red] No hay empresa_id para cargar viajes asignados');
        return;
      }
      
      // 🔥 LIMPIAR state anterior
      setViajesAsignados([]);
      
      console.log(`🔄 [cargas-en-red] Cargando viajes asignados para empresa ${empresaTransporte.empresa_id}...`);
      const data = await obtenerMisViajesAsignados(empresaTransporte.empresa_id);
      console.log(`✅ [cargas-en-red] Recibidos ${data.length} viajes asignados:`, data);
      setViajesAsignados(data);
    } catch (err: any) {
      console.error('❌ [cargas-en-red] Error al cargar viajes asignados:', err);
      setError('Error al cargar viajes asignados: ' + err.message);
    }
  };

  const aplicarFiltros = () => {
    let filtered = [...viajes];

    // Búsqueda por texto
    if (searchTerm) {
      filtered = filtered.filter(v =>
        v.viaje?.despacho?.origen?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.viaje?.despacho?.destino?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.empresa_solicitante?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por tipo de carga
    if (tipoCargaFilter) {
      filtered = filtered.filter(v => v.requisitos?.tipo_carga === tipoCargaFilter);
    }

    setFilteredViajes(filtered);
  };

  const handleAceptarViaje = async (viaje: ViajeRedCompleto) => {
    if (!empresaTransporte) return;

    try {
      setSubmitting(true);
      setError('');

      await crearOferta(
        {
          viaje_red_id: viaje.id,
          mensaje: mensaje || undefined
        },
        empresaTransporte.empresa_id,
        user!.id
      );

      alert('¡Oferta enviada exitosamente! La planta evaluará tu propuesta.');
      setSelectedViaje(null);
      setMensaje('');
      cargarViajes();
      
    } catch (err: any) {
      setError(err.message || 'Error al enviar oferta');
    } finally {
      setSubmitting(false);
    }
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatMonto = (monto: number, moneda: string = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: moneda
    }).format(monto);
  };

  return (
    <AdminLayout pageTitle="Cargas en Red Nodexia">
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-lg border border-cyan-500/30 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/30">
                <NodexiaLogo className="h-10 w-10" animated />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Cargas en Red Nodexia</h1>
                <p className="text-gray-400 mt-1">
                  {activeTab === 'disponibles' 
                    ? 'Encuentra viajes disponibles y expande tu negocio'
                    : 'Gestiona tus viajes asignados desde Red Nodexia'
                  }
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => activeTab === 'disponibles' ? cargarViajes() : cargarViajesAsignados()}
                  disabled={loading}
                  className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  title="Recargar datos"
                >
                  <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {loading ? 'Actualizando...' : 'Recargar'}
                </button>
                <div>
                  <p className="text-3xl font-bold text-cyan-400">
                    {activeTab === 'disponibles' ? filteredViajes.length : viajesAsignados.length}
                  </p>
                  <p className="text-sm text-gray-400">
                    {activeTab === 'disponibles' ? 'Viajes disponibles' : 'Viajes asignados'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 🔥 NUEVO: Tabs */}
        <div className="flex gap-2 border-b border-gray-800">
          <button
            onClick={() => setActiveTab('disponibles')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'disponibles'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            🌐 Ofertas Disponibles
            {filteredViajes.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-cyan-500/20 rounded text-xs">
                {filteredViajes.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('mis_asignados')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'mis_asignados'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            ✅ Mis Viajes Asignados
            {viajesAsignados.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-green-500/20 rounded text-xs">
                {viajesAsignados.length}
              </span>
            )}
          </button>
        </div>

        {/* Barra de búsqueda y filtros */}
        <div className="bg-[#1b273b] rounded-lg border border-gray-800 p-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por origen, destino o empresa..."
                className="w-full pl-10 pr-4 py-2 bg-[#0a0e1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-[#0a0e1a] border border-gray-700 rounded-lg text-white hover:border-cyan-500 transition-colors flex items-center gap-2"
            >
              <FunnelIcon className="h-5 w-5" />
              Filtros
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Tipo de Carga
                </label>
                <select
                  value={tipoCargaFilter}
                  onChange={(e) => setTipoCargaFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0a0e1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Todos</option>
                  <option value="Granos">Granos</option>
                  <option value="Contenedor">Contenedor</option>
                  <option value="General">General</option>
                  <option value="Líquidos">Líquidos</option>
                  <option value="Peligrosa">Peligrosa</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* 🔥 TAB: Mis Viajes Asignados */}
        {activeTab === 'mis_asignados' ? (
          loading && !viajesAsignados.length ? (
            <div className="flex justify-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent"></div>
            </div>
          ) : viajesAsignados.length === 0 ? (
            <div className="bg-[#1b273b] rounded-lg border border-gray-800 p-12 text-center">
              <CheckCircleIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">No tienes viajes asignados desde Red Nodexia</p>
              <p className="text-sm text-gray-500 mb-4">Los viajes que aceptes desde el marketplace aparecerán aquí</p>
              <button
                onClick={() => setActiveTab('disponibles')}
                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
              >
                Ver Ofertas Disponibles
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {viajesAsignados.map((viaje) => (
                <div key={viaje.id} className="bg-[#1b273b] rounded-lg border border-green-500/30 p-6">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-full text-cyan-400 text-sm font-medium flex items-center gap-2">
                          <GlobeAltIcon className="h-4 w-4" />Red Nodexia
                        </span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-400 text-sm">Viaje #{viaje.viaje?.numero_viaje || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <MapPinIcon className="h-5 w-5 text-green-400" />
                            <span className="text-sm text-gray-400">Origen</span>
                          </div>
                          <p className="text-lg font-semibold text-white">{viaje.viaje?.despacho?.origen || 'N/A'}</p>
                        </div>
                        <div className="text-gray-600">→</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <MapPinIcon className="h-5 w-5 text-red-400" />
                            <span className="text-sm text-gray-400">Destino</span>
                          </div>
                          <p className="text-lg font-semibold text-white">{viaje.viaje?.despacho?.destino || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-800">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Planta</p>
                          <p className="text-sm font-medium text-white">{viaje.empresa_solicitante?.nombre}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Fecha</p>
                          <p className="text-sm font-medium text-white">{viaje.viaje?.despacho?.scheduled_local_date ? formatFecha(viaje.viaje.despacho.scheduled_local_date) : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Estado</p>
                          <p className="text-sm font-medium text-cyan-400">{viaje.viaje?.estado || 'Pendiente'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-800">
                        <div className="flex items-center gap-3 px-3 py-2 bg-gray-800/50 rounded-lg">
                          <TruckIcon className="h-5 w-5 text-blue-400" />
                          <div>
                            <p className="text-xs text-gray-500">Camión</p>
                            <p className="text-sm font-medium text-white">{viaje.viaje?.camiones?.patente || '⚠️ Sin asignar'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 px-3 py-2 bg-gray-800/50 rounded-lg">
                          <div className="h-5 w-5 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold">👤</div>
                          <div>
                            <p className="text-xs text-gray-500">Chofer</p>
                            <p className="text-sm font-medium text-white">{viaje.viaje?.choferes ? `${viaje.viaje.choferes.nombre} ${viaje.viaje.choferes.apellido}` : '⚠️ Sin asignar'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between h-full min-w-[200px]">
                      <div className="text-right mb-4">
                        <p className="text-sm text-gray-400 mb-1">Tarifa acordada</p>
                        <p className="text-2xl font-bold text-green-400">{formatMonto(viaje.tarifa_ofrecida, viaje.moneda)}</p>
                      </div>
                      {(!viaje.viaje?.id_camion || !viaje.viaje?.id_chofer) ? (
                        <button onClick={() => alert('TODO: Modal asignación')} className="px-6 py-3 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-700 hover:to-cyan-700 text-white rounded-lg font-semibold transition-all flex items-center gap-2">
                          <TruckIcon className="h-5 w-5" />Asignar Recursos
                        </button>
                      ) : (
                        <div className="px-6 py-3 bg-green-600/20 border border-green-500/30 text-green-400 rounded-lg font-semibold flex items-center gap-2">
                          <CheckCircleIcon className="h-5 w-5" />¡Completo!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* TAB: Ofertas Disponibles */
          <>
            {/* Búsqueda y filtros */}
            <div className="bg-[#1b273b] rounded-lg border border-gray-800 p-4">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por origen, destino o empresa..." className="w-full pl-10 pr-4 py-2 bg-[#0a0e1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500" />
                </div>
                <button onClick={() => setShowFilters(!showFilters)} className="px-4 py-2 bg-[#0a0e1a] border border-gray-700 rounded-lg text-white hover:border-cyan-500 transition-colors flex items-center gap-2">
                  <FunnelIcon className="h-5 w-5" />Filtros
                </button>
              </div>
              {showFilters && (
                <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Tipo de Carga</label>
                    <select value={tipoCargaFilter} onChange={(e) => setTipoCargaFilter(e.target.value)} className="w-full px-3 py-2 bg-[#0a0e1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500">
                      <option value="">Todos</option>
                      <option value="Granos">Granos</option>
                      <option value="Contenedor">Contenedor</option>
                      <option value="General">General</option>
                      <option value="Líquidos">Líquidos</option>
                      <option value="Peligrosa">Peligrosa</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Lista de viajes */}
            {loading && !viajes.length ? (
              <div className="flex justify-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent"></div>
              </div>
            ) : filteredViajes.length === 0 ? (
              <div className="bg-[#1b273b] rounded-lg border border-gray-800 p-12 text-center">
                <GlobeAltIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No hay cargas disponibles en este momento</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredViajes.map((viaje) => (
              <div
                key={viaje.id}
                className="bg-[#1b273b] rounded-lg border border-gray-800 hover:border-cyan-500/50 transition-all p-6"
              >
                <div className="flex items-start justify-between gap-6">
                  {/* Info principal */}
                  <div className="flex-1 space-y-4">
                    {/* Ruta */}
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPinIcon className="h-5 w-5 text-green-400" />
                          <span className="text-sm text-gray-400">Origen</span>
                        </div>
                        <p className="text-lg font-semibold text-white">
                          {viaje.viaje?.despacho?.origen || 'N/A'}
                        </p>
                      </div>
                      <div className="text-gray-600">→</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPinIcon className="h-5 w-5 text-red-400" />
                          <span className="text-sm text-gray-400">Destino</span>
                        </div>
                        <p className="text-lg font-semibold text-white">
                          {viaje.viaje?.despacho?.destino || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Detalles */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-800">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Empresa</p>
                        <p className="text-sm font-medium text-white">
                          {viaje.empresa_solicitante?.nombre}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Fecha</p>
                        <p className="text-sm font-medium text-white flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4 text-gray-400" />
                          {viaje.viaje?.despacho?.scheduled_local_date 
                            ? formatFecha(viaje.viaje.despacho.scheduled_local_date)
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Horario</p>
                        <p className="text-sm font-medium text-white flex items-center gap-1">
                          <ClockIcon className="h-4 w-4 text-gray-400" />
                          {viaje.viaje?.despacho?.scheduled_local_time || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Requisitos */}
                    {viaje.requisitos && (
                      <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-800">
                        {viaje.requisitos.tipo_camion && (
                          <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs font-medium">
                            <TruckIcon className="h-3 w-3 inline mr-1" />
                            {viaje.requisitos.tipo_camion}
                          </span>
                        )}
                        {viaje.requisitos.tipo_carga && (
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                            {viaje.requisitos.tipo_carga}
                          </span>
                        )}
                        {viaje.requisitos.requiere_carga_peligrosa && (
                          <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs font-medium">
                            <ExclamationTriangleIcon className="h-3 w-3 inline mr-1" />
                            Carga Peligrosa
                          </span>
                        )}
                        {viaje.requisitos.requiere_gps && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                            GPS Requerido
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tarifa y acción */}
                  <div className="flex flex-col items-end justify-between h-full min-w-[200px]">
                    <div className="text-right mb-4">
                      <p className="text-sm text-gray-400 mb-1">Tarifa ofrecida</p>
                      <p className="text-2xl font-bold text-green-400">
                        {formatMonto(viaje.tarifa_ofrecida, viaje.moneda)}
                      </p>
                    </div>

                    {(() => {
                      const tengoOferta = tengoOfertaParaViaje(viaje);
                      const estadoOferta = getEstadoOferta(viaje);
                      
                      if (tengoOferta) {
                        if (estadoOferta === 'pendiente') {
                          return (
                            <div className="text-center">
                              <div className="px-6 py-3 bg-yellow-600 text-white rounded-lg font-semibold flex items-center gap-2 mb-2">
                                <ClockIcon className="h-5 w-5" />
                                Oferta Enviada
                              </div>
                              <p className="text-xs text-gray-400">Esperando respuesta</p>
                            </div>
                          );
                        } else if (estadoOferta === 'aceptada') {
                          return (
                            <div className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold flex items-center gap-2">
                              <CheckCircleIcon className="h-5 w-5" />
                              ¡Asignado!
                            </div>
                          );
                        } else if (estadoOferta === 'rechazada') {
                          return (
                            <div className="px-6 py-3 bg-red-600/50 text-gray-300 rounded-lg font-semibold">
                              Oferta Rechazada
                            </div>
                          );
                        }
                      }
                      
                      return (
                        <button
                          onClick={() => setSelectedViaje(viaje)}
                          className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all flex items-center gap-2"
                        >
                          <CheckCircleIcon className="h-5 w-5" />
                          Aceptar Viaje
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
            )}
          </>
        )}
      </div>

      {/* Modal de confirmación */}
      {selectedViaje && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0e1a] rounded-xl border border-cyan-500/30 max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Confirmar Aceptación</h3>
            
            <div className="bg-[#1b273b] rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400">Ruta:</span>
                <span className="text-white font-medium">
                  {selectedViaje.viaje?.despacho?.origen} → {selectedViaje.viaje?.despacho?.destino}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Tarifa:</span>
                <span className="text-green-400 font-bold text-lg">
                  {formatMonto(selectedViaje.tarifa_ofrecida, selectedViaje.moneda)}
                </span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mensaje para la planta (opcional)
              </label>
              <textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Ej: Tenemos disponibilidad inmediata, camión con GPS activo..."
                rows={4}
                className="w-full px-4 py-2 bg-[#1b273b] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedViaje(null);
                  setMensaje('');
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleAceptarViaje(selectedViaje)}
                disabled={submitting}
                className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
              >
                {submitting ? 'Enviando...' : 'Confirmar Aceptación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
