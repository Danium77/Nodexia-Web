import React, { useState } from 'react';
import { useLogsAdmin } from '../../lib/hooks/useSuperAdmin';
import type { FiltrosLogs } from '../../types/superadmin';

export default function LogsManager() {
  const { logs, loading } = useLogsAdmin();
  const [filtros, setFiltros] = useState<FiltrosLogs>({
    fecha_desde: '',
    fecha_hasta: ''
  });

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-AR');
  };

  const getAccionColor = (accion: string) => {
    switch (accion) {
      case 'crear_empresa': return 'bg-green-100 text-green-800';
      case 'actualizar_empresa': return 'bg-blue-100 text-blue-800';
      case 'desactivar_empresa': return 'bg-red-100 text-red-800';
      case 'activar_empresa': return 'bg-green-100 text-green-800';
      case 'cambiar_plan': return 'bg-purple-100 text-purple-800';
      case 'procesar_pago': return 'bg-yellow-100 text-yellow-800';
      case 'crear_usuario': return 'bg-cyan-100 text-cyan-800';
      case 'actualizar_usuario': return 'bg-blue-100 text-blue-800';
      case 'eliminar_usuario': return 'bg-red-100 text-red-800';
      case 'login': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAccionLabel = (accion: string) => {
    switch (accion) {
      case 'crear_empresa': return 'Crear Empresa';
      case 'actualizar_empresa': return 'Actualizar Empresa';
      case 'desactivar_empresa': return 'Desactivar Empresa';
      case 'activar_empresa': return 'Activar Empresa';
      case 'cambiar_plan': return 'Cambiar Plan';
      case 'procesar_pago': return 'Procesar Pago';
      case 'crear_usuario': return 'Crear Usuario';
      case 'actualizar_usuario': return 'Actualizar Usuario';
      case 'eliminar_usuario': return 'Eliminar Usuario';
      case 'login': return 'Inicio de Sesión';
      default: return accion;
    }
  };

  // Aplicar filtros
  const logsFiltrados = logs.filter(log => {
    if (filtros.accion && log.accion !== filtros.accion) return false;
    if (filtros.admin_id && log.admin_id !== filtros.admin_id) return false;
    if (filtros.fecha_desde && new Date(log.fecha_creacion) < new Date(filtros.fecha_desde)) return false;
    if (filtros.fecha_hasta && new Date(log.fecha_creacion) > new Date(filtros.fecha_hasta)) return false;
    return true;
  });

  const resumenLogs = {
    total: logsFiltrados.length,
    hoy: logsFiltrados.filter(log => {
      const hoy = new Date();
      const fechaLog = new Date(log.fecha_creacion);
      return fechaLog.toDateString() === hoy.toDateString();
    }).length,
    esta_semana: logsFiltrados.filter(log => {
      const hoy = new Date();
      const semanaAtras = new Date();
      semanaAtras.setDate(hoy.getDate() - 7);
      const fechaLog = new Date(log.fecha_creacion);
      return fechaLog >= semanaAtras;
    }).length,
    acciones_criticas: logsFiltrados.filter(log => 
      ['desactivar_empresa', 'eliminar_usuario', 'procesar_pago'].includes(log.accion)
    ).length
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
        <p className="text-gray-600">Cargando logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{resumenLogs.total}</div>
          <div className="text-sm text-blue-700">Total Logs</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{resumenLogs.hoy}</div>
          <div className="text-sm text-green-700">Actividad Hoy</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{resumenLogs.esta_semana}</div>
          <div className="text-sm text-purple-700">Esta Semana</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{resumenLogs.acciones_criticas}</div>
          <div className="text-sm text-orange-700">Acciones Críticas</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Acción
            </label>
            <select
              value={filtros.accion || ''}
              onChange={(e) => setFiltros({...filtros, accion: e.target.value as any})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todas las acciones</option>
              <option value="crear_empresa">Crear Empresa</option>
              <option value="actualizar_empresa">Actualizar Empresa</option>
              <option value="desactivar_empresa">Desactivar Empresa</option>
              <option value="activar_empresa">Activar Empresa</option>
              <option value="cambiar_plan">Cambiar Plan</option>
              <option value="procesar_pago">Procesar Pago</option>
              <option value="crear_usuario">Crear Usuario</option>
              <option value="actualizar_usuario">Actualizar Usuario</option>
              <option value="eliminar_usuario">Eliminar Usuario</option>
              <option value="login">Inicio de Sesión</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Desde
            </label>
            <input
              type="date"
              value={filtros.fecha_desde}
              onChange={(e) => setFiltros({...filtros, fecha_desde: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hasta
            </label>
            <input
              type="date"
              value={filtros.fecha_hasta}
              onChange={(e) => setFiltros({...filtros, fecha_hasta: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin ID
            </label>
            <input
              type="text"
              value={filtros.admin_id}
              onChange={(e) => setFiltros({...filtros, admin_id: e.target.value})}
              placeholder="Filtrar por admin..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Lista de Logs */}
      <div className="space-y-2">
        {logsFiltrados.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No se encontraron logs con los filtros aplicados
          </div>
        ) : (
          logsFiltrados.map((log) => (
            <div key={log.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAccionColor(log.accion)}`}>
                      {getAccionLabel(log.accion)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDateTime(log.fecha_creacion)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Admin:</span>
                      <span className="ml-2 text-gray-900">{log.admin_email}</span>
                    </div>
                    
                    {log.detalles?.empresa_afectada && (
                      <div>
                        <span className="font-medium text-gray-700">Empresa:</span>
                        <span className="ml-2 text-gray-900">{log.detalles.empresa_afectada}</span>
                      </div>
                    )}
                    
                    {log.detalles?.usuario_afectado && (
                      <div>
                        <span className="font-medium text-gray-700">Usuario:</span>
                        <span className="ml-2 text-gray-900">{log.detalles.usuario_afectado}</span>
                      </div>
                    )}
                    
                    <div>
                      <span className="font-medium text-gray-700">IP:</span>
                      <span className="ml-2 text-gray-900">{log.ip_address}</span>
                    </div>
                  </div>

                  {log.detalles && Object.keys(log.detalles).length > 0 && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-700 text-sm mb-2">Detalles del cambio:</div>
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
                        {JSON.stringify(log.detalles, null, 2)}
                      </pre>
                    </div>
                  )}

                  {log.detalles?.observaciones && (
                    <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                      <div className="font-medium text-yellow-800 text-sm mb-1">Observaciones:</div>
                      <div className="text-sm text-yellow-700">{log.detalles.observaciones}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Paginación simple */}
      {logsFiltrados.length > 50 && (
        <div className="text-center py-4">
          <div className="text-sm text-gray-500">
            Mostrando los primeros 50 logs. Use filtros para refinar la búsqueda.
          </div>
        </div>
      )}
    </div>
  );
}