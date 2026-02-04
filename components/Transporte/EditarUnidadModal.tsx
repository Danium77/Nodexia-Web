import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import { PencilIcon, XMarkIcon, TruckIcon, UserIcon, LinkIcon, ClockIcon } from '@heroicons/react/24/outline';

interface Chofer {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono?: string;
}

interface Camion {
  id: string;
  patente: string;
  marca: string;
  modelo: string;
  anio?: number;
}

interface Acoplado {
  id: string;
  patente: string;
  marca?: string;
  modelo?: string;
}

interface UnidadOperativa {
  id: string;
  nombre: string;
  codigo?: string;
  chofer_id: string;
  chofer_nombre: string;
  chofer_apellido: string;
  camion_id: string;
  camion_patente: string;
  acoplado_id?: string;
  acoplado_patente?: string;
  activo: boolean;
}

interface HistorialCambio {
  id: string;
  tipo_cambio: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  valor_anterior_legible: string | null;
  valor_nuevo_legible: string | null;
  modificado_por_email: string;
  motivo: string | null;
  created_at: string;
}

interface EditarUnidadModalProps {
  isOpen: boolean;
  onClose: () => void;
  unidad: UnidadOperativa;
  onSuccess: () => void;
}

export default function EditarUnidadModal({
  isOpen,
  onClose,
  unidad,
  onSuccess
}: EditarUnidadModalProps) {
  const { userEmpresas } = useUserRole();
  const [activeTab, setActiveTab] = useState<'editar' | 'historial'>('editar');
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [acoplados, setAcoplados] = useState<Acoplado[]>([]);
  const [historial, setHistorial] = useState<HistorialCambio[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  const [formData, setFormData] = useState({
    nombre: unidad.nombre,
    codigo: unidad.codigo || '',
    chofer_id: unidad.chofer_id,
    camion_id: unidad.camion_id,
    acoplado_id: unidad.acoplado_id || '',
    activo: unidad.activo
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<{
    chofer?: string;
    camion?: string;
    acoplado?: string;
  }>({});

  useEffect(() => {
    if (isOpen && userEmpresas) {
      loadRecursos();
      if (activeTab === 'historial') {
        loadHistorial();
      }
    }
  }, [isOpen, userEmpresas, activeTab]);

  const loadRecursos = async () => {
    try {
      const empresaTransporte = userEmpresas?.find(
        (rel: any) => rel.empresas?.tipo_empresa === 'transporte'
      );

      if (!empresaTransporte) {
        setError('No tienes una empresa de transporte asignada');
        return;
      }

      // Cargar choferes disponibles
      const { data: choferesData, error: choferesErr } = await supabase
        .from('choferes')
        .select('id, nombre, apellido, dni, telefono')
        .eq('empresa_id', empresaTransporte.empresa_id)
        .eq('activo', true)
        .order('apellido', { ascending: true });

      if (choferesErr) throw choferesErr;
      setChoferes(choferesData || []);

      // Cargar camiones disponibles
      const { data: camionesData, error: camionesErr } = await supabase
        .from('camiones')
        .select('id, patente, marca, modelo, anio')
        .eq('empresa_id', empresaTransporte.empresa_id)
        .eq('activo', true)
        .order('patente', { ascending: true });

      if (camionesErr) throw camionesErr;
      setCamiones(camionesData || []);

      // Cargar acoplados disponibles
      const { data: acopladosData, error: acopladosErr } = await supabase
        .from('acoplados')
        .select('id, patente, marca, modelo')
        .eq('empresa_id', empresaTransporte.empresa_id)
        .eq('activo', true)
        .order('patente', { ascending: true });

      if (acopladosErr) throw acopladosErr;
      setAcoplados(acopladosData || []);
    } catch (err: any) {
      console.error('Error al cargar recursos:', err);
      setError(err.message || 'Error al cargar recursos');
    }
  };

  const loadHistorial = async () => {
    try {
      setLoadingHistorial(true);
      const { data, error } = await supabase
        .from('vista_historial_unidades')
        .select('*')
        .eq('unidad_operativa_id', unidad.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistorial(data || []);
    } catch (err: any) {
      console.error('Error al cargar historial:', err);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const validateRecurso = async (tipo: 'chofer' | 'camion' | 'acoplado', id: string) => {
    if (!id) return true; // Válido si está vacío (acoplado es opcional)

    try {
      // Verificar si el recurso ya está asignado a otra unidad
      const { data: unidadesExistentes, error } = await supabase
        .from('unidades_operativas')
        .select('id, nombre')
        .eq(tipo + '_id', id)
        .eq('activo', true)
        .neq('id', unidad.id); // Excluir la unidad actual

      if (error) throw error;

      if (unidadesExistentes && unidadesExistentes.length > 0) {
        setValidationErrors((prev) => ({
          ...prev,
          [tipo]: `Este ${tipo} ya está asignado a: ${unidadesExistentes[0].nombre}`
        }));
        return false;
      } else {
        setValidationErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[tipo];
          return newErrors;
        });
        return true;
      }
    } catch (err: any) {
      console.error(`Error al validar ${tipo}:`, err);
      return false;
    }
  };

  const handleChange = async (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Validar en tiempo real
    if (field === 'chofer_id' || field === 'camion_id' || field === 'acoplado_id') {
      if (typeof value === 'string') {
        await validateRecurso(field.replace('_id', '') as any, value);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones finales
    if (!formData.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    if (!formData.chofer_id) {
      setError('Debes seleccionar un chofer');
      return;
    }

    if (!formData.camion_id) {
      setError('Debes seleccionar un camión');
      return;
    }

    // Validar disponibilidad de recursos
    const choferValido = await validateRecurso('chofer', formData.chofer_id);
    const camionValido = await validateRecurso('camion', formData.camion_id);
    const acopadoValido = formData.acoplado_id
      ? await validateRecurso('acoplado', formData.acoplado_id)
      : true;

    if (!choferValido || !camionValido || !acopadoValido) {
      setError('Algunos recursos ya están asignados a otras unidades');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Registrar cambio en historial antes de actualizar
      const cambios: any[] = [];
      if (formData.chofer_id !== unidad.chofer_id) {
        cambios.push({
          tipo_cambio: 'chofer',
          valor_anterior: unidad.chofer_id,
          valor_nuevo: formData.chofer_id
        });
      }
      if (formData.camion_id !== unidad.camion_id) {
        cambios.push({
          tipo_cambio: 'camion',
          valor_anterior: unidad.camion_id,
          valor_nuevo: formData.camion_id
        });
      }
      if (formData.acoplado_id !== unidad.acoplado_id) {
        cambios.push({
          tipo_cambio: 'acoplado',
          valor_anterior: unidad.acoplado_id || null,
          valor_nuevo: formData.acoplado_id || null
        });
      }

      // Guardar historial de cambios
      if (cambios.length > 0) {
        const { data: userData } = await supabase.auth.getUser();
        
        for (const cambio of cambios) {
          await supabase.from('historial_unidades_operativas').insert({
            unidad_operativa_id: unidad.id,
            tipo_cambio: cambio.tipo_cambio,
            valor_anterior: cambio.valor_anterior,
            valor_nuevo: cambio.valor_nuevo,
            modificado_por: userData.user?.id,
            motivo: 'Edición desde modal'
          });
        }
      }

      // Actualizar unidad operativa
      const updateData: any = {
        nombre: formData.nombre.trim(),
        codigo: formData.codigo.trim() || null,
        chofer_id: formData.chofer_id,
        camion_id: formData.camion_id,
        acoplado_id: formData.acoplado_id || null,
        activo: formData.activo,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('unidades_operativas')
        .update(updateData)
        .eq('id', unidad.id);

      if (updateError) throw updateError;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error al actualizar unidad:', err);
      setError(err.message || 'Error al actualizar unidad');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-700 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700 bg-gradient-to-r from-gray-900 to-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <PencilIcon className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Editar Unidad Operativa</h2>
                <p className="text-sm text-gray-400">{unidad.nombre}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('editar')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'editar'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              <PencilIcon className="h-4 w-4 inline mr-2" />
              Editar
            </button>
            <button
              onClick={() => setActiveTab('historial')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'historial'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              <ClockIcon className="h-4 w-4 inline mr-2" />
              Historial
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'editar' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Información básica */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <h3 className="text-white font-bold mb-4">Información Básica</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Nombre de la Unidad *
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => handleChange('nombre', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      placeholder="Ej: Unidad 01"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Código (Opcional)
                    </label>
                    <input
                      type="text"
                      value={formData.codigo}
                      onChange={(e) => handleChange('codigo', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      placeholder="Ej: UO-001"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.activo}
                      onChange={(e) => handleChange('activo', e.target.checked)}
                      className="rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-300">Unidad activa</span>
                  </label>
                </div>
              </div>

              {/* Chofer */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <UserIcon className="h-5 w-5 text-blue-400" />
                  <h3 className="text-white font-bold">Chofer</h3>
                </div>

                <select
                  value={formData.chofer_id}
                  onChange={(e) => handleChange('chofer_id', e.target.value)}
                  className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${
                    validationErrors.chofer ? 'border-red-500' : 'border-gray-600'
                  }`}
                  required
                >
                  <option value="">Seleccionar chofer...</option>
                  {choferes.map((chofer) => (
                    <option key={chofer.id} value={chofer.id}>
                      {chofer.apellido}, {chofer.nombre} - DNI: {chofer.dni}
                    </option>
                  ))}
                </select>

                {validationErrors.chofer && (
                  <p className="mt-2 text-sm text-red-400">⚠️ {validationErrors.chofer}</p>
                )}
              </div>

              {/* Camión */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <TruckIcon className="h-5 w-5 text-green-400" />
                  <h3 className="text-white font-bold">Camión</h3>
                </div>

                <select
                  value={formData.camion_id}
                  onChange={(e) => handleChange('camion_id', e.target.value)}
                  className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${
                    validationErrors.camion ? 'border-red-500' : 'border-gray-600'
                  }`}
                  required
                >
                  <option value="">Seleccionar camión...</option>
                  {camiones.map((camion) => (
                    <option key={camion.id} value={camion.id}>
                      {camion.patente} - {camion.marca} {camion.modelo}{' '}
                      {camion.anio ? `(${camion.anio})` : ''}
                    </option>
                  ))}
                </select>

                {validationErrors.camion && (
                  <p className="mt-2 text-sm text-red-400">⚠️ {validationErrors.camion}</p>
                )}
              </div>

              {/* Acoplado */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <LinkIcon className="h-5 w-5 text-yellow-400" />
                  <h3 className="text-white font-bold">Acoplado (Opcional)</h3>
                </div>

                <select
                  value={formData.acoplado_id}
                  onChange={(e) => handleChange('acoplado_id', e.target.value)}
                  className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${
                    validationErrors.acoplado ? 'border-red-500' : 'border-gray-600'
                  }`}
                >
                  <option value="">Sin acoplado</option>
                  {acoplados.map((acoplado) => (
                    <option key={acoplado.id} value={acoplado.id}>
                      {acoplado.patente}
                      {acoplado.marca && acoplado.modelo && ` - ${acoplado.marca} ${acoplado.modelo}`}
                    </option>
                  ))}
                </select>

                {validationErrors.acoplado && (
                  <p className="mt-2 text-sm text-red-400">⚠️ {validationErrors.acoplado}</p>
                )}
              </div>

              {/* Info */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-sm text-blue-300">
                  ℹ️ <strong>Validaciones automáticas:</strong> El sistema verifica que los recursos
                  (chofer, camión, acoplado) no estén asignados a otras unidades activas.
                </p>
              </div>
            </form>
          ) : (
            /* Tab Historial */
            <div className="space-y-4">
              {loadingHistorial ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Cargando historial...</p>
                </div>
              ) : historial.length === 0 ? (
                <div className="text-center py-12">
                  <ClockIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No hay cambios registrados aún</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Los cambios en esta unidad se mostrarán aquí
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historial.map((cambio) => (
                    <div
                      key={cambio.id}
                      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-indigo-500/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {cambio.tipo_cambio === 'chofer' && (
                            <UserIcon className="h-5 w-5 text-blue-400" />
                          )}
                          {cambio.tipo_cambio === 'camion' && (
                            <TruckIcon className="h-5 w-5 text-green-400" />
                          )}
                          {cambio.tipo_cambio === 'acoplado' && (
                            <LinkIcon className="h-5 w-5 text-yellow-400" />
                          )}
                          {cambio.tipo_cambio === 'nombre' && (
                            <PencilIcon className="h-5 w-5 text-indigo-400" />
                          )}
                          <h4 className="font-semibold text-white capitalize">
                            Cambio de {cambio.tipo_cambio}
                          </h4>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(cambio.created_at).toLocaleString('es-AR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-2">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Anterior</p>
                          <p className="text-sm text-gray-300">
                            {cambio.valor_anterior_legible || cambio.valor_anterior || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Nuevo</p>
                          <p className="text-sm text-green-400 font-medium">
                            {cambio.valor_nuevo_legible || cambio.valor_nuevo || 'N/A'}
                          </p>
                        </div>
                      </div>

                      {cambio.motivo && (
                        <div className="mt-2 pt-2 border-t border-gray-700">
                          <p className="text-xs text-gray-500 mb-1">Motivo</p>
                          <p className="text-sm text-gray-300">{cambio.motivo}</p>
                        </div>
                      )}

                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-gray-500">Modificado por:</span>
                        <span className="text-xs text-gray-400">{cambio.modificado_por_email}</span>
                      </div>
                    </div>
                  ))}

                  {historial.length >= 50 && (
                    <div className="text-center py-2">
                      <p className="text-xs text-gray-500">
                        Mostrando los últimos 50 cambios
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'editar' && (
          <div className="p-6 border-t border-gray-700 flex items-center justify-between bg-gray-900/50">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg font-medium text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || Object.keys(validationErrors).length > 0}
              className="px-6 py-2 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
