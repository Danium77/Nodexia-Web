import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import Sidebar from '../../components/layout/Sidebar';
import { supabase } from '../../lib/supabaseClient';
import {
  BuildingOfficeIcon,
  TruckIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  PencilIcon,
  EnvelopeIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import CrearEmpresaModal from '../../components/Admin/CrearEmpresaModal';

interface Empresa {
  id: string;
  nombre: string;
  cuit: string;
  email: string;
  telefono: string;
  direccion: string;
  localidad: string;
  provincia: string;
  tipo_empresa: 'transporte' | 'planta' | 'cliente' | 'sistema';
  estado_suscripcion: string;
  fecha_suscripcion: string;
  activo: boolean;
  created_at: string;
  notas?: string;
  plan_suscripcion_id?: string;
}

interface Stats {
  total: number;
  transportes: number;
  plantas: number;
  clientes: number;
  activas: number;
  inactivas: number;
}

export default function GestionEmpresas() {
  const router = useRouter();
  const { user, primaryRole, loading } = useUserRole();

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [filteredEmpresas, setFilteredEmpresas] = useState<Empresa[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    transportes: 0,
    plantas: 0,
    clientes: 0,
    activas: 0,
    inactivas: 0
  });

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('');
  const [estadoFilter, setEstadoFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [empresaToEdit, setEmpresaToEdit] = useState<Empresa | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && primaryRole !== 'super_admin' && primaryRole !== 'admin_nodexia') {
      router.push('/dashboard');
    }
  }, [user, primaryRole, loading, router]);

  useEffect(() => {
    if (primaryRole === 'super_admin' || primaryRole === 'admin_nodexia') {
      loadEmpresas();
    }
  }, [primaryRole]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, tipoFilter, estadoFilter, empresas]);

  const loadEmpresas = async () => {
    try {
      setLoadingData(true);
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEmpresas(data || []);
      calculateStats(data || []);
    } catch (err: any) {
      console.error('Error cargando empresas:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const calculateStats = (data: Empresa[]) => {
    const newStats: Stats = {
      total: data.length,
      transportes: data.filter(e => e.tipo_empresa === 'transporte').length,
      plantas: data.filter(e => e.tipo_empresa === 'planta').length,
      clientes: data.filter(e => e.tipo_empresa === 'cliente').length,
      activas: data.filter(e => e.activo).length,
      inactivas: data.filter(e => !e.activo).length
    };
    setStats(newStats);
  };

  const applyFilters = () => {
    let filtered = [...empresas];

    // Búsqueda por texto
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        e =>
          e.nombre.toLowerCase().includes(term) ||
          e.cuit.toLowerCase().includes(term) ||
          e.email?.toLowerCase().includes(term)
      );
    }

    // Filtro por tipo
    if (tipoFilter) {
      filtered = filtered.filter(e => e.tipo_empresa === tipoFilter);
    }

    // Filtro por estado
    if (estadoFilter === 'activa') {
      filtered = filtered.filter(e => e.activo);
    } else if (estadoFilter === 'inactiva') {
      filtered = filtered.filter(e => !e.activo);
    }

    setFilteredEmpresas(filtered);
  };

  const handleCrearEmpresa = () => {
    setEmpresaToEdit(null);
    setShowModal(true);
  };

  const handleEditEmpresa = (empresa: Empresa) => {
    setEmpresaToEdit(empresa);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEmpresaToEdit(null);
    loadEmpresas();
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'transporte':
        return <TruckIcon className="h-5 w-5" />;
      case 'planta':
        return <BuildingOfficeIcon className="h-5 w-5" />;
      case 'cliente':
        return <UserGroupIcon className="h-5 w-5" />;
      default:
        return <BuildingOfficeIcon className="h-5 w-5" />;
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'transporte':
        return 'Transporte';
      case 'planta':
        return 'Planta';
      case 'cliente':
        return 'Cliente';
      case 'sistema':
        return 'Sistema';
      default:
        return tipo;
    }
  };

  const getEstadoBadge = (activo: boolean, estadoSuscripcion: string) => {
    if (!activo) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
          Inactiva
        </span>
      );
    }

    switch (estadoSuscripcion) {
      case 'activa':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
            Activa
          </span>
        );
      case 'suspendida':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            Suspendida
          </span>
        );
      case 'prueba':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            Prueba
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/20 text-slate-400 border border-slate-500/30">
            {estadoSuscripcion || 'Sin estado'}
          </span>
        );
    }
  };

  if (loading || (primaryRole !== 'super_admin' && primaryRole !== 'admin_nodexia')) {
    return null;
  }

  return (
    <div className="flex h-screen bg-[#0a0e1a]">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-2 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-slate-50 mb-2">
                Gestión de Empresas
              </h1>
              <p className="text-slate-400">
                Administra empresas clientes suscritas a Nodexia
              </p>
            </div>
            <button
              onClick={handleCrearEmpresa}
              className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Nueva Empresa
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-1 mb-2">
            <div className="bg-[#1b273b] rounded-lg p-4 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Total</span>
                <BuildingOfficeIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-slate-50">{stats.total}</div>
            </div>

            <div className="bg-[#1b273b] rounded-lg p-4 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Transportes</span>
                <TruckIcon className="h-5 w-5 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-slate-50">{stats.transportes}</div>
            </div>

            <div className="bg-[#1b273b] rounded-lg p-4 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Plantas</span>
                <BuildingOfficeIcon className="h-5 w-5 text-green-400" />
              </div>
              <div className="text-2xl font-bold text-slate-50">{stats.plantas}</div>
            </div>

            <div className="bg-[#1b273b] rounded-lg p-4 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Clientes</span>
                <UserGroupIcon className="h-5 w-5 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-slate-50">{stats.clientes}</div>
            </div>

            <div className="bg-[#1b273b] rounded-lg p-4 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Activas</span>
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
              </div>
              <div className="text-2xl font-bold text-slate-50">{stats.activas}</div>
            </div>

            <div className="bg-[#1b273b] rounded-lg p-4 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Inactivas</span>
                <XCircleIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="text-2xl font-bold text-slate-50">{stats.inactivas}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-[#1b273b] rounded p-2 mb-2 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-slate-400" />
                <span className="text-slate-300 font-semibold">Filtros</span>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
              >
                {showFilters ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Buscar</label>
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Nombre, CUIT o email..."
                      className="w-full pl-10 pr-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">Tipo de Empresa</label>
                  <select
                    value={tipoFilter}
                    onChange={(e) => setTipoFilter(e.target.value)}
                    className="w-full px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Todos</option>
                    <option value="transporte">Transporte</option>
                    <option value="planta">Planta</option>
                    <option value="cliente">Cliente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">Estado</label>
                  <select
                    value={estadoFilter}
                    onChange={(e) => setEstadoFilter(e.target.value)}
                    className="w-full px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Todos</option>
                    <option value="activa">Activas</option>
                    <option value="inactiva">Inactivas</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="bg-[#1b273b] rounded-lg border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0a0e1a] border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Empresa
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Ubicación
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Suscripción
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {loadingData ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        Cargando empresas...
                      </td>
                    </tr>
                  ) : filteredEmpresas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        No se encontraron empresas
                      </td>
                    </tr>
                  ) : (
                    filteredEmpresas.map((empresa) => (
                      <tr key={empresa.id} className="hover:bg-[#0a0e1a] transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-slate-200 font-semibold">{empresa.nombre}</div>
                            <div className="text-slate-400 text-sm">{empresa.cuit}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getTipoIcon(empresa.tipo_empresa)}
                            <span className="text-slate-300">{getTipoLabel(empresa.tipo_empresa)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <EnvelopeIcon className="h-4 w-4" />
                              {empresa.email || 'Sin email'}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <PhoneIcon className="h-4 w-4" />
                              {empresa.telefono || 'Sin teléfono'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-300">
                            {empresa.localidad && empresa.provincia
                              ? `${empresa.localidad}, ${empresa.provincia}`
                              : empresa.provincia || 'Sin ubicación'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-400">
                            {empresa.fecha_suscripcion
                              ? new Date(empresa.fecha_suscripcion).toLocaleDateString('es-AR')
                              : 'Sin fecha'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getEstadoBadge(empresa.activo, empresa.estado_suscripcion)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleEditEmpresa(empresa)}
                            className="text-cyan-400 hover:text-cyan-300 transition-colors"
                            title="Editar empresa"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-center text-slate-400 text-sm">
            Mostrando {filteredEmpresas.length} de {empresas.length} empresas
          </div>
        </div>
      </div>

      {/* Modal Crear/Editar Empresa */}
      {showModal && (
        <CrearEmpresaModal
          isOpen={showModal}
          onClose={handleModalClose}
          empresaToEdit={empresaToEdit}
        />
      )}
    </div>
  );
}
