import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../lib/api/fetchWithAuth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  despacho: {
    id: string;
    pedido_id: string;
    origen: string;
    destino: string;
    fecha_despacho: string;
    hora_despacho?: string;
    observaciones?: string;
  } | null;
  onSuccess?: () => void;
}

export default function EditarDespachoModal({ isOpen, onClose, despacho, onSuccess }: Props) {
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevaHora, setNuevaHora] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cargar valores iniciales cuando se abre el modal
  useEffect(() => {
    if (isOpen && despacho) {
      setNuevaFecha(despacho.fecha_despacho || '');
      setNuevaHora(despacho.hora_despacho || '');
      setObservaciones(despacho.observaciones || '');
    }
  }, [isOpen, despacho]);

  if (!isOpen || !despacho) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validar que la fecha sea futura
      const fechaHoraActual = new Date();
      const fechaHoraNueva = new Date(`${nuevaFecha}T${nuevaHora}`);

      if (fechaHoraNueva <= fechaHoraActual) {
        setError('La fecha y hora deben ser futuras');
        setLoading(false);
        return;
      }

      // Llamar a la API
      const response = await fetchWithAuth('/api/despachos/actualizar', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          despacho_id: despacho.id,
          fecha_despacho: nuevaFecha,
          hora_despacho: nuevaHora,
          observaciones: observaciones
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.mensaje || 'Error al actualizar despacho');
      }

      console.log('✅ Despacho actualizado:', data);
      
      // Llamar onSuccess para que el componente padre recargue los datos
      if (onSuccess) onSuccess();
      
      handleClose();
    } catch (err: any) {
      console.error('Error al actualizar despacho:', err);
      setError(err.message || 'Error al actualizar el despacho');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNuevaFecha('');
    setNuevaHora('');
    setObservaciones('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl max-w-xl w-full border border-cyan-500/30 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-4 rounded-t-xl flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              ✏️ Editar Despacho
            </h2>
            <p className="text-cyan-100 text-sm mt-1">
              Modificar fecha, hora y observaciones
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:text-cyan-200 text-2xl font-bold transition-colors"
            disabled={loading}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Info del despacho */}
          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-400">Pedido:</span>
                <span className="ml-2 text-white font-semibold">{despacho.pedido_id}</span>
              </div>
              <div>
                <span className="text-slate-400">Fecha Actual:</span>
                <span className="ml-2 text-white">{despacho.fecha_despacho} {despacho.hora_despacho}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400">Ruta:</span>
                <span className="ml-2 text-cyan-400">{despacho.origen}</span>
                <span className="mx-2 text-slate-500">→</span>
                <span className="text-green-400">{despacho.destino}</span>
              </div>
            </div>
          </div>

          {/* Nueva fecha y hora */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Fecha *
              </label>
              <input
                type="date"
                value={nuevaFecha}
                onChange={(e) => setNuevaFecha(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Hora *
              </label>
              <input
                type="time"
                value={nuevaHora}
                onChange={(e) => setNuevaHora(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Observaciones
              <span className="text-slate-500 ml-1">(opcional)</span>
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              placeholder="Agregar notas adicionales sobre el despacho..."
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Info message */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-blue-300 text-sm">
            ℹ️ Solo puedes editar despachos cuyos viajes aún no hayan sido confirmados por el chofer.
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !nuevaFecha || !nuevaHora}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? '⏳ Guardando...' : '✅ Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
