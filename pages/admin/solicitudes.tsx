import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import Sidebar from '../../components/layout/Sidebar';
import { supabase } from '../../lib/supabaseClient';
import {
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface Solicitud {
  id: string;
  nombre_completo: string;
  email: string;
  telefono: string;
  empresa_nombre: string;
  empresa_cuit: string;
  tipo_empresa_solicitado: string;
  motivo: string;
  estado: string;
  fecha_solicitud: string;
  notas_admin?: string;
}

export default function GestionSolicitudes() {
  const router = useRouter();
  const { user, primaryRole, loading } = useUserRole();
  
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('todas');
  const [tipoEmpresaFiltro, setTipoEmpresaFiltro] = useState<string>('todas');
  
  const [modalAprobando, setModalAprobando] = useState(false);
  const [modalRechazando, setModalRechazando] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<Solicitud | null>(null);
  const [rolInicial, setRolInicial] = useState('');
  const [notasRechazo, setNotasRechazo] = useState('');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && primaryRole && primaryRole !== 'admin') {
      router.push('/admin/super-admin-dashboard');
    }
  }, [user, primaryRole, loading, router]);

  useEffect(() => {
    if (user && primaryRole === 'admin') {
      cargarSolicitudes();
    }
  }, [user, primaryRole]);

  const cargarSolicitudes = async () => {
    try {
      console.log('[Solicitudes] Iniciando carga...');
      const { data, error } = await supabase
        .from('solicitudes_registro')
        .select('*')
        .order('fecha_solicitud', { ascending: false });

      console.log('[Solicitudes] Data recibida:', data);
      console.log('[Solicitudes] Error:', error);
      
      if (error) throw error;
      setSolicitudes(data || []);
      console.log('[Solicitudes] Estado actualizado con:', data?.length || 0, 'registros');
    } catch (error) {
      console.error('[Solicitudes] Error cargando solicitudes:', error);
    } finally {
      setLoadingSolicitudes(false);
    }
  };

  const solicitudesFiltradas = solicitudes.filter(sol => {
    const matchBusqueda = 
      sol.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
      sol.email.toLowerCase().includes(busqueda.toLowerCase()) ||
      sol.empresa_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      sol.empresa_cuit.includes(busqueda);
    
    const matchEstado = estadoFiltro === 'todas' || sol.estado === estadoFiltro;
    const matchTipo = tipoEmpresaFiltro === 'todas' || sol.tipo_empresa_solicitado === tipoEmpresaFiltro;
    
    return matchBusqueda && matchEstado && matchTipo;
  });

  const stats = {
    total: solicitudes.length,
    pendientes: solicitudes.filter(s => s.estado === 'pendiente').length,
    aprobadas: solicitudes.filter(s => s.estado === 'aprobada').length,
    rechazadas: solicitudes.filter(s => s.estado === 'rechazada').length,
  };

  const getBadgeEstado = (estado: string) => {
    if (estado === 'pendiente') return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-300">Pendiente</span>;
    if (estado === 'aprobada') return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-300">Aprobada</span>;
    if (estado === 'rechazada') return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-300">Rechazada</span>;
    return null;
  };

  const getIconoTipoEmpresa = (tipo: string) => {
    if (tipo === 'planta') return 'Planta';
    if (tipo === 'transporte') return 'Transporte';
    if (tipo === 'cliente') return 'Cliente';
    return 'Empresa';
  };

  const getRolesDisponibles = (tipoEmpresa: string) => {
    switch (tipoEmpresa) {
      case 'planta':
        return [
          { value: 'coordinador', label: '👔 Coordinador' },
          { value: 'operador_carga', label: '📦 Operador de Carga' },
          { value: 'control_acceso', label: '🚪 Control de Acceso' },
          { value: 'balanza', label: '⚖️ Balanza' }
        ];
      case 'transporte':
        return [
          { value: 'gerente', label: '👔 Gerente' },
          { value: 'despachante', label: '📋 Despachante' }
        ];
      case 'cliente':
        return [
          { value: 'comprador', label: '🛒 Comprador' },
          { value: 'administrativo', label: '📊 Administrativo' }
        ];
      default:
        return [];
    }
  };

  const generarPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const abrirModalAprobar = (solicitud: Solicitud) => {
    setSolicitudSeleccionada(solicitud);
    setModalAprobando(true);
    setRolInicial('');
  };

  const abrirModalRechazar = (solicitud: Solicitud) => {
    setSolicitudSeleccionada(solicitud);
    setModalRechazando(true);
    setNotasRechazo('');
  };

  const aprobarSolicitud = async () => {
    if (!solicitudSeleccionada || !rolInicial) {
      alert('Debe seleccionar un rol inicial');
      return;
    }

    setProcesando(true);
    const passwordTemporal = generarPassword();

    try {
      const response = await fetch('/api/solicitudes/aprobar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solicitud_id: solicitudSeleccionada.id,
          rol_inicial: rolInicial,
          password_temporal: passwordTemporal
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al aprobar solicitud');
      }

      alert(`✅ Solicitud aprobada exitosamente\n\nEmpresa: ${result.empresa.nombre}\nUsuario: ${result.usuario.email}\nPassword: ${passwordTemporal}\n\n⚠️ IMPORTANTE: Guarda este password, el usuario lo necesita para iniciar sesión.`);
      
      setModalAprobando(false);
      setSolicitudSeleccionada(null);
      cargarSolicitudes();
    } catch (error: any) {
      console.error('Error aprobando solicitud:', error);
      alert('❌ Error: ' + error.message);
    } finally {
      setProcesando(false);
    }
  };

  const rechazarSolicitud = async () => {
    if (!solicitudSeleccionada || !notasRechazo.trim()) {
      alert('Debe ingresar una razón para el rechazo');
      return;
    }

    setProcesando(true);

    try {
      const { error } = await supabase
        .from('solicitudes_registro')
        .update({
          estado: 'rechazada',
          notas_admin: `RECHAZADA: ${notasRechazo}`
        })
        .eq('id', solicitudSeleccionada.id);

      if (error) throw error;

      alert('❌ Solicitud rechazada');
      setModalRechazando(false);
      setSolicitudSeleccionada(null);
      cargarSolicitudes();
    } catch (error: any) {
      console.error('Error rechazando solicitud:', error);
      alert('Error: ' + error.message);
    } finally {
      setProcesando(false);
    }
  };

  if (loading || primaryRole !== 'admin') return null;

  return (
    <div className="flex h-screen bg-[#0a0e1a]">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-50 mb-2">
              Gestion de Solicitudes de Registro
            </h1>
            <p className="text-slate-400">
              Revisa y gestiona las solicitudes de nuevas empresas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
            <div className="bg-[#1b273b] rounded p-2 border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Total</p>
                  <p className="text-3xl font-bold text-slate-50">{stats.total}</p>
                </div>
                <DocumentTextIcon className="h-10 w-10 text-slate-400" />
              </div>
            </div>
            <div className="bg-[#1b273b] rounded-lg p-6 border border-yellow-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-300 text-sm mb-1">Pendientes</p>
                  <p className="text-3xl font-bold text-yellow-300">{stats.pendientes}</p>
                </div>
                <ClockIcon className="h-10 w-10 text-yellow-300" />
              </div>
            </div>
            <div className="bg-[#1b273b] rounded-lg p-6 border border-green-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-300 text-sm mb-1">Aprobadas</p>
                  <p className="text-3xl font-bold text-green-300">{stats.aprobadas}</p>
                </div>
                <CheckCircleIcon className="h-10 w-10 text-green-300" />
              </div>
            </div>
            <div className="bg-[#1b273b] rounded-lg p-6 border border-red-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-300 text-sm mb-1">Rechazadas</p>
                  <p className="text-3xl font-bold text-red-300">{stats.rechazadas}</p>
                </div>
                <XCircleIcon className="h-10 w-10 text-red-300" />
              </div>
            </div>
          </div>

          <div className="bg-[#1b273b] rounded p-2 border border-slate-700 mb-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, email, empresa o CUIT..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#0a0e1a] border border-slate-700 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <select
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value)}
                className="px-4 py-2 bg-[#0a0e1a] border border-slate-700 rounded-lg text-slate-50 focus:outline-none focus:border-cyan-500"
              >
                <option value="todas">Todos los estados</option>
                <option value="pendiente">Pendientes</option>
                <option value="aprobada">Aprobadas</option>
                <option value="rechazada">Rechazadas</option>
              </select>
              <select
                value={tipoEmpresaFiltro}
                onChange={(e) => setTipoEmpresaFiltro(e.target.value)}
                className="px-4 py-2 bg-[#0a0e1a] border border-slate-700 rounded-lg text-slate-50 focus:outline-none focus:border-cyan-500"
              >
                <option value="todas">Todos los tipos</option>
                <option value="planta">Plantas</option>
                <option value="transporte">Transportes</option>
                <option value="cliente">Clientes</option>
              </select>
            </div>
          </div>

          {loadingSolicitudes ? (
            <div className="text-center py-12">
              <div className="text-slate-400">Cargando solicitudes...</div>
            </div>
          ) : solicitudesFiltradas.length === 0 ? (
            <div className="bg-[#1b273b] rounded-lg p-12 text-center border border-slate-700">
              <DocumentTextIcon className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No hay solicitudes que coincidan con los filtros</p>
            </div>
          ) : (
            <div className="space-y-4">
              {solicitudesFiltradas.map((solicitud) => (
                <div key={solicitud.id} className="bg-[#1b273b] rounded p-2 border border-slate-700">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-slate-50">{solicitud.nombre_completo}</h3>
                        {getBadgeEstado(solicitud.estado)}
                      </div>
                      <p className="text-cyan-400 text-sm mb-1">{solicitud.empresa_nombre}</p>
                      <p className="text-slate-500 text-sm">CUIT: {solicitud.empresa_cuit} | Tipo: {getIconoTipoEmpresa(solicitud.tipo_empresa_solicitado)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-slate-400 text-sm mb-1">Email</p>
                      <p className="text-slate-50">{solicitud.email}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm mb-1">Telefono</p>
                      <p className="text-slate-50">{solicitud.telefono}</p>
                    </div>
                  </div>
                  <div className="mb-4">
                    <p className="text-slate-400 text-sm mb-2">Motivo de la solicitud</p>
                    <p className="text-slate-50 bg-[#0a0e1a] p-3 rounded-lg">{solicitud.motivo}</p>
                  </div>
                  {solicitud.notas_admin && (
                    <div className="mb-4">
                      <p className="text-slate-400 text-sm mb-2">Notas del administrador</p>
                      <p className="text-slate-300 bg-slate-800 p-3 rounded-lg text-sm">{solicitud.notas_admin}</p>
                    </div>
                  )}
                  {solicitud.estado === 'pendiente' && (
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => abrirModalAprobar(solicitud)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold"
                      >
                        ✅ Aprobar
                      </button>
                      <button
                        onClick={() => abrirModalRechazar(solicitud)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold"
                      >
                        ❌ Rechazar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Aprobar */}
      {modalAprobando && solicitudSeleccionada && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1b273b] rounded-lg p-8 max-w-md w-full border border-slate-700">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircleIcon className="h-8 w-8 text-green-400" />
              <h2 className="text-2xl font-bold text-slate-50">Aprobar Solicitud</h2>
            </div>

            <div className="mb-6">
              <p className="text-slate-300 mb-2">Empresa: <span className="font-semibold text-cyan-400">{solicitudSeleccionada.empresa_nombre}</span></p>
              <p className="text-slate-300 mb-2">Usuario: <span className="font-semibold">{solicitudSeleccionada.nombre_completo}</span></p>
              <p className="text-slate-300">Email: <span className="font-semibold">{solicitudSeleccionada.email}</span></p>
            </div>

            <div className="mb-6">
              <label className="block text-slate-300 mb-2 font-semibold">Rol Inicial *</label>
              <select
                value={rolInicial}
                onChange={(e) => setRolInicial(e.target.value)}
                className="w-full px-4 py-3 bg-[#0a0e1a] border border-slate-700 rounded-lg text-slate-50 focus:outline-none focus:border-cyan-500"
              >
                <option value="">Selecciona un rol...</option>
                {getRolesDisponibles(solicitudSeleccionada.tipo_empresa_solicitado).map(rol => (
                  <option key={rol.value} value={rol.value}>{rol.label}</option>
                ))}
              </select>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
              <p className="text-yellow-300 text-sm mb-1">⚠️ Password Temporal</p>
              <p className="text-slate-300 text-xs">Se generará automáticamente y se mostrará al confirmar</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setModalAprobando(false);
                  setSolicitudSeleccionada(null);
                }}
                disabled={procesando}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={aprobarSolicitud}
                disabled={procesando || !rolInicial}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {procesando ? 'Procesando...' : 'Confirmar Aprobación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rechazar */}
      {modalRechazando && solicitudSeleccionada && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1b273b] rounded-lg p-8 max-w-md w-full border border-slate-700">
            <div className="flex items-center gap-3 mb-6">
              <XCircleIcon className="h-8 w-8 text-red-400" />
              <h2 className="text-2xl font-bold text-slate-50">Rechazar Solicitud</h2>
            </div>

            <div className="mb-6">
              <p className="text-slate-300 mb-2">Empresa: <span className="font-semibold text-cyan-400">{solicitudSeleccionada.empresa_nombre}</span></p>
              <p className="text-slate-300">Usuario: <span className="font-semibold">{solicitudSeleccionada.nombre_completo}</span></p>
            </div>

            <div className="mb-6">
              <label className="block text-slate-300 mb-2 font-semibold">Razón del Rechazo *</label>
              <textarea
                value={notasRechazo}
                onChange={(e) => setNotasRechazo(e.target.value)}
                placeholder="Ingresa el motivo por el cual se rechaza esta solicitud..."
                rows={4}
                className="w-full px-4 py-3 bg-[#0a0e1a] border border-slate-700 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setModalRechazando(false);
                  setSolicitudSeleccionada(null);
                }}
                disabled={procesando}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={rechazarSolicitud}
                disabled={procesando || !notasRechazo.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {procesando ? 'Procesando...' : 'Confirmar Rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
