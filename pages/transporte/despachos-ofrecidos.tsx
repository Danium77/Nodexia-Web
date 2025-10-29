import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/layout/AdminLayout';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import {
  TruckIcon,
  MapPinIcon,
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import AceptarDespachoModal from '../../components/Transporte/AceptarDespachoModal';

interface Despacho {
  id: string;
  pedido_id: string;
  origen: string;
  destino: string;
  scheduled_local_date: string;
  scheduled_local_time: string;
  producto?: string;
  cantidad?: number;
  unidad_carga?: string;
  distancia_km?: number;
  observaciones?: string;
  prioridad?: string;
  created_at: string;
}

const DespachosOfrecidos = () => {
  const { user, userEmpresas } = useUserRole();
  const [despachos, setDespachos] = useState<Despacho[]>([]);
  const [filteredDespachos, setFilteredDespachos] = useState<Despacho[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [fechaFilter, setFechaFilter] = useState('');
  const [origenFilter, setOrigenFilter] = useState('');
  const [destinoFilter, setDestinoFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modal
  const [selectedDespacho, setSelectedDespacho] = useState<Despacho | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Listas para filtros
  const [origenes, setOrigenes] = useState<string[]>([]);
  const [destinos, setDestinos] = useState<string[]>([]);

  useEffect(() => {
    if (user && userEmpresas) {
      loadDespachos();
    }
  }, [user, userEmpresas]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, fechaFilter, origenFilter, destinoFilter, despachos]);

  const loadDespachos = async () => {
    try {
      setLoading(true);
      setError('');

      // Obtener empresa de transporte del usuario
      const empresaTransporte = userEmpresas?.find(
        (rel: any) => rel.empresas?.tipo_empresa === 'transporte'
      );

      if (!empresaTransporte) {
        setError('No tienes una empresa de transporte asignada');
        return;
      }

      // Cargar despachos pendientes
      // TODO: Agregar lógica para despachos que matcheen con la empresa
      // Por ahora, cargamos todos los pendientes
      const { data, error: despachosError } = await supabase
        .from('despachos')
        .select('*')
        .eq('estado', 'pendiente')
        .order('scheduled_local_date', { ascending: true })
        .order('scheduled_local_time', { ascending: true });

      if (despachosError) throw despachosError;

      setDespachos(data || []);

      // Extraer origenes y destinos únicos para filtros
      const uniqueOrigenes = [...new Set(data?.map(d => d.origen) || [])];
      const uniqueDestinos = [...new Set(data?.map(d => d.destino) || [])];
      setOrigenes(uniqueOrigenes);
      setDestinos(uniqueDestinos);

    } catch (err: any) {
      console.error('Error cargando despachos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...despachos];

    // Búsqueda por texto
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        d =>
          d.pedido_id.toLowerCase().includes(term) ||
          d.origen.toLowerCase().includes(term) ||
          d.destino.toLowerCase().includes(term) ||
          d.producto?.toLowerCase().includes(term)
      );
    }

    // Filtro por fecha
    if (fechaFilter) {
      filtered = filtered.filter(d => d.scheduled_local_date === fechaFilter);
    }

    // Filtro por origen
    if (origenFilter) {
      filtered = filtered.filter(d => d.origen === origenFilter);
    }

    // Filtro por destino
    if (destinoFilter) {
      filtered = filtered.filter(d => d.destino === destinoFilter);
    }

    setFilteredDespachos(filtered);
  };

  const handleAceptarDespacho = (despacho: Despacho) => {
    setSelectedDespacho(despacho);
    setShowModal(true);
  };

  const handleRechazarDespacho = async (despacho: Despacho) => {
    const motivo = prompt('¿Por qué rechazas este despacho?');
    if (!motivo) return;

    try {
      const { error } = await supabase
        .from('despachos')
        .update({ 
          estado: 'rechazado',
          observaciones: motivo
        })
        .eq('id', despacho.id);

      if (error) throw error;

      alert('✅ Despacho rechazado');
      loadDespachos();

    } catch (err: any) {
      console.error('Error rechazando despacho:', err);
      alert(`Error: ${err.message}`);
    }
  };

  const getPrioridadBadge = (prioridad?: string) => {
    if (!prioridad) return null;

    const colors = {
      alta: 'bg-red-500/20 text-red-400 border-red-500/30',
      media: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      baja: 'bg-green-500/20 text-green-400 border-green-500/30'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold border ${colors[prioridad as keyof typeof colors] || ''}`}>
        {prioridad.toUpperCase()}
      </span>
    );
  };

  return (
    <AdminLayout pageTitle="Despachos Ofrecidos">
      <div className="max-w-7xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#1b273b] rounded-lg p-4 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Despachos disponibles</p>
                <p className="text-2xl font-bold text-white">{despachos.length}</p>
              </div>
              <TruckIcon className="h-8 w-8 text-cyan-400" />
            </div>
          </div>

          <div className="bg-[#1b273b] rounded-lg p-4 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Filtrados</p>
                <p className="text-2xl font-bold text-white">{filteredDespachos.length}</p>
              </div>
              <FunnelIcon className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-[#1b273b] rounded-lg p-4 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Alta prioridad</p>
                <p className="text-2xl font-bold text-white">
                  {despachos.filter(d => d.prioridad === 'alta').length}
                </p>
              </div>
              <ClockIcon className="h-8 w-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-[#1b273b] rounded-lg p-4 mb-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <span className="text-white font-semibold">Filtros</span>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
            >
              {showFilters ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Buscar</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Pedido, origen, destino..."
                    className="w-full pl-10 pr-4 py-2 bg-[#0a0e1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Fecha</label>
                <input
                  type="date"
                  value={fechaFilter}
                  onChange={(e) => setFechaFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-[#0a0e1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Origen</label>
                <select
                  value={origenFilter}
                  onChange={(e) => setOrigenFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-[#0a0e1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Todos</option>
                  {origenes.map(origen => (
                    <option key={origen} value={origen}>{origen}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Destino</label>
                <select
                  value={destinoFilter}
                  onChange={(e) => setDestinoFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-[#0a0e1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
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
          <div className="grid grid-cols-1 gap-4">
            {filteredDespachos.map((despacho) => (
              <div
                key={despacho.id}
                className="bg-[#1b273b] rounded-lg p-6 border border-gray-800 hover:border-cyan-500/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white">
                        Pedido: {despacho.pedido_id}
                      </h3>
                      {getPrioridadBadge(despacho.prioridad)}
                    </div>
                    {despacho.producto && (
                      <p className="text-gray-400 text-sm">
                        {despacho.producto}
                        {despacho.cantidad && ` - ${despacho.cantidad} ${despacho.unidad_carga || 'unidades'}`}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAceptarDespacho(despacho)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <CheckCircleIcon className="h-5 w-5" />
                      Aceptar
                    </button>
                    <button
                      onClick={() => handleRechazarDespacho(despacho)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <XCircleIcon className="h-5 w-5" />
                      Rechazar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Origen */}
                  <div className="flex items-start gap-3">
                    <MapPinIcon className="h-5 w-5 text-green-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-gray-400 text-sm">Origen</p>
                      <p className="text-white font-medium">{despacho.origen}</p>
                    </div>
                  </div>

                  {/* Destino */}
                  <div className="flex items-start gap-3">
                    <MapPinIcon className="h-5 w-5 text-orange-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-gray-400 text-sm">Destino</p>
                      <p className="text-white font-medium">{despacho.destino}</p>
                    </div>
                  </div>

                  {/* Fecha y hora */}
                  <div className="flex items-start gap-3">
                    <ClockIcon className="h-5 w-5 text-cyan-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-gray-400 text-sm">Fecha programada</p>
                      <p className="text-white font-medium">
                        {new Date(despacho.scheduled_local_date).toLocaleDateString('es-AR')}
                      </p>
                      <p className="text-gray-400 text-sm">{despacho.scheduled_local_time}</p>
                    </div>
                  </div>
                </div>

                {despacho.distancia_km && (
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <p className="text-gray-400 text-sm">
                      Distancia estimada: <span className="text-white font-medium">{despacho.distancia_km} km</span>
                    </p>
                  </div>
                )}

                {despacho.observaciones && (
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <p className="text-gray-400 text-sm">Observaciones:</p>
                    <p className="text-white text-sm mt-1">{despacho.observaciones}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para aceptar despacho */}
      {showModal && selectedDespacho && (
        <AceptarDespachoModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedDespacho(null);
          }}
          despacho={selectedDespacho}
          onSuccess={() => {
            setShowModal(false);
            setSelectedDespacho(null);
            loadDespachos();
          }}
        />
      )}
    </AdminLayout>
  );
};

export default DespachosOfrecidos;
