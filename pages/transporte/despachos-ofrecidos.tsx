import React from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  TruckIcon,
  MapPinIcon,
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import AceptarDespachoModal from '@/components/Transporte/AceptarDespachoModal';
import RechazarViajeModal from '@/components/Transporte/RechazarViajeModal';
import AsignarUnidadModal from '@/components/Transporte/AsignarUnidadModal';
import useDespachosOfrecidos from '@/lib/hooks/useDespachosOfrecidos';
import type { DespachoOfrecido } from '@/lib/hooks/useDespachosOfrecidos';

const DespachosOfrecidos = () => {
  const {
    despachos, filteredDespachos, loading, error,
    searchTerm, setSearchTerm, fechaFilter, setFechaFilter,
    origenFilter, setOrigenFilter, destinoFilter, setDestinoFilter,
    estadoTab, setEstadoTab, showFilters, setShowFilters,
    origenes, destinos,
    selectedDespacho, showRechazarModal, setShowRechazarModal,
    viajeToReject, setViajeToReject,
    showAsignarUnidadModal, setShowAsignarUnidadModal,
    handleAceptarDespacho, handleRechazarDespacho, handleCancelarViaje,
    confirmRechazarViaje, loadDespachos, getPrioridadBadge,
    sinAsignar, enTransito, viajesUrgentes, altaPrioridad,
    pendientesCount, asignadosCount, rechazadosCount, canceladosCount,
  } = useDespachosOfrecidos();

  const renderPrioridadBadge = (prioridad?: string) => {
    const badge = getPrioridadBadge(prioridad);
    if (!badge) return null;
    return (
      <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <AdminLayout pageTitle="Despachos Ofrecidos">
      <div className="w-full px-4">
        <h1 className="text-3xl font-bold text-white mb-4">Despachos Ofrecidos</h1>

        {/* Badges de Status de Flota */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-[#1b273b] border border-cyan-800/50 rounded-lg p-3 hover:border-cyan-600 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-xs font-medium">📦 Total Viajes</span>
              <TruckIcon className="h-5 w-5 text-cyan-400" />
            </div>
            <p className="text-3xl font-bold text-white">{despachos.length}</p>
            <p className="text-[10px] text-gray-500 mt-1">disponibles</p>
          </div>

          <div className="bg-[#1b273b] border border-orange-800/50 rounded-lg p-3 hover:border-orange-600 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-orange-400 text-xs font-medium">⚠️ Sin Asignar</span>
              <ClockIcon className="h-5 w-5 text-orange-400" />
            </div>
            <p className="text-3xl font-bold text-white">{sinAsignar}</p>
            <p className="text-[10px] text-orange-400 mt-1">necesitan recursos</p>
          </div>

          <div className="bg-[#1b273b] border border-red-800/50 rounded-lg p-3 hover:border-red-600 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-red-400 text-xs font-medium">🔥 Urgentes</span>
              <ClockIcon className="h-5 w-5 text-red-400" />
            </div>
            <p className="text-3xl font-bold text-white">{viajesUrgentes}</p>
            <p className="text-[10px] text-red-400 mt-1">próximas 4h</p>
          </div>

          <div className="bg-[#1b273b] border border-blue-800/50 rounded-lg p-3 hover:border-blue-600 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-400 text-xs font-medium">🚛 En Tránsito</span>
              <TruckIcon className="h-5 w-5 text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-white">{enTransito}</p>
            <p className="text-[10px] text-gray-500 mt-1">activos ahora</p>
          </div>

          <div className="bg-[#1b273b] border border-purple-800/50 rounded-lg p-3 hover:border-purple-600 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-400 text-xs font-medium">⭐ Alta Prioridad</span>
              <CheckCircleIcon className="h-5 w-5 text-purple-400" />
            </div>
            <p className="text-3xl font-bold text-white">{altaPrioridad}</p>
            <p className="text-[10px] text-gray-500 mt-1">prioritarios</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-[#1b273b] rounded-lg p-2 mb-4 border border-gray-800 flex gap-2">
          <button
            onClick={() => setEstadoTab('pendientes')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              estadoTab === 'pendientes'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'
                : 'bg-transparent text-gray-400 hover:text-white hover:bg-[#0a0e1a]'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <ClockIcon className="h-4 w-4" />
              <span>Pendientes</span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold">
                {pendientesCount}
              </span>
            </div>
          </button>

          <button
            onClick={() => setEstadoTab('asignados')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              estadoTab === 'asignados'
                ? 'bg-green-600 text-white shadow-lg shadow-green-500/20'
                : 'bg-transparent text-gray-400 hover:text-white hover:bg-[#0a0e1a]'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <CheckCircleIcon className="h-4 w-4" />
              <span>Asignados</span>
              <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">
                {asignadosCount}
              </span>
            </div>
          </button>

          <button
            onClick={() => setEstadoTab('rechazados')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              estadoTab === 'rechazados'
                ? 'bg-red-600 text-white shadow-lg shadow-red-500/20'
                : 'bg-transparent text-gray-400 hover:text-white hover:bg-[#0a0e1a]'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <XCircleIcon className="h-4 w-4" />
              <span>Rechazados</span>
              <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold">
                {rechazadosCount}
              </span>
            </div>
          </button>

          <button
            onClick={() => setEstadoTab('cancelados')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              estadoTab === 'cancelados'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20'
                : 'bg-transparent text-gray-400 hover:text-white hover:bg-[#0a0e1a]'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <XCircleIcon className="h-4 w-4" />
              <span>Cancelados</span>
              <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold">
                {canceladosCount}
              </span>
            </div>
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-[#1b273b] rounded p-1.5 mb-2 border border-gray-800">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <FunnelIcon className="h-3 w-3 text-gray-400" />
              <span className="text-white font-semibold text-xs">Filtros</span>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-cyan-400 hover:text-cyan-300 text-[10px] font-medium"
            >
              {showFilters ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2">
              <div>
                <label className="block text-gray-400 text-[9px] mb-1">Buscar</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Pedido, origen..."
                    className="w-full pl-6 pr-2 py-1 bg-[#0a0e1a] border border-gray-700 rounded text-white text-[10px] placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-[9px] mb-1">Fecha</label>
                <input
                  type="date"
                  value={fechaFilter}
                  onChange={(e) => setFechaFilter(e.target.value)}
                  className="w-full px-2 py-1 bg-[#0a0e1a] border border-gray-700 rounded text-white text-[10px] focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-[9px] mb-1">Origen</label>
                <select
                  value={origenFilter}
                  onChange={(e) => setOrigenFilter(e.target.value)}
                  className="w-full px-2 py-1 bg-[#0a0e1a] border border-gray-700 rounded text-white text-[10px] focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Todos</option>
                  {origenes.map(origen => (
                    <option key={origen} value={origen}>{origen}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-[9px] mb-1">Destino</label>
                <select
                  value={destinoFilter}
                  onChange={(e) => setDestinoFilter(e.target.value)}
                  className="w-full px-2 py-1 bg-[#0a0e1a] border border-gray-700 rounded text-white text-[10px] focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Todos</option>
                  {destinos.map(destino => (
                    <option key={destino} value={destino}>{destino}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Métricas de Cancelación - Solo visible en tab Cancelados */}
        {estadoTab === 'cancelados' && <CancelacionMetricas despachos={despachos} />}

        {/* Lista de despachos */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
            <p className="text-gray-400 mt-4">Cargando despachos...</p>
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        ) : filteredDespachos.length === 0 ? (
          <div className="bg-[#1b273b] rounded-lg p-12 text-center border border-gray-800">
            <TruckIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No hay despachos disponibles</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredDespachos.map((despacho) => (
              <DespachoRow
                key={despacho.id}
                despacho={despacho}
                onAceptar={handleAceptarDespacho}
                onRechazar={handleRechazarDespacho}
                onCancelar={handleCancelarViaje}
                renderPrioridadBadge={renderPrioridadBadge}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal para asignar unidad */}
      {showAsignarUnidadModal && selectedDespacho && (
        <AsignarUnidadModal
          isOpen={showAsignarUnidadModal}
          onClose={() => setShowAsignarUnidadModal(false)}
          despacho={{
            id: selectedDespacho.despacho_id || selectedDespacho.id,
            viaje_id: selectedDespacho.id,
            pedido_id: selectedDespacho.pedido_id,
            origen: selectedDespacho.origen,
            origen_id: selectedDespacho.origen_id,
            origen_ciudad: selectedDespacho.origen_ciudad,
            origen_provincia: selectedDespacho.origen_provincia,
            destino: selectedDespacho.destino,
            destino_id: selectedDespacho.destino_id,
            destino_ciudad: selectedDespacho.destino_ciudad,
            destino_provincia: selectedDespacho.destino_provincia,
            scheduled_local_date: selectedDespacho.scheduled_local_date,
          } as any}
          onSuccess={() => {
            setShowAsignarUnidadModal(false);
            setTimeout(() => {
              loadDespachos();
            }, 100);
          }}
        />
      )}

      {/* Modal para rechazar viaje */}
      {showRechazarModal && viajeToReject && (
        <RechazarViajeModal
          isOpen={showRechazarModal}
          onClose={() => {
            setShowRechazarModal(false);
            setViajeToReject(null);
          }}
          viaje={{
            id: viajeToReject.id,
            pedido_id: viajeToReject.pedido_id,
            ...(viajeToReject.viaje_numero && { viaje_numero: viajeToReject.viaje_numero }),
            origen: viajeToReject.origen,
            destino: viajeToReject.destino
          } as any}
          onConfirm={confirmRechazarViaje}
        />
      )}
    </AdminLayout>
  );
};

// --- Sub-components ---

function DespachoRow({ despacho, onAceptar, onRechazar, onCancelar, renderPrioridadBadge }: {
  despacho: DespachoOfrecido;
  onAceptar: (d: DespachoOfrecido) => void;
  onRechazar: (d: DespachoOfrecido) => void;
  onCancelar: (d: DespachoOfrecido) => void;
  renderPrioridadBadge: (p?: string) => React.ReactNode;
}) {
  return (
    <div className="bg-[#1b273b] rounded border border-gray-800 hover:border-cyan-500/30 transition-colors p-2">
      <div className="flex items-center gap-2">
        {/* Pedido ID */}
        <div className="min-w-[120px] flex items-center gap-2">
          <span className="text-white font-bold text-sm">{despacho.pedido_id}</span>
          {despacho.origen_asignacion === 'red_nodexia' && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-0.5">
              🌐 Red
            </span>
          )}
        </div>

        {/* Recursos */}
        <div className="flex items-center gap-1 min-w-[200px]">
          {despacho.tiene_chofer ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
              <UserIcon className="h-3 w-3" />
              {despacho.chofer_nombre}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">
              Sin Chofer
            </span>
          )}
          {despacho.tiene_camion ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
              <TruckIcon className="h-3 w-3" />
              {despacho.camion_patente}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">
              Sin Camión
            </span>
          )}
        </div>

        {/* Ruta */}
        <div className="flex-1 flex items-center gap-2 text-xs text-gray-300 truncate">
          <MapPinIcon className="h-3 w-3 text-green-400 flex-shrink-0" />
          <div className="flex flex-col">
            <span className="truncate font-medium text-white">{despacho.origen}</span>
            {(despacho.origen_ciudad || despacho.origen_provincia) && (
              <span className="text-[10px] text-gray-500">
                {despacho.origen_ciudad}{despacho.origen_ciudad && despacho.origen_provincia ? ', ' : ''}{despacho.origen_provincia}
              </span>
            )}
          </div>
          <span className="text-gray-600 mx-1">→</span>
          <MapPinIcon className="h-3 w-3 text-orange-400 flex-shrink-0" />
          <div className="flex flex-col">
            <span className="truncate font-medium text-white">{despacho.destino}</span>
            {(despacho.destino_ciudad || despacho.destino_provincia) && (
              <span className="text-[10px] text-gray-500">
                {despacho.destino_ciudad}{despacho.destino_ciudad && despacho.destino_provincia ? ', ' : ''}{despacho.destino_provincia}
              </span>
            )}
          </div>
        </div>

        {/* Fecha */}
        <div className="flex items-center gap-2 min-w-[150px]">
          <div className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
            <ClockIcon className="h-4 w-4 text-cyan-400" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-cyan-400">
                {despacho.scheduled_local_date ?
                  new Date(despacho.scheduled_local_date + 'T00:00:00').toLocaleDateString('es-AR', {day: '2-digit', month: '2-digit', year: '2-digit'}) :
                  'Sin fecha'
                }
              </span>
              <span className="text-[10px] text-cyan-300/70">{despacho.scheduled_local_time || 'Sin hora'}</span>
            </div>
          </div>
        </div>

        {/* Prioridad */}
        {renderPrioridadBadge(despacho.prioridad)}

        {/* Estado del viaje */}
        <div className="flex items-center gap-1 min-w-[110px]">
          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
            despacho.estado_viaje === 'pausado' ? 'bg-orange-600/20 text-orange-400 border border-orange-600/30' :
            despacho.estado_viaje === 'confirmado_chofer' ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' :
            despacho.estado_viaje === 'en_transito_origen' || despacho.estado_viaje === 'en_transito_destino' ? 'bg-green-600/20 text-green-400 border border-green-600/30' :
            despacho.estado_viaje === 'ingresado_origen' || despacho.estado_viaje === 'ingresado_destino' ? 'bg-purple-600/20 text-purple-400 border border-purple-600/30' :
            despacho.estado_viaje === 'cargado' || despacho.estado_viaje === 'descargado' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30' :
            despacho.estado_viaje === 'completado' || despacho.estado_viaje === 'egreso_destino' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30' :
            despacho.estado_viaje === 'cancelado' || despacho.estado_viaje === 'cancelado_por_transporte' ? 'bg-red-600/20 text-red-400 border border-red-600/30' :
            'bg-yellow-600/20 text-yellow-400 border border-yellow-600/30'
          }`}>
            {despacho.estado_viaje === 'pausado' ? '⏸️ Pausado' :
             despacho.estado_viaje === 'transporte_asignado' ? '✅ Asignado' :
             despacho.estado_viaje === 'confirmado_chofer' ? '✓ Confirmado' :
             despacho.estado_viaje === 'en_transito_origen' ? '🚚 A Origen' :
             despacho.estado_viaje === 'en_transito_destino' ? '🚛 A Destino' :
             despacho.estado_viaje === 'ingresado_origen' ? '🏭 En Planta' :
             despacho.estado_viaje === 'ingresado_destino' ? '🏁 En Destino' :
             despacho.estado_viaje === 'cargado' ? '📦 Cargado' :
             despacho.estado_viaje === 'descargado' ? '✅ Descargado' :
             despacho.estado_viaje === 'completado' ? '🏆 Completado' :
             despacho.estado_viaje === 'cancelado' ? '❌ Cancelado' :
             despacho.estado_viaje?.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2">
          {(!despacho.tiene_chofer || !despacho.tiene_camion) &&
           despacho.estado_viaje !== 'cancelado' &&
           despacho.estado_viaje !== 'cancelado_por_transporte' && (
            <>
              <button
                onClick={() => onAceptar(despacho)}
                className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white rounded-lg text-xs font-semibold transition-all shadow-md hover:shadow-lg"
                title={despacho.tiene_chofer || despacho.tiene_camion ? 'Completar recursos' : 'Asignar recursos'}
              >
                {despacho.tiene_chofer || despacho.tiene_camion ? '✅ Completar' : '🚛 Asignar'}
              </button>
              <button
                onClick={() => onRechazar(despacho)}
                className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg text-xs font-semibold transition-all shadow-md hover:shadow-lg"
                title="Rechazar este viaje"
              >
                ❌ Rechazar
              </button>
            </>
          )}

          {despacho.tiene_chofer && despacho.tiene_camion &&
           despacho.estado_viaje !== 'cancelado' &&
           despacho.estado_viaje !== 'cancelado_por_transporte' && (
            <>
              <button
                onClick={() => onAceptar(despacho)}
                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-xs font-semibold transition-all shadow-md hover:shadow-lg"
                title="Modificar recursos asignados"
              >
                ✏️ Modificar
              </button>
              <button
                onClick={() => onCancelar(despacho)}
                className="px-3 py-1.5 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg text-xs font-semibold transition-all shadow-md hover:shadow-lg"
                title="Cancelar viaje asignado"
              >
                🚫 Cancelar
              </button>
            </>
          )}

          {despacho.estado_viaje === 'cancelado' && (
            <span className="px-3 py-1.5 bg-red-900/30 border border-red-700 text-red-400 rounded-lg text-xs font-semibold">
              ❌ Rechazado
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CancelacionMetricas({ despachos }: { despachos: DespachoOfrecido[] }) {
  const cancelados = despachos.filter(d => d.estado_viaje === 'cancelado_por_transporte');

  const canceladosEsteMes = cancelados.filter(d => {
    if (!d.fecha_cancelacion) return false;
    const fechaCancelacion = new Date(d.fecha_cancelacion);
    const ahora = new Date();
    return fechaCancelacion.getMonth() === ahora.getMonth() &&
           fechaCancelacion.getFullYear() === ahora.getFullYear();
  }).length;

  const motivos = cancelados.reduce((acc: Record<string, number>, d) => {
    const motivo = d.motivo_cancelacion || 'Sin motivo especificado';
    acc[motivo] = (acc[motivo] || 0) + 1;
    return acc;
  }, {});

  const motivoEntries = Object.entries(motivos).sort((a, b) => b[1] - a[1]);
  const motivoMasComun = motivoEntries[0];

  return (
    <div className="bg-[#1b273b] rounded-lg p-6 mb-6 border border-orange-800">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <XCircleIcon className="h-6 w-6 text-orange-400" />
        Métricas de Cancelaciones
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#0a0e1a] rounded-lg p-4 border border-gray-800">
          <p className="text-gray-400 text-sm mb-1">Total Cancelados</p>
          <p className="text-3xl font-bold text-orange-400">{cancelados.length}</p>
        </div>

        <div className="bg-[#0a0e1a] rounded-lg p-4 border border-gray-800">
          <p className="text-gray-400 text-sm mb-1">Este Mes</p>
          <p className="text-3xl font-bold text-orange-400">{canceladosEsteMes}</p>
        </div>

        <div className="bg-[#0a0e1a] rounded-lg p-4 border border-gray-800 col-span-2">
          <p className="text-gray-400 text-sm mb-2">Motivo Más Común</p>
          <p className="text-lg font-semibold text-white">
            {motivoMasComun ? `${motivoMasComun[0]} (${motivoMasComun[1]} veces)` : 'N/A'}
          </p>
        </div>
      </div>

      <div className="bg-[#0a0e1a] rounded-lg p-4 border border-gray-800">
        <h4 className="text-white font-semibold mb-3">Distribución de Motivos</h4>
        <div className="space-y-2">
          {cancelados.length === 0 ? (
            <p className="text-gray-400 text-sm">No hay cancelaciones registradas</p>
          ) : (
            motivoEntries.map(([motivo, cantidad]) => {
              const porcentaje = ((cantidad / cancelados.length) * 100).toFixed(1);
              return (
                <div key={motivo} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm">{motivo}</span>
                      <span className="text-gray-400 text-sm">{cantidad} ({porcentaje}%)</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default DespachosOfrecidos;
