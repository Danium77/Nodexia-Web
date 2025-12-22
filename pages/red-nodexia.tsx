// ============================================================================
// PANTALLA: Red Nodexia (Para Plantas)
// Gestión de viajes publicados y ofertas recibidas
// ============================================================================

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useUserRole } from '@/lib/contexts/UserRoleContext';
import { useRedNodexia } from '@/lib/hooks/useRedNodexia';
import { ViajeRedCompleto, OfertaRedCompleta } from '@/types/red-nodexia';
import AbrirRedNodexiaModal from '@/components/Transporte/AbrirRedNodexiaModal';
import {
  GlobeAltIcon,
  PlusIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserGroupIcon,
  TruckIcon,
  PhoneIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { NodexiaLogo } from '@/components/ui/NodexiaLogo';

export default function RedNodexia() {
  const { user, userEmpresas } = useUserRole();
  const { obtenerMisViajesPublicados, obtenerOfertasViaje, aceptarOferta, rechazarOferta, loading } = useRedNodexia();

  const [viajes, setViajes] = useState<ViajeRedCompleto[]>([]);
  const [selectedViaje, setSelectedViaje] = useState<ViajeRedCompleto | null>(null);
  const [ofertas, setOfertas] = useState<OfertaRedCompleta[]>([]);
  const [error, setError] = useState('');
  
  // Modal
  const [showAbrirModal, setShowAbrirModal] = useState(false);
  const [showOfertasModal, setShowOfertasModal] = useState(false);

  const empresaPlanta = userEmpresas?.find(
    (rel: any) => rel.empresas?.tipo_empresa !== 'transporte'
  );

  useEffect(() => {
    if (user && empresaPlanta) {
      cargarMisViajes();
    }
  }, [user, empresaPlanta]);

  const cargarMisViajes = async () => {
    if (!empresaPlanta) return;
    
    try {
      setError('');
      const data = await obtenerMisViajesPublicados(empresaPlanta.empresa_id);
      setViajes(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar viajes');
    }
  };

  const handleVerOfertas = async (viaje: ViajeRedCompleto) => {
    try {
      setError('');
      setSelectedViaje(viaje);
      const data = await obtenerOfertasViaje(viaje.id);
      setOfertas(data);
      setShowOfertasModal(true);
    } catch (err: any) {
      setError(err.message || 'Error al cargar ofertas');
    }
  };

  const handleAceptarOferta = async (oferta: OfertaRedCompleta) => {
    if (!selectedViaje || !user) return;

    if (!confirm(`¿Confirmar asignación a ${oferta.transporte?.nombre}?`)) return;

    try {
      setError('');
      await aceptarOferta(
        oferta.id,
        selectedViaje.id,
        oferta.transporte_id,
        user.id
      );

      alert('¡Transporte asignado exitosamente!');
      setShowOfertasModal(false);
      cargarMisViajes();
    } catch (err: any) {
      setError(err.message || 'Error al aceptar oferta');
    }
  };

  const handleRechazarOferta = async (ofertaId: string) => {
    if (!confirm('¿Rechazar esta oferta?')) return;

    try {
      setError('');
      await rechazarOferta(ofertaId);
      
      // Recargar ofertas
      if (selectedViaje) {
        const data = await obtenerOfertasViaje(selectedViaje.id);
        setOfertas(data);
      }
    } catch (err: any) {
      setError(err.message || 'Error al rechazar oferta');
    }
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatMonto = (monto: number, moneda: string = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: moneda
    }).format(monto);
  };

  const getEstadoBadge = (estado: string) => {
    const configs: Record<string, { color: string; text: string }> = {
      abierto: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', text: 'Abierto' },
      con_ofertas: { color: 'bg-green-500/20 text-green-400 border-green-500/30', text: 'Con Ofertas' },
      asignado: { color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', text: 'Asignado' },
      cancelado: { color: 'bg-red-500/20 text-red-400 border-red-500/30', text: 'Cancelado' },
      cerrado: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', text: 'Cerrado' }
    };
    
    const config = configs[estado] || configs.abierto;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${config?.color || 'border-gray-400'}`}>
        {config?.text || estado}
      </span>
    );
  };

  const stats = {
    abiertos: viajes.filter(v => v.estado_red === 'abierto').length,
    conOfertas: viajes.filter(v => v.estado_red === 'con_ofertas').length,
    asignados: viajes.filter(v => v.estado_red === 'asignado').length,
    totalOfertas: viajes.reduce((sum, v) => sum + (v.total_ofertas || 0), 0)
  };

  return (
    <AdminLayout pageTitle="Red Nodexia">
      <div className="space-y-6">
        {/* Header con stats */}
        <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-xl border border-cyan-500/30 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/30">
                <NodexiaLogo className="h-12 w-12" animated />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Red Nodexia</h1>
                <p className="text-gray-400 mt-1">
                  Publica viajes y recibe ofertas de toda la red de transportes
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAbrirModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all flex items-center gap-2 shadow-lg"
            >
              <PlusIcon className="h-5 w-5" />
              Publicar Viaje
            </button>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[#0a0e1a] rounded-lg p-4 border border-blue-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Abiertos</p>
                  <p className="text-2xl font-bold text-blue-400">{stats.abiertos}</p>
                </div>
                <ClockIcon className="h-8 w-8 text-blue-400" />
              </div>
            </div>

            <div className="bg-[#0a0e1a] rounded-lg p-4 border border-green-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Con Ofertas</p>
                  <p className="text-2xl font-bold text-green-400">{stats.conOfertas}</p>
                </div>
                <UserGroupIcon className="h-8 w-8 text-green-400" />
              </div>
            </div>

            <div className="bg-[#0a0e1a] rounded-lg p-4 border border-cyan-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Asignados</p>
                  <p className="text-2xl font-bold text-cyan-400">{stats.asignados}</p>
                </div>
                <CheckCircleIcon className="h-8 w-8 text-cyan-400" />
              </div>
            </div>

            <div className="bg-[#0a0e1a] rounded-lg p-4 border border-purple-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Ofertas</p>
                  <p className="text-2xl font-bold text-purple-400">{stats.totalOfertas}</p>
                </div>
                <ChartBarIcon className="h-8 w-8 text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Lista de viajes publicados */}
        {loading && !viajes.length ? (
          <div className="flex justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent"></div>
          </div>
        ) : viajes.length === 0 ? (
          <div className="bg-[#1b273b] rounded-lg border border-gray-800 p-12 text-center">
            <GlobeAltIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No has publicado viajes en la Red Nodexia</p>
            <button
              onClick={() => setShowAbrirModal(true)}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
            >
              Publicar primer viaje
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {viajes.map((viaje) => (
              <div
                key={viaje.id}
                className="bg-[#1b273b] rounded-lg border border-gray-800 hover:border-cyan-500/50 transition-all p-6"
              >
                <div className="flex items-start justify-between gap-6">
                  {/* Info principal */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <MapPinIcon className="h-5 w-5 text-green-400" />
                            <span className="text-lg font-semibold text-white">
                              {viaje.viaje?.despacho?.origen} → {viaje.viaje?.despacho?.destino}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400">
                            Viaje #{viaje.viaje?.numero_viaje} • Publicado {formatFecha(viaje.fecha_publicacion)}
                          </p>
                        </div>
                      </div>
                      {getEstadoBadge(viaje.estado_red)}
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-800">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Tarifa Ofrecida</p>
                        <p className="text-lg font-bold text-green-400">
                          {formatMonto(viaje.tarifa_ofrecida, viaje.moneda)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Ofertas Recibidas</p>
                        <p className="text-lg font-bold text-white">
                          {viaje.ofertas?.length || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Tipo de Camión</p>
                        <p className="text-sm font-medium text-white">
                          {viaje.requisitos?.tipo_camion || 'No especificado'}
                        </p>
                      </div>
                    </div>

                    {viaje.transporte_asignado && (
                      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                        <p className="text-xs text-cyan-400 mb-1">Transporte Asignado</p>
                        <p className="text-sm font-semibold text-white">
                          {viaje.transporte_asignado.nombre}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col gap-2 min-w-[180px]">
                    {viaje.estado_red === 'con_ofertas' && (
                      <button
                        onClick={() => handleVerOfertas(viaje)}
                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                      >
                        <UserGroupIcon className="h-5 w-5" />
                        Ver Ofertas ({viaje.ofertas?.length || 0})
                      </button>
                    )}
                    {viaje.estado_red === 'abierto' && (
                      <div className="text-center">
                        <ClockIcon className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                        <p className="text-xs text-gray-500">Esperando ofertas...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Abrir a Red */}
      {showAbrirModal && empresaPlanta && user && (
        <AbrirRedNodexiaModal
          isOpen={showAbrirModal}
          onClose={() => setShowAbrirModal(false)}
          viajeId="" // TODO: Implementar selección de viaje
          numeroViaje=""
          origen=""
          destino=""
          empresaId={empresaPlanta.empresa_id}
          usuarioId={user.id}
          onSuccess={cargarMisViajes}
        />
      )}

      {/* Modal Ver Ofertas */}
      {showOfertasModal && selectedViaje && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#0a0e1a] rounded-xl border border-cyan-500/30 max-w-4xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                Ofertas Recibidas ({ofertas.length})
              </h2>
              <button
                onClick={() => setShowOfertasModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="bg-[#1b273b] rounded-lg p-4 mb-6">
              <p className="text-gray-400 text-sm mb-2">Viaje</p>
              <p className="text-white font-semibold">
                {selectedViaje.viaje?.despacho?.origen} → {selectedViaje.viaje?.despacho?.destino}
              </p>
              <p className="text-green-400 font-bold mt-2">
                {formatMonto(selectedViaje.tarifa_ofrecida, selectedViaje.moneda)}
              </p>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {ofertas.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No hay ofertas aún</p>
              ) : (
                ofertas.map((oferta) => (
                  <div
                    key={oferta.id}
                    className="bg-[#1b273b] rounded-lg border border-gray-800 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-cyan-500/20 rounded-lg">
                            <TruckIcon className="h-6 w-6 text-cyan-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">
                              {oferta.transporte?.nombre}
                            </h3>
                            <p className="text-sm text-gray-400">
                              Oferta enviada {formatFecha(oferta.fecha_oferta)}
                            </p>
                          </div>
                        </div>

                        {oferta.mensaje && (
                          <div className="bg-[#0a0e1a] rounded-lg p-3 mb-3">
                            <p className="text-sm text-gray-300">{oferta.mensaje}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {oferta.transporte?.telefono && (
                            <div className="flex items-center gap-2 text-gray-400">
                              <PhoneIcon className="h-4 w-4" />
                              {oferta.transporte.telefono}
                            </div>
                          )}
                          {oferta.transporte?.email && (
                            <div className="flex items-center gap-2 text-gray-400">
                              <EnvelopeIcon className="h-4 w-4" />
                              {oferta.transporte.email}
                            </div>
                          )}
                        </div>
                      </div>

                      {oferta.estado_oferta === 'pendiente' && (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleAceptarOferta(oferta)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                          >
                            <CheckCircleIcon className="h-5 w-5" />
                            Aceptar
                          </button>
                          <button
                            onClick={() => handleRechazarOferta(oferta.id)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                          >
                            <XCircleIcon className="h-5 w-5" />
                            Rechazar
                          </button>
                        </div>
                      )}
                      {oferta.estado_oferta === 'aceptada' && (
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm font-semibold">
                          Aceptada
                        </span>
                      )}
                      {oferta.estado_oferta === 'rechazada' && (
                        <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm font-semibold">
                          Rechazada
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
