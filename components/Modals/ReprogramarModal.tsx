import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

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
  } | null;
  onSuccess?: () => void;
}

export default function ReprogramarModal({ isOpen, onClose, despacho, onSuccess }: Props) {
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevaHora, setNuevaHora] = useState('');
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

      // Obtener viajes expirados del despacho
      const { data: viajesExpirados, error: viajesError } = await supabase
        .from('viajes_despacho')
        .select('id')
        .eq('despacho_id', despacho.id)
        .eq('estado_carga', 'expirado');

      if (viajesError) throw viajesError;

      if (!viajesExpirados || viajesExpirados.length === 0) {
        setError('No se encontraron viajes expirados para este despacho');
        setLoading(false);
        return;
      }

      // Reprogramar cada viaje usando la función SQL
      console.log('🔄 Reprogramando', viajesExpirados.length, 'viajes...');
      
      const resultados = await Promise.all(
        viajesExpirados.map(async (viaje) => {
          console.log('🔄 Llamando reprogramar_viaje para:', viaje.id);
          
          const { data, error } = await supabase
            .rpc('reprogramar_viaje', {
              p_viaje_id: viaje.id,
              p_nueva_fecha_hora: fechaHoraNueva.toISOString(),
              p_motivo: motivo || 'Reprogramación manual'
            });

          if (error) {
            console.error('❌ Error reprogramando viaje:', viaje.id, error);
            return { success: false, viaje_id: viaje.id, error };
          }

          console.log('✅ Viaje reprogramado:', viaje.id, data);
          return { success: true, viaje_id: viaje.id, data };
        })
      );
      
      console.log('📊 Resultados de reprogramación:', resultados);

      // Verificar si hubo errores
      const errores = resultados.filter(r => !r.success);
      if (errores.length > 0) {
        setError(`Error al reprogramar ${errores.length} viaje(s)`);
        setLoading(false);
        return;
      }

      // 🔄 Actualizar manualmente el despacho para asegurar fecha/hora y limpieza de transporte
      const { error: despachoError } = await supabase
        .from('despachos')
        .update({
          scheduled_at: fechaHoraNueva.toISOString(),
          scheduled_local_date: nuevaFecha,
          scheduled_local_time: nuevaHora,
          transport_id: null,
          estado: 'pendiente_transporte'
        })
        .eq('id', despacho.id);

      if (despachoError) {
        console.error('Error actualizando despacho:', despachoError);
        setError('Viajes reprogramados pero error al actualizar despacho');
        setLoading(false);
        return;
      }

      // Éxito
      console.log('✅ Despacho reprogramado exitosamente:', despacho.pedido_id);
      console.log('📅 Nueva fecha/hora:', nuevaFecha, nuevaHora);
      
      // 🔄 Llamar onSuccess para que el componente padre recargue los datos
      if (onSuccess) onSuccess();
      
      handleClose();
    } catch (err: any) {
      console.error('Error al reprogramar despacho:', err);
      setError(err.message || 'Error al reprogramar el despacho');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNuevaFecha('');
    setNuevaHora('');
    setMotivo('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl max-w-xl w-full border border-amber-500/30 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4 rounded-t-xl flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              🔄 Reprogramar Despacho
            </h2>
            <p className="text-amber-100 text-sm mt-1">
              Asignar nueva fecha y hora al despacho expirado
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:text-amber-200 text-2xl font-bold transition-colors"
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
                <span className="text-slate-400">Fecha Original:</span>
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
                Nueva Fecha *
              </label>
              <input
                type="date"
                value={nuevaFecha}
                onChange={(e) => setNuevaFecha(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nueva Hora *
              </label>
              <input
                type="time"
                value={nuevaHora}
                onChange={(e) => setNuevaHora(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Motivo de Reprogramación
              <span className="text-slate-500 ml-1">(opcional)</span>
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Falta de recursos, cliente solicitó cambio, etc."
              rows={3}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
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
            ℹ️ Los viajes expirados volverán al estado "Pendiente de Asignación" con la nueva fecha programada.
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
              className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? '⏳ Reprogramando...' : '🔄 Reprogramar Despacho'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
