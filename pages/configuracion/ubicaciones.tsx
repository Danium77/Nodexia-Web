import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import VincularUbicacionModal from '../../components/Modals/VincularUbicacionModal';
import type { Ubicacion, EmpresaUbicacion } from '../../types/ubicaciones';

export default function ConfiguracionUbicaciones() {
  const router = useRouter();
  const { user, primaryRole, empresaId, loading } = useUserRole();
  
  const [ubicacionesDisponibles, setUbicacionesDisponibles] = useState<Ubicacion[]>([]);
  const [ubicacionesVinculadas, setUbicacionesVinculadas] = useState<EmpresaUbicacion[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUbicacion, setSelectedUbicacion] = useState<Ubicacion | null>(null);
  const [editingVinculo, setEditingVinculo] = useState<EmpresaUbicacion | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && primaryRole && !['coordinador', 'coordinador_integral', 'admin', 'super_admin'].includes(primaryRole)) {
      console.log('⚠️ Rol no permitido:', primaryRole);
      router.push('/dashboard');
    }
  }, [user, primaryRole, loading, router]);

  useEffect(() => {
    // Para super_admin, cargar TODAS las ubicaciones sin filtrar por empresa
    if (primaryRole === 'super_admin') {
      console.log('👑 Usuario Super Admin - cargando vista admin');
      cargarDatosAdmin();
    } else if (empresaId && primaryRole) {
      console.log(`🏢 Usuario ${primaryRole} - empresa: ${empresaId}`);
      cargarDatos();
    } else {
      console.warn('⚠️ No se puede cargar datos - empresaId:', empresaId, 'rol:', primaryRole);
    }
  }, [empresaId, primaryRole]);

  const cargarDatosAdmin = async () => {
    try {
      setLoadingData(true);
      console.log('🔑 Super Admin - cargando todas las ubicaciones');

      // Cargar todas las ubicaciones activas
      const { data: ubicaciones, error: errorUbicaciones } = await supabase
        .from('ubicaciones')
        .select('*')
        .eq('activo', true)
        .order('nombre', { ascending: true });

      if (errorUbicaciones) throw errorUbicaciones;

      setUbicacionesDisponibles(ubicaciones || []);
      setUbicacionesVinculadas([]); // Super admin no tiene vínculos específicos
      
      console.log(`✅ Cargadas ${ubicaciones?.length || 0} ubicaciones`);
    } catch (error) {
      console.error('Error cargando datos (admin):', error);
    } finally {
      setLoadingData(false);
    }
  };

  const cargarDatos = async () => {
    try {
      setLoadingData(true);
      console.log('🔄 Cargando datos para empresa:', empresaId);

      // Cargar todas las ubicaciones activas
      const { data: ubicaciones, error: errorUbicaciones } = await supabase
        .from('ubicaciones')
        .select('*')
        .eq('activo', true)
        .order('nombre', { ascending: true });

      if (errorUbicaciones) {
        console.error('❌ Error cargando ubicaciones:', errorUbicaciones);
        throw errorUbicaciones;
      }

      console.log(`✅ Ubicaciones cargadas: ${ubicaciones?.length || 0}`);

      // Cargar vínculos de mi empresa
      const { data: vinculos, error: errorVinculos } = await supabase
        .from('empresa_ubicaciones')
        .select(`
          *,
          ubicaciones (*)
        `)
        .eq('empresa_id', empresaId)
        .eq('activo', true);

      if (errorVinculos) {
        console.error('❌ Error cargando vínculos:', errorVinculos);
        throw errorVinculos;
      }

      console.log(`✅ Vínculos cargados: ${vinculos?.length || 0}`);

      setUbicacionesDisponibles(ubicaciones || []);
      setUbicacionesVinculadas(vinculos || []);
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleVincular = (ubicacion: Ubicacion) => {
    setSelectedUbicacion(ubicacion);
    setEditingVinculo(null);
    setIsModalOpen(true);
  };

  const handleEditar = (vinculo: EmpresaUbicacion) => {
    setEditingVinculo(vinculo);
    setSelectedUbicacion(null);
    setIsModalOpen(true);
  };

  const handleDesvincular = async (vinculoId: string) => {
    if (!confirm('¿Estás seguro de desvincular esta ubicación?')) return;

    try {
      const { error } = await supabase
        .from('empresa_ubicaciones')
        .update({ activo: false })
        .eq('id', vinculoId);

      if (error) throw error;

      cargarDatos();
    } catch (error) {
      console.error('Error desvinculando:', error);
      alert('Error al desvincular la ubicación');
    }
  };

  const handleModalClose = (actualizado: boolean) => {
    setIsModalOpen(false);
    setSelectedUbicacion(null);
    setEditingVinculo(null);
    if (actualizado) {
      cargarDatos();
    }
  };

  // Filtrar ubicaciones ya vinculadas
  const ubicacionesNoVinculadas = ubicacionesDisponibles.filter(
    u => !ubicacionesVinculadas.some(v => v.ubicacion_id === u.id)
  );

  if (loading || !primaryRole || !['coordinador', 'coordinador_integral', 'admin', 'super_admin'].includes(primaryRole)) {
    return null;
  }

  return (
    <div className="flex h-screen bg-[#0a0e1a]">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <Header userEmail="" userName="" pageTitle="Gestión de Ubicaciones" />
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-50 mb-2">
              Configuración de Ubicaciones
            </h1>
            <p className="text-slate-400">
              Vincula plantas, depósitos y clientes para usar en tus despachos
            </p>
          </div>

          {/* Ubicaciones Vinculadas */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-50">
                Mis Ubicaciones Vinculadas
              </h2>
              <span className="text-sm text-slate-400">
                {ubicacionesVinculadas.length} ubicaciones
              </span>
            </div>

            <div className="bg-[#1b273b] rounded-lg border border-slate-700 overflow-hidden">
              {loadingData ? (
                <div className="p-12 text-center text-slate-400">
                  Cargando ubicaciones...
                </div>
              ) : ubicacionesVinculadas.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-4xl mb-4">📍</div>
                  <h3 className="text-xl font-bold text-slate-50 mb-2">
                    No hay ubicaciones vinculadas
                  </h3>
                  <p className="text-slate-400 mb-6">
                    Vincula ubicaciones desde la lista de disponibles
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#0a0e1a]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase">Ubicación</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase">Tipo</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase">Ciudad</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase">Alias</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-300 uppercase">Origen</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-300 uppercase">Destino</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-300 uppercase">Prioridad</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-300 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {ubicacionesVinculadas.map((vinculo) => {
                        const ubicacion = (vinculo as any).ubicaciones;
                        return (
                        <tr key={vinculo.id} className="hover:bg-[#0a0e1a]/50">
                          <td className="px-4 py-4 text-sm">
                            <div className="font-medium text-slate-50">{ubicacion?.nombre}</div>
                            <div className="text-xs text-slate-500">{ubicacion?.cuit}</div>
                          </td>
                          <td className="px-4 py-4 text-sm">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              ubicacion?.tipo === 'planta' 
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : ubicacion?.tipo === 'deposito'
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                : 'bg-green-500/20 text-green-400 border border-green-500/30'
                            }`}>
                              {ubicacion?.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-300">
                            {ubicacion?.ciudad || '-'}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-300">
                            {vinculo.alias || '-'}
                          </td>
                          <td className="px-4 py-4 text-center">
                            {vinculo.es_origen ? (
                              <span className="text-green-400">✓</span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">
                            {vinculo.es_destino ? (
                              <span className="text-green-400">✓</span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center text-sm text-slate-300">
                            {vinculo.prioridad || 0}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => handleEditar(vinculo)}
                                className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDesvincular(vinculo.id)}
                                className="px-3 py-1 text-sm bg-red-700/20 hover:bg-red-700/30 text-red-400 rounded transition-colors border border-red-500/30"
                              >
                              Desvincular
                            </button>
                          </div>
                        </td>
                      </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Ubicaciones Disponibles */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-50">
                Ubicaciones Disponibles para Vincular
              </h2>
              <span className="text-sm text-slate-400">
                {ubicacionesNoVinculadas.length} disponibles
              </span>
            </div>

            <div className="bg-[#1b273b] rounded-lg border border-slate-700 overflow-hidden">
              {loadingData ? (
                <div className="p-12 text-center text-slate-400">
                  Cargando ubicaciones...
                </div>
              ) : ubicacionesNoVinculadas.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-4xl mb-4">✅</div>
                  <h3 className="text-xl font-bold text-slate-50 mb-2">
                    Todas las ubicaciones están vinculadas
                  </h3>
                  <p className="text-slate-400">
                    No hay más ubicaciones disponibles para vincular
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#0a0e1a]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase">Nombre</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase">CUIT</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase">Tipo</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase">Ubicación</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-300 uppercase">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {ubicacionesNoVinculadas.map((ubicacion) => (
                        <tr key={ubicacion.id} className="hover:bg-[#0a0e1a]/50">
                          <td className="px-4 py-4 text-sm font-medium text-slate-50">
                            {ubicacion.nombre}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-300">
                            {ubicacion.cuit}
                          </td>
                          <td className="px-4 py-4 text-sm">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              ubicacion.tipo === 'planta' 
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : ubicacion.tipo === 'deposito'
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                : 'bg-green-500/20 text-green-400 border border-green-500/30'
                            }`}>
                              {ubicacion.tipo.charAt(0).toUpperCase() + ubicacion.tipo.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-300">
                            <div>{ubicacion.ciudad || '-'}</div>
                            <div className="text-xs text-slate-500">{ubicacion.provincia || '-'}</div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <button
                              onClick={() => handleVincular(ubicacion)}
                              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition-colors"
                            >
                              Vincular
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <VincularUbicacionModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          ubicacion={selectedUbicacion}
          vinculo={editingVinculo}
          empresaId={empresaId || ''}
        />
      )}
    </div>
  );
}
