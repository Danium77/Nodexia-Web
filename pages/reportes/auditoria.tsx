import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/layout/AdminLayout';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import {
  DocumentTextIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  UserIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface AuditoriaRecord {
  id: string;
  viaje_id: string;
  despacho_id: string;
  pedido_id: string;
  accion: string;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  usuario_id: string;
  usuario_nombre: string;
  usuario_rol: string;
  motivo: string | null;
  recursos_antes: any;
  recursos_despues: any;
  metadata: any;
  timestamp: string;
  ip_address: string | null;
  user_agent: string | null;
}

const ReporteAuditoria = () => {
  const { user, hasAnyRole } = useUserRole();
  const [registros, setRegistros] = useState<AuditoriaRecord[]>([]);
  const [filteredRegistros, setFilteredRegistros] = useState<AuditoriaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [accionFilter, setAccionFilter] = useState('');
  const [usuarioFilter, setUsuarioFilter] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  // Listas para filtros
  const [acciones, setAcciones] = useState<string[]>([]);
  const [usuarios, setUsuarios] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadAuditoriaRecords();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, fechaDesde, fechaHasta, accionFilter, usuarioFilter, registros]);

  const loadAuditoriaRecords = async () => {
    try {
      setLoading(true);
      setError('');

      // Verificar permisos
      if (!hasAnyRole(['super_admin', 'coordinador', 'transporte'] as any[])) {
        setError('No tienes permisos para ver los reportes de auditoría');
        return;
      }

      console.log('📊 Cargando registros de auditoría...');

      const { data, error: queryError } = await supabase
        .from('viajes_auditoria')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500); // Limitar a 500 registros más recientes

      if (queryError) throw queryError;

      console.log('✅ Registros cargados:', data?.length || 0);

      setRegistros(data || []);

      // Extraer valores únicos para filtros
      const uniqueAcciones = [...new Set((data || []).map(r => r.accion).filter(Boolean))];
      const uniqueUsuarios = [...new Set((data || []).map(r => r.usuario_nombre).filter(Boolean))];
      
      setAcciones(uniqueAcciones);
      setUsuarios(uniqueUsuarios);

    } catch (err: any) {
      console.error('Error cargando auditoría:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...registros];

    // Filtro por búsqueda de texto
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.pedido_id?.toLowerCase().includes(term) ||
          r.despacho_id?.toLowerCase().includes(term) ||
          r.usuario_nombre?.toLowerCase().includes(term) ||
          r.motivo?.toLowerCase().includes(term) ||
          r.accion?.toLowerCase().includes(term)
      );
    }

    // Filtro por fecha desde
    if (fechaDesde) {
      const desde = new Date(fechaDesde);
      filtered = filtered.filter((r) => new Date(r.timestamp) >= desde);
    }

    // Filtro por fecha hasta
    if (fechaHasta) {
      const hasta = new Date(fechaHasta + 'T23:59:59');
      filtered = filtered.filter((r) => new Date(r.timestamp) <= hasta);
    }

    // Filtro por acción
    if (accionFilter) {
      filtered = filtered.filter((r) => r.accion === accionFilter);
    }

    // Filtro por usuario
    if (usuarioFilter) {
      filtered = filtered.filter((r) => r.usuario_nombre === usuarioFilter);
    }

    setFilteredRegistros(filtered);
  };

  const getAccionBadge = (accion: string) => {
    const badges: Record<string, { color: string; text: string; emoji: string }> = {
      creacion: { color: 'bg-blue-900 text-blue-200', text: 'Creación', emoji: '➕' },
      asignacion_transporte: { color: 'bg-cyan-900 text-cyan-200', text: 'Asignación Transporte', emoji: '🚚' },
      asignacion_chofer: { color: 'bg-green-900 text-green-200', text: 'Asignación Chofer', emoji: '👤' },
      asignacion_camion: { color: 'bg-purple-900 text-purple-200', text: 'Asignación Camión', emoji: '🚛' },
      cambio_estado: { color: 'bg-yellow-900 text-yellow-200', text: 'Cambio Estado', emoji: '🔄' },
      cancelacion: { color: 'bg-red-900 text-red-200', text: 'Cancelación', emoji: '❌' },
      modificacion: { color: 'bg-orange-900 text-orange-200', text: 'Modificación', emoji: '✏️' },
    };

    const badge = badges[accion] || { color: 'bg-gray-900 text-gray-200', text: accion, emoji: '📋' };

    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${badge.color}`}>
        {badge.emoji} {badge.text}
      </span>
    );
  };

  const exportToCSV = () => {
    // Preparar datos para exportar
    const csvData = filteredRegistros.map(r => ({
      Fecha: new Date(r.timestamp).toLocaleString('es-AR'),
      Pedido: r.pedido_id,
      Despacho: r.despacho_id,
      Acción: r.accion,
      'Estado Anterior': r.estado_anterior || '-',
      'Estado Nuevo': r.estado_nuevo || '-',
      Usuario: r.usuario_nombre,
      Rol: r.usuario_rol,
      Motivo: r.motivo || '-'
    }));

    // Convertir a CSV
    const headers = Object.keys(csvData[0] || {});
    const csv = [
      headers.join(','),
      ...csvData.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row];
          // Escapar comas y comillas
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    // Crear blob y descargar
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `auditoria-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!hasAnyRole(['super_admin', 'coordinador', 'transporte'] as any[])) {
    return (
      <AdminLayout pageTitle="Reportes de Auditoría">
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 text-center">
          <p className="text-red-400">No tienes permisos para acceder a esta página</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Reportes de Auditoría">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Auditoría de Viajes</h1>
            <p className="text-gray-400">
              Historial completo de cambios en los viajes del sistema
            </p>
          </div>
          <button
            onClick={exportToCSV}
            disabled={filteredRegistros.length === 0}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            Exportar CSV
          </button>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#1b273b] rounded-lg p-4 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Registros</p>
                <p className="text-2xl font-bold text-white">{registros.length}</p>
              </div>
              <DocumentTextIcon className="h-8 w-8 text-cyan-400" />
            </div>
          </div>

          <div className="bg-[#1b273b] rounded-lg p-4 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Filtrados</p>
                <p className="text-2xl font-bold text-white">{filteredRegistros.length}</p>
              </div>
              <FunnelIcon className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-[#1b273b] rounded-lg p-4 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Últimas 24h</p>
                <p className="text-2xl font-bold text-white">
                  {registros.filter(r => {
                    const diff = Date.now() - new Date(r.timestamp).getTime();
                    return diff < 24 * 60 * 60 * 1000;
                  }).length}
                </p>
              </div>
              <ClockIcon className="h-8 w-8 text-green-400" />
            </div>
          </div>

          <div className="bg-[#1b273b] rounded-lg p-4 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Usuarios Activos</p>
                <p className="text-2xl font-bold text-white">
                  {new Set(registros.map(r => r.usuario_id)).size}
                </p>
              </div>
              <UserIcon className="h-8 w-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-[#1b273b] rounded-lg p-4 border border-gray-800">
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Buscar</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Pedido, usuario, motivo..."
                    className="w-full pl-10 pr-4 py-2 bg-[#0a0e1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Fecha Desde</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full px-4 py-2 bg-[#0a0e1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Fecha Hasta</label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full px-4 py-2 bg-[#0a0e1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Acción</label>
                <select
                  value={accionFilter}
                  onChange={(e) => setAccionFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-[#0a0e1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Todas</option>
                  {acciones.map((accion) => (
                    <option key={accion} value={accion}>
                      {accion}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Usuario</label>
                <select
                  value={usuarioFilter}
                  onChange={(e) => setUsuarioFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-[#0a0e1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Todos</option>
                  {usuarios.map((usuario) => (
                    <option key={usuario} value={usuario}>
                      {usuario}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Botón limpiar filtros */}
          {(searchTerm || fechaDesde || fechaHasta || accionFilter || usuarioFilter) && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFechaDesde('');
                  setFechaHasta('');
                  setAccionFilter('');
                  setUsuarioFilter('');
                }}
                className="text-sm text-gray-400 hover:text-white"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {/* Tabla de registros */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
            <p className="text-gray-400 mt-4">Cargando registros...</p>
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        ) : filteredRegistros.length === 0 ? (
          <div className="bg-[#1b273b] rounded-lg p-12 text-center border border-gray-800">
            <DocumentTextIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No se encontraron registros</p>
          </div>
        ) : (
          <div className="bg-[#1b273b] rounded-lg border border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0a0e1a]">
                  <tr className="text-left text-gray-400 text-sm">
                    <th className="py-3 px-4">Fecha/Hora</th>
                    <th className="py-3 px-4">Pedido</th>
                    <th className="py-3 px-4">Acción</th>
                    <th className="py-3 px-4">Estado Anterior</th>
                    <th className="py-3 px-4">Estado Nuevo</th>
                    <th className="py-3 px-4">Usuario</th>
                    <th className="py-3 px-4">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistros.map((registro) => (
                    <tr
                      key={registro.id}
                      className="border-t border-gray-800 hover:bg-[#0a0e1a] transition-colors"
                    >
                      <td className="py-3 px-4 text-white text-sm">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-gray-400" />
                          <div>
                            <p>{new Date(registro.timestamp).toLocaleDateString('es-AR')}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(registro.timestamp).toLocaleTimeString('es-AR')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-white font-medium text-sm">
                        {registro.pedido_id}
                        <p className="text-xs text-gray-400 mt-1">
                          Viaje #{registro.despacho_id?.split('-').pop() || 'N/A'}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        {getAccionBadge(registro.accion)}
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm">
                        {registro.estado_anterior ? (
                          <span className="px-2 py-1 bg-gray-800 rounded text-xs">
                            {registro.estado_anterior}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm">
                        {registro.estado_nuevo ? (
                          <span className="px-2 py-1 bg-gray-800 rounded text-xs">
                            {registro.estado_nuevo}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-4 text-white text-sm">
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4 text-gray-400" />
                          <div>
                            <p>{registro.usuario_nombre}</p>
                            <p className="text-xs text-gray-400">{registro.usuario_rol}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm max-w-xs truncate">
                        {registro.motivo || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación info */}
            <div className="bg-[#0a0e1a] px-4 py-3 border-t border-gray-800">
              <p className="text-sm text-gray-400">
                Mostrando {filteredRegistros.length} de {registros.length} registros
                {filteredRegistros.length < registros.length && ' (filtrados)'}
              </p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ReporteAuditoria;
