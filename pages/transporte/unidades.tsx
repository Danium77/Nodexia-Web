import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/layout/AdminLayout';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import EditarUnidadModal from '../../components/Transporte/EditarUnidadModal';
import { UnidadDocStatusSummary, type DocStatusData } from '../../components/Documentacion/DocStatusBadge';
import {
  TruckIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  MapPinIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface UnidadOperativa {
  id: string;
  codigo: string;
  nombre: string;
  chofer_id: string;
  camion_id: string;
  acoplado_id?: string;
  activo: boolean;
  horas_conducidas_hoy: number;
  necesita_descanso_obligatorio: boolean;
  notas?: string;
  // Datos de la vista
  chofer_nombre: string;
  chofer_apellido: string;
  chofer_telefono?: string;
  camion_patente: string;
  camion_marca?: string;
  camion_modelo?: string;
  acoplado_patente?: string;
  ubicacion_actual?: string;
  ciudad_actual?: string;
  provincia_actual?: string;
}

const UnidadesOperativas = () => {
  const { user, userEmpresas } = useUserRole();
  const [unidades, setUnidades] = useState<UnidadOperativa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'disponibles' | 'descanso' | 'inactivas'>('todas');
  
  // Estados del modal de edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUnidad, setSelectedUnidad] = useState<UnidadOperativa | null>(null);
  
  // Estado de documentación por entidad
  const [docStatuses, setDocStatuses] = useState<Record<string, DocStatusData>>({});
  const [loadingDocs, setLoadingDocs] = useState(false);

  useEffect(() => {
    if (user && userEmpresas) {
      loadUnidades();
    }
  }, [user, userEmpresas]);

  // Cargar estado de docs cuando las unidades estén listas
  useEffect(() => {
    if (unidades.length > 0) {
      loadDocStatuses();
    }
  }, [unidades]);

  const loadUnidades = async () => {
    try {
      setLoading(true);
      setError('');

      const empresaTransporte = userEmpresas?.find(
        (rel: any) => rel.empresas?.tipo_empresa === 'transporte'
      );

      if (!empresaTransporte) {
        setError('No tienes una empresa de transporte asignada');
        return;
      }

      const { data, error: err } = await supabase
        .from('vista_disponibilidad_unidades')
        .select('*')
        .eq('empresa_id', empresaTransporte.empresa_id)
        .order('codigo', { ascending: true });

      if (err) throw err;

      setUnidades(data || []);
    } catch (err: any) {
      console.error('Error al cargar unidades:', err);
      setError(err.message || 'Error al cargar unidades');
    } finally {
      setLoading(false);
    }
  };

  const loadDocStatuses = async () => {
    try {
      setLoadingDocs(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Armar lista de entidades a consultar
      const entidades: { tipo: string; id: string }[] = [];
      for (const u of unidades) {
        if (u.chofer_id) entidades.push({ tipo: 'chofer', id: u.chofer_id });
        if (u.camion_id) entidades.push({ tipo: 'camion', id: u.camion_id });
        if (u.acoplado_id) entidades.push({ tipo: 'acoplado', id: u.acoplado_id });
      }

      if (entidades.length === 0) return;

      const res = await fetch('/api/documentacion/estado-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ entidades }),
      });

      if (res.ok) {
        const json = await res.json();
        setDocStatuses(json.data || {});
      }
    } catch (err) {
      console.error('Error al cargar estado de docs:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const toggleActivo = async (unidadId: string, nuevoEstado: boolean) => {
    try {
      const { error: err } = await supabase
        .from('unidades_operativas')
        .update({ activo: nuevoEstado })
        .eq('id', unidadId);

      if (err) throw err;

      await loadUnidades();
    } catch (err: any) {
      console.error('Error al actualizar unidad:', err);
      alert('Error al actualizar unidad: ' + err.message);
    }
  };

  const handleEditarUnidad = (unidad: UnidadOperativa) => {
    setSelectedUnidad(unidad);
    setIsEditModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setSelectedUnidad(null);
  };

  const handleModalSuccess = () => {
    loadUnidades();
    handleCloseModal();
  };

  const getEstadoBadge = (unidad: UnidadOperativa) => {
    if (!unidad.activo) {
      return <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-500/20 text-gray-400">❌ Inactiva</span>;
    }
    
    if (unidad.necesita_descanso_obligatorio) {
      return <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-500/20 text-red-400">🛑 Descanso Obligatorio</span>;
    }
    
    if (unidad.horas_conducidas_hoy >= 7) {
      return <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-400">⚠️ Cerca del Límite</span>;
    }
    
    return <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-400">✅ Disponible</span>;
  };

  const unidadesFiltradas = unidades.filter(unidad => {
    if (filtroEstado === 'todas') return true;
    if (filtroEstado === 'disponibles') return unidad.activo && !unidad.necesita_descanso_obligatorio && unidad.horas_conducidas_hoy < 7;
    if (filtroEstado === 'descanso') return unidad.necesita_descanso_obligatorio;
    if (filtroEstado === 'inactivas') return !unidad.activo;
    return true;
  });

  // Métricas
  const totalUnidades = unidades.length;
  const disponibles = unidades.filter(u => u.activo && !u.necesita_descanso_obligatorio && u.horas_conducidas_hoy < 7).length;
  const enDescanso = unidades.filter(u => u.necesita_descanso_obligatorio).length;
  const inactivas = unidades.filter(u => !u.activo).length;

  // Métricas de documentación
  const docsConProblemas = unidades.filter(u => {
    const ch = docStatuses[`chofer:${u.chofer_id}`];
    const ca = docStatuses[`camion:${u.camion_id}`];
    const ac = u.acoplado_id ? docStatuses[`acoplado:${u.acoplado_id}`] : null;
    return [ch, ca, ac].filter(Boolean).some(s => s!.estado === 'danger' || s!.estado === 'missing');
  }).length;
  const docsOk = unidades.filter(u => {
    const ch = docStatuses[`chofer:${u.chofer_id}`];
    const ca = docStatuses[`camion:${u.camion_id}`];
    if (!ch || !ca) return false;
    const ac = u.acoplado_id ? docStatuses[`acoplado:${u.acoplado_id}`] : null;
    return [ch, ca, ac].filter(Boolean).every(s => s!.estado === 'ok');
  }).length;

  if (loading) {
    return (
      <AdminLayout pageTitle="Unidades Operativas">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="mt-4 text-gray-400">Cargando unidades operativas...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Unidades Operativas">
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <TruckIcon className="h-8 w-8 text-indigo-400" />
                  Unidades Operativas
                </h1>
                <p className="mt-2 text-sm text-gray-400">
                  Gestión de equipos completos (Chofer + Camión + Acoplado)
                </p>
              </div>
              
              <button
                onClick={() => alert('Funcionalidad próximamente')}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg flex items-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                Nueva Unidad
              </button>
            </div>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 border border-gray-700 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Unidades</p>
                  <p className="text-3xl font-bold text-white mt-1">{totalUnidades}</p>
                </div>
                <TruckIcon className="h-12 w-12 text-indigo-400 opacity-50" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-900/20 to-gray-900 rounded-xl p-5 border border-green-700/30 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Disponibles</p>
                  <p className="text-3xl font-bold text-green-400 mt-1">{disponibles}</p>
                </div>
                <CheckCircleIcon className="h-12 w-12 text-green-400 opacity-50" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-900/20 to-gray-900 rounded-xl p-5 border border-red-700/30 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">En Descanso</p>
                  <p className="text-3xl font-bold text-red-400 mt-1">{enDescanso}</p>
                </div>
                <ClockIcon className="h-12 w-12 text-red-400 opacity-50" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-700/20 to-gray-900 rounded-xl p-5 border border-gray-600/30 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Inactivas</p>
                  <p className="text-3xl font-bold text-gray-400 mt-1">{inactivas}</p>
                </div>
                <XCircleIcon className="h-12 w-12 text-gray-400 opacity-50" />
              </div>
            </div>

            <div className={`bg-gradient-to-br ${docsConProblemas > 0 ? 'from-orange-900/20' : 'from-green-900/20'} to-gray-900 rounded-xl p-5 border ${docsConProblemas > 0 ? 'border-orange-700/30' : 'border-green-700/30'} shadow-xl`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Docs OK</p>
                  <p className={`text-3xl font-bold mt-1 ${docsConProblemas > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                    {loadingDocs ? '...' : `${docsOk}/${totalUnidades}`}
                  </p>
                </div>
                <DocumentTextIcon className={`h-12 w-12 opacity-50 ${docsConProblemas > 0 ? 'text-orange-400' : 'text-green-400'}`} />
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="mb-6 flex gap-2 flex-wrap">
            {(['todas', 'disponibles', 'descanso', 'inactivas'] as const).map(estado => (
              <button
                key={estado}
                onClick={() => setFiltroEstado(estado)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filtroEstado === estado
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {estado === 'todas' && `Todas (${totalUnidades})`}
                {estado === 'disponibles' && `Disponibles (${disponibles})`}
                {estado === 'descanso' && `En Descanso (${enDescanso})`}
                {estado === 'inactivas' && `Inactivas (${inactivas})`}
              </button>
            ))}
          </div>

          {/* Tabla */}
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          <div className="bg-gray-800/50 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Chofer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Camión
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Acoplado
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Docs
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Horas Hoy
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800/30 divide-y divide-gray-700">
                  {unidadesFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
                        <TruckIcon className="mx-auto h-12 w-12 text-gray-600" />
                        <p className="mt-2 text-gray-400">No hay unidades para mostrar</p>
                      </td>
                    </tr>
                  ) : (
                    unidadesFiltradas.map((unidad) => (
                      <tr key={unidad.id} className="hover:bg-gray-700/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-bold text-indigo-400">
                            {unidad.codigo || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-white font-medium">
                            {unidad.nombre}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="text-white font-medium">
                              {unidad.chofer_nombre} {unidad.chofer_apellido}
                            </div>
                            {unidad.chofer_telefono && (
                              <div className="text-gray-400 text-xs">
                                {unidad.chofer_telefono}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="text-white font-medium">
                              {unidad.camion_patente}
                            </div>
                            <div className="text-gray-400 text-xs">
                              {unidad.camion_marca} {unidad.camion_modelo}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-300">
                            {unidad.acoplado_patente || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <UnidadDocStatusSummary
                            choferStatus={docStatuses[`chofer:${unidad.chofer_id}`] || null}
                            camionStatus={docStatuses[`camion:${unidad.camion_id}`] || null}
                            acopladoStatus={unidad.acoplado_id ? (docStatuses[`acoplado:${unidad.acoplado_id}`] || null) : null}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${
                            unidad.horas_conducidas_hoy >= 9 ? 'text-red-400' :
                            unidad.horas_conducidas_hoy >= 7 ? 'text-yellow-400' :
                            'text-green-400'
                          }`}>
                            {unidad.horas_conducidas_hoy.toFixed(1)}h / 9h
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getEstadoBadge(unidad)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditarUnidad(unidad)}
                              className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg hover:bg-indigo-600/30 transition-colors"
                              title="Editar"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => toggleActivo(unidad.id, !unidad.activo)}
                              className={`p-2 rounded-lg transition-colors ${
                                unidad.activo
                                  ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                                  : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                              }`}
                              title={unidad.activo ? 'Desactivar' : 'Activar'}
                            >
                              {unidad.activo ? (
                                <XCircleIcon className="h-4 w-4" />
                              ) : (
                                <CheckCircleIcon className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Info Normativa */}
          <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <ClockIcon className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-300">
                <p className="font-medium mb-1">Normativa de Descanso (Argentina)</p>
                <p className="text-blue-200/80">
                  • Máximo 9 horas de conducción continua<br />
                  • Descanso obligatorio de 12 horas consecutivas después de alcanzar el límite<br />
                  • Las unidades en descanso obligatorio no pueden ser asignadas a nuevos viajes
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Edición */}
      {selectedUnidad && (
        <EditarUnidadModal
          isOpen={isEditModalOpen}
          onClose={handleCloseModal}
          unidad={selectedUnidad}
          onSuccess={handleModalSuccess}
        />
      )}
    </AdminLayout>
  );
};

export default UnidadesOperativas;
