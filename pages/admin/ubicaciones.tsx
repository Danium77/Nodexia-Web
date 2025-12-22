import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import { usePageVisibility } from '../../lib/hooks/usePageVisibility';
import { supabase } from '../../lib/supabaseClient';
import Sidebar from '../../components/layout/Sidebar';
import CrearUbicacionModal from '../../components/Modals/CrearUbicacionModal';
import type { Ubicacion } from '../../types/ubicaciones';

export default function GestionUbicaciones() {
  const router = useRouter();
  const { user, primaryRole, loading } = useUserRole();
  const { isReturning } = usePageVisibility();
  
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUbicacion, setEditingUbicacion] = useState<Ubicacion | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [authChecked, setAuthChecked] = useState(false);

  // useEffect para verificación de autenticación y permisos
  useEffect(() => {
    if (loading) return; // Esperar que termine de cargar
    
    // 🔥 NO EJECUTAR si usuario está volviendo a la app
    if (isReturning) {
      console.log('🛑 [ubicaciones] Usuario volviendo - NO verificar permisos');
      return;
    }
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    // Solo hacer redirect si ya verificamos el rol Y definitivamente no es super_admin ni admin_nodexia
    if (primaryRole && primaryRole !== 'super_admin' && primaryRole !== 'admin_nodexia') {
      console.warn('⚠️ [ubicaciones] Usuario sin permisos, redirigiendo a dashboard');
      router.push('/dashboard');
      return;
    }
    
    setAuthChecked(true);
  }, [user, primaryRole, loading, router, isReturning]);

  // useEffect para cargar ubicaciones
  useEffect(() => {
    if (authChecked && (primaryRole === 'super_admin' || primaryRole === 'admin_nodexia')) {
      cargarUbicaciones();
    }
  }, [primaryRole, authChecked]);

  const cargarUbicaciones = async () => {
    try {
      setLoadingData(true);
      const { data, error } = await supabase
        .from('ubicaciones')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setUbicaciones(data || []);
    } catch (error) {
      console.error('Error cargando ubicaciones:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleCrearNueva = () => {
    setEditingUbicacion(null);
    setIsModalOpen(true);
  };

  const handleEditar = (ubicacion: Ubicacion) => {
    setEditingUbicacion(ubicacion);
    setIsModalOpen(true);
  };

  const handleToggleActivo = async (ubicacion: Ubicacion) => {
    try {
      const { error } = await supabase
        .from('ubicaciones')
        .update({ activo: !ubicacion.activo })
        .eq('id', ubicacion.id);

      if (error) throw error;
      
      // Actualizar lista local
      setUbicaciones(prev =>
        prev.map(u =>
          u.id === ubicacion.id ? { ...u, activo: !u.activo } : u
        )
      );
    } catch (error) {
      console.error('Error actualizando estado:', error);
      alert('Error al actualizar el estado de la ubicación');
    }
  };

  const handleModalClose = (actualizado: boolean) => {
    setIsModalOpen(false);
    setEditingUbicacion(null);
    if (actualizado) {
      cargarUbicaciones();
    }
  };

  // Filtros
  const ubicacionesFiltradas = ubicaciones.filter(u => {
    const matchSearch = 
      u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.cuit.includes(searchTerm) ||
      (u.ciudad && u.ciudad.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchTipo = filterTipo === 'all' || u.tipo === filterTipo;
    
    return matchSearch && matchTipo;
  });

  if (loading || (primaryRole !== 'super_admin' && primaryRole !== 'admin_nodexia')) {
    return null;
  }

  return (
    <div className="flex h-screen bg-[#0a0e1a]">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-50 mb-2">
              Gestión de Ubicaciones
            </h1>
            <p className="text-slate-400">
              Administra plantas, depósitos y clientes del sistema
            </p>
          </div>

          {/* Controles */}
          <div className="bg-[#1b273b] rounded-lg p-6 mb-6 border border-slate-700">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Búsqueda */}
              <div className="flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Buscar por nombre, CUIT o ciudad..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Filtro por tipo */}
              <div className="flex items-center gap-2">
                <label className="text-slate-400 text-sm">Tipo:</label>
                <select
                  value={filterTipo}
                  onChange={(e) => setFilterTipo(e.target.value)}
                  className="px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="all">Todos</option>
                  <option value="planta">Plantas</option>
                  <option value="deposito">Depósitos</option>
                  <option value="cliente">Clientes</option>
                </select>
              </div>

              {/* Botón crear */}
              <button
                onClick={handleCrearNueva}
                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <span>+</span>
                Nueva Ubicación
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mt-6">
              <div className="bg-[#0a0e1a] rounded-lg p-4 border border-slate-700">
                <div className="text-2xl font-bold text-cyan-400">{ubicaciones.length}</div>
                <div className="text-sm text-slate-400">Total</div>
              </div>
              <div className="bg-[#0a0e1a] rounded-lg p-4 border border-slate-700">
                <div className="text-2xl font-bold text-blue-400">
                  {ubicaciones.filter(u => u.tipo === 'planta').length}
                </div>
                <div className="text-sm text-slate-400">Plantas</div>
              </div>
              <div className="bg-[#0a0e1a] rounded-lg p-4 border border-slate-700">
                <div className="text-2xl font-bold text-purple-400">
                  {ubicaciones.filter(u => u.tipo === 'deposito').length}
                </div>
                <div className="text-sm text-slate-400">Depósitos</div>
              </div>
              <div className="bg-[#0a0e1a] rounded-lg p-4 border border-slate-700">
                <div className="text-2xl font-bold text-green-400">
                  {ubicaciones.filter(u => u.tipo === 'cliente').length}
                </div>
                <div className="text-sm text-slate-400">Clientes</div>
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className="bg-[#1b273b] rounded-lg border border-slate-700 overflow-hidden">
            {loadingData ? (
              <div className="p-12 text-center text-slate-400">
                Cargando ubicaciones...
              </div>
            ) : ubicacionesFiltradas.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-4xl mb-4">📍</div>
                <h3 className="text-xl font-bold text-slate-50 mb-2">
                  {searchTerm || filterTipo !== 'all' 
                    ? 'No se encontraron resultados' 
                    : 'No hay ubicaciones registradas'}
                </h3>
                <p className="text-slate-400">
                  {searchTerm || filterTipo !== 'all'
                    ? 'Intenta con otros filtros'
                    : 'Comienza creando tu primera ubicación desde el botón superior'}
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase">Contacto</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-300 uppercase">Estado</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-300 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {ubicacionesFiltradas.map((ubicacion) => (
                      <tr key={ubicacion.id} className={`hover:bg-[#0a0e1a]/50 ${!ubicacion.activo ? 'opacity-50' : ''}`}>
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
                        <td className="px-4 py-4 text-sm text-slate-300">
                          <div>{ubicacion.telefono || '-'}</div>
                          <div className="text-xs text-slate-500">{ubicacion.email || '-'}</div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => handleToggleActivo(ubicacion)}
                            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                              ubicacion.activo
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                            }`}
                          >
                            {ubicacion.activo ? 'Activo' : 'Inactivo'}
                          </button>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => handleEditar(ubicacion)}
                            className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer info */}
          <div className="mt-4 text-sm text-slate-500 text-center">
            Mostrando {ubicacionesFiltradas.length} de {ubicaciones.length} ubicaciones
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <CrearUbicacionModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          ubicacion={editingUbicacion}
        />
      )}
    </div>
  );
}
