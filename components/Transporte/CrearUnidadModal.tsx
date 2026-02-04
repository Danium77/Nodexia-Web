import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { XMarkIcon, TruckIcon, UserIcon } from '@heroicons/react/24/outline';

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
  marca: string;
  modelo: string;
  anio?: number;
}

interface CrearUnidadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  empresaId: string;
}

export default function CrearUnidadModal({ isOpen, onClose, onSuccess, empresaId }: CrearUnidadModalProps) {
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [acoplados, setAcoplados] = useState<Acoplado[]>([]);
  
  const [choferId, setChoferId] = useState('');
  const [camionId, setCamionId] = useState('');
  const [acoplaodId, setAcoplaodId] = useState('');
  const [nombre, setNombre] = useState('');
  const [notas, setNotas] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, empresaId]);

  // Auto-generar nombre cuando se seleccionan chofer y camión
  useEffect(() => {
    if (choferId && camionId) {
      const chofer = choferes.find(c => c.id === choferId);
      const camion = camiones.find(c => c.id === camionId);
      if (chofer && camion) {
        setNombre(`${chofer.apellido} - ${camion.patente}`);
      }
    }
  }, [choferId, camionId, choferes, camiones]);

  const loadData = async () => {
    try {
      // Cargar choferes disponibles (sin unidad asignada o inactivos)
      const { data: choferesData, error: choferesError } = await supabase
        .from('choferes')
        .select('id, nombre, apellido, dni, telefono')
        .eq('empresa_id', empresaId)
        .order('apellido');

      if (choferesError) throw choferesError;

      // Cargar camiones disponibles (sin unidad asignada o inactivos)
      const { data: camionesData, error: camionesError } = await supabase
        .from('camiones')
        .select('id, patente, marca, modelo, anio')
        .eq('empresa_id', empresaId)
        .order('patente');

      if (camionesError) throw camionesError;

      // Cargar acoplados disponibles
      const { data: acoplaodosData, error: acoplaodosError } = await supabase
        .from('acoplados')
        .select('id, patente, marca, modelo, anio')
        .eq('empresa_id', empresaId)
        .order('patente');

      if (acoplaodosError) throw acoplaodosError;

      setChoferes(choferesData || []);
      setCamiones(camionesData || []);
      setAcoplados(acoplaodosData || []);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError('Error al cargar datos: ' + err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!choferId || !camionId) {
      setError('Debes seleccionar un chofer y un camión');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Generar código automático
      const chofer = choferes.find(c => c.id === choferId);
      const camion = camiones.find(c => c.id === camionId);
      const codigo = `${chofer?.apellido.substring(0, 3).toUpperCase()}-${camion?.patente.replace(/\s/g, '')}`;

      const unidadData: any = {
        codigo,
        nombre,
        chofer_id: choferId,
        camion_id: camionId,
        empresa_id: empresaId,
        activo: true,
        notas,
        created_by: user.id
      };

      if (acoplaodId) {
        unidadData.acoplado_id = acoplaodId;
      }

      const { error: insertError } = await supabase
        .from('unidades_operativas')
        .insert([unidadData]);

      if (insertError) throw insertError;

      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Error creating unidad:', err);
      setError(err.message || 'Error al crear unidad operativa');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setChoferId('');
    setCamionId('');
    setAcoplaodId('');
    setNombre('');
    setNotas('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex items-center justify-between rounded-t-xl border-b border-indigo-500/30">
          <div className="flex items-center gap-3">
            <TruckIcon className="h-6 w-6 text-white" />
            <h3 className="text-xl font-bold text-white">Nueva Unidad Operativa</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Chofer Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Chofer <span className="text-red-400">*</span>
            </label>
            <select
              value={choferId}
              onChange={(e) => setChoferId(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            >
              <option value="">Seleccionar chofer...</option>
              {choferes.map((chofer) => (
                <option key={chofer.id} value={chofer.id}>
                  {chofer.apellido}, {chofer.nombre} - DNI: {chofer.dni}
                  {chofer.telefono && ` - Tel: ${chofer.telefono}`}
                </option>
              ))}
            </select>
            {choferes.length === 0 && (
              <p className="mt-2 text-sm text-yellow-400">
                ⚠️ No hay choferes disponibles. Crea uno en la pestaña "Choferes".
              </p>
            )}
          </div>

          {/* Camión Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Camión <span className="text-red-400">*</span>
            </label>
            <select
              value={camionId}
              onChange={(e) => setCamionId(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            >
              <option value="">Seleccionar camión...</option>
              {camiones.map((camion) => (
                <option key={camion.id} value={camion.id}>
                  {camion.patente} - {camion.marca} {camion.modelo}
                  {camion.anio && ` (${camion.anio})`}
                </option>
              ))}
            </select>
            {camiones.length === 0 && (
              <p className="mt-2 text-sm text-yellow-400">
                ⚠️ No hay camiones disponibles. Crea uno en la pestaña "Camiones".
              </p>
            )}
          </div>

          {/* Acoplado Selection (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Acoplado <span className="text-gray-500">(opcional)</span>
            </label>
            <select
              value={acoplaodId}
              onChange={(e) => setAcoplaodId(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Sin acoplado</option>
              {acoplados.map((acoplado) => (
                <option key={acoplado.id} value={acoplado.id}>
                  {acoplado.patente} - {acoplado.marca} {acoplado.modelo}
                  {acoplado.anio && ` (${acoplado.anio})`}
                </option>
              ))}
            </select>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nombre de la Unidad <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Ej: González - AB123CD"
              required
            />
            <p className="mt-1 text-xs text-gray-400">
              Se genera automáticamente al seleccionar chofer y camión
            </p>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notas / Observaciones
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="Información adicional sobre la unidad..."
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <UserIcon className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-300">
                <p className="font-medium mb-1">Sobre las Unidades Operativas</p>
                <p className="text-blue-200/80">
                  Una unidad operativa vincula un chofer con un camión (y opcionalmente un acoplado) para poder realizar viajes. 
                  El sistema controla automáticamente las horas de conducción y descansos obligatorios.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !choferId || !camionId || choferes.length === 0 || camiones.length === 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-medium hover:from-green-700 hover:to-green-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando...' : 'Crear Unidad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
