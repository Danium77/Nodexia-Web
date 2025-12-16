// ============================================================================
// PANTALLA: Gestión de Ofertas de Red Nodexia
// Para coordinadores de planta - Ver y aceptar ofertas de transportes
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/layout/AdminLayout';
import { useUserRole } from '@/lib/contexts/UserRoleContext';
import { useRedNodexia } from '@/lib/hooks/useRedNodexia';
import { ViajeRedCompleto, OfertaRedCompleta } from '@/types/red-nodexia';
import {
  TruckIcon,
  EnvelopeIcon,
  PhoneIcon,
  CheckCircleIcon,
  XMarkIcon,
  ClockIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { NodexiaLogo } from '@/components/ui/NodexiaLogo';

export default function OfertasRedNodexia() {
  const router = useRouter();
  const { user, userEmpresas } = useUserRole();
  const { obtenerMisViajesPublicados, obtenerOfertasViaje, aceptarOferta, rechazarOferta, loading } = useRedNodexia();

  const [viajes, setViajes] = useState<ViajeRedCompleto[]>([]);
  const [selectedViaje, setSelectedViaje] = useState<ViajeRedCompleto | null>(null);
  const [ofertas, setOfertas] = useState<OfertaRedCompleta[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const empresaPlanta = userEmpresas?.find(
    (rel: any) => rel.empresas?.tipo_empresa !== 'transporte'
  );

  useEffect(() => {
    if (user && empresaPlanta) {
      cargarViajesPublicados();
    }
  }, [user, empresaPlanta]);

  const cargarViajesPublicados = async () => {
    try {
      setError('');
      const data = await obtenerMisViajesPublicados(empresaPlanta!.empresa_id);
      
      console.log('📊 Viajes publicados recibidos:', data);
      console.log('📊 Estados:', data.map(v => ({ id: v.id, estado: v.estado_red, ofertas: v.ofertas?.length || 0 })));
      
      // Mostrar todos los viajes (no solo con ofertas)
      setViajes(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar viajes');
    }
  };

  const cargarOfertas = async (viajeRedId: string) => {
    try {
      setError('');
      const data = await obtenerOfertasViaje(viajeRedId);
      setOfertas(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar ofertas');
    }
  };

  const handleVerOfertas = async (viaje: ViajeRedCompleto) => {
    setSelectedViaje(viaje);
    await cargarOfertas(viaje.id);
  };

  const handleAceptarOferta = async (oferta: OfertaRedCompleta) => {
    if (!selectedViaje || !empresaPlanta) return;

    const confirmar = window.confirm(
      `¿Confirmar asignación a ${oferta.transporte?.nombre}?\n\nEsto cerrará el viaje en la Red Nodexia.`
    );

    if (!confirmar) return;

    try {
      setSubmitting(true);
      setError('');

      await aceptarOferta(
        oferta.id,
        selectedViaje.id,
        oferta.transporte_id,
        user!.id
      );

      alert('✅ Oferta aceptada! El transporte ha sido asignado.');
      
      // Recargar viajes
      await cargarViajesPublicados();
      setSelectedViaje(null);
      setOfertas([]);

    } catch (err: any) {
      setError(err.message || 'Error al aceptar oferta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRechazarOferta = async (ofertaId: string) => {
    const confirmar = window.confirm('¿Rechazar esta oferta?');
    if (!confirmar) return;

    try {
      setSubmitting(true);
      setError('');

      await rechazarOferta(ofertaId);

      alert('Oferta rechazada');
      
      // Recargar ofertas
      if (selectedViaje) {
        await cargarOfertas(selectedViaje.id);
      }

    } catch (err: any) {
      setError(err.message || 'Error al rechazar oferta');
    } finally {
      setSubmitting(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      'abierto': { label: 'Abierto', color: 'bg-blue-500' },
      'con_ofertas': { label: 'Con Ofertas', color: 'bg-green-500' },
      'asignado': { label: 'Asignado', color: 'bg-purple-500' },
      'cancelado': { label: 'Cancelado', color: 'bg-gray-500' },
      'cerrado': { label: 'Cerrado', color: 'bg-gray-600' }
    };
    
    const badge = badges[estado] || badges['abierto'];
    return (
      <span className={`${badge.color} text-white px-3 py-1 rounded-full text-sm font-semibold`}>
        {badge.label}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AdminLayout pageTitle="Ofertas - Red Nodexia">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              className="text-cyan-400 hover:text-cyan-200"
              onClick={() => router.push('/crear-despacho')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center space-x-3">
              <NodexiaLogo className="w-10 h-10" />
              <div>
                <h1 className="text-3xl font-bold text-white">Ofertas de Red Nodexia</h1>
                <p className="text-gray-400">Gestiona las ofertas recibidas de transportes</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Lista de viajes con ofertas */}
        {!selectedViaje && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">
              Viajes publicados ({viajes.length})
            </h2>

            {viajes.length === 0 && (
              <div className="bg-gray-800 rounded-lg p-8 text-center">
                <p className="text-gray-400">No hay viajes con ofertas actualmente</p>
              </div>
            )}

            {viajes.map((viaje) => (
              <div
                key={viaje.id}
                className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors cursor-pointer"
                onClick={() => handleVerOfertas(viaje)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <MapPinIcon className="w-5 h-5 text-green-400" />
                      <span className="text-white font-semibold">
                        {viaje.viaje?.despacho?.origen}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="text-white font-semibold">
                        {viaje.viaje?.despacho?.destino}
                      </span>
                    </div>
                    <div className="text-gray-400 text-sm">
                      Viaje #{viaje.viaje?.numero_viaje} - Despacho #{viaje.viaje?.despacho?.numero_despacho}
                    </div>
                  </div>
                  <div className="text-right">
                    {getEstadoBadge(viaje.estado_red)}
                    <div className="text-cyan-400 text-2xl font-bold mt-2">
                      {formatCurrency(viaje.tarifa_ofrecida)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4 text-gray-400">
                    <div className="flex items-center space-x-2">
                      <TruckIcon className="w-4 h-4" />
                      <span>{viaje.requisitos?.tipo_camion || 'No especificado'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="w-4 h-4" />
                      <span>{formatDate(viaje.fecha_publicacion)}</span>
                    </div>
                  </div>
                  <button className="text-cyan-400 hover:text-cyan-200 font-semibold">
                    Ver ofertas →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detalle de ofertas */}
        {selectedViaje && (
          <div>
            <button
              className="mb-6 flex items-center text-cyan-400 hover:text-cyan-200"
              onClick={() => {
                setSelectedViaje(null);
                setOfertas([]);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver a mis viajes
            </button>

            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-white mb-4">
                {selectedViaje.viaje?.despacho?.origen} → {selectedViaje.viaje?.despacho?.destino}
              </h2>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Tarifa ofrecida:</span>
                  <div className="text-cyan-400 text-xl font-bold">
                    {formatCurrency(selectedViaje.tarifa_ofrecida)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Tipo de camión:</span>
                  <div className="text-white">{selectedViaje.requisitos?.tipo_camion || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-gray-400">Estado:</span>
                  <div className="mt-1">{getEstadoBadge(selectedViaje.estado_red)}</div>
                </div>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-white mb-4">
              Ofertas recibidas ({ofertas.length})
            </h3>

            {ofertas.length === 0 && (
              <div className="bg-gray-800 rounded-lg p-8 text-center">
                <p className="text-gray-400">Aún no hay ofertas para este viaje</p>
              </div>
            )}

            <div className="space-y-4">
              {ofertas.map((oferta) => (
                <div
                  key={oferta.id}
                  className={`bg-gray-800 rounded-lg p-6 border-2 ${
                    oferta.estado_oferta === 'aceptada'
                      ? 'border-green-500'
                      : oferta.estado_oferta === 'rechazada'
                      ? 'border-red-500 opacity-50'
                      : 'border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-white mb-2">
                        {oferta.transporte?.nombre}
                      </h4>
                      <div className="space-y-1 text-sm text-gray-400">
                        <div>CUIT: {oferta.transporte?.cuit}</div>
                        {oferta.transporte?.telefono && (
                          <div className="flex items-center space-x-2">
                            <PhoneIcon className="w-4 h-4" />
                            <span>{oferta.transporte.telefono}</span>
                          </div>
                        )}
                        {oferta.transporte?.email && (
                          <div className="flex items-center space-x-2">
                            <EnvelopeIcon className="w-4 h-4" />
                            <span>{oferta.transporte.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        oferta.estado_oferta === 'pendiente'
                          ? 'bg-yellow-500 text-black'
                          : oferta.estado_oferta === 'aceptada'
                          ? 'bg-green-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}>
                        {oferta.estado_oferta === 'pendiente' ? 'Pendiente' :
                         oferta.estado_oferta === 'aceptada' ? 'Aceptada' : 'Rechazada'}
                      </div>
                      <div className="text-gray-400 text-xs mt-2">
                        {formatDate(oferta.fecha_oferta)}
                      </div>
                    </div>
                  </div>

                  {oferta.mensaje && (
                    <div className="bg-gray-900 rounded p-3 mb-4">
                      <p className="text-gray-300 text-sm">{oferta.mensaje}</p>
                    </div>
                  )}

                  {oferta.estado_oferta === 'pendiente' && (
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleAceptarOferta(oferta)}
                        disabled={submitting}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold disabled:opacity-50 flex items-center justify-center space-x-2"
                      >
                        <CheckCircleIcon className="w-5 h-5" />
                        <span>Aceptar y Asignar</span>
                      </button>
                      <button
                        onClick={() => handleRechazarOferta(oferta.id)}
                        disabled={submitting}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold disabled:opacity-50 flex items-center justify-center space-x-2"
                      >
                        <XMarkIcon className="w-5 h-5" />
                        <span>Rechazar</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
