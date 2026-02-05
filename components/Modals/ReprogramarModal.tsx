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
  const [mantenerRecursos, setMantenerRecursos] = useState(false);
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

      // Obtener todos los viajes del despacho (sin filtrar por estado_unidad)
      const { data: viajesExpirados, error: viajesError } = await supabase
        .from('viajes_despacho')
        .select('id, chofer_id, camion_id, acoplado_id, id_transporte, estado_unidad, estado')
        .eq('despacho_id', despacho.id);

      if (viajesError) throw viajesError;

      if (!viajesExpirados || viajesExpirados.length === 0) {
        setError('No se encontraron viajes para este despacho');
        setLoading(false);
        return;
      }

      console.log('🔄 Reprogramando', viajesExpirados.length, 'viajes...');
      console.log('📦 Mantener recursos:', mantenerRecursos);

      // Actualizar cada viaje
      for (const viaje of viajesExpirados) {
        const updateData: any = {
          scheduled_at: fechaHoraNueva.toISOString(),
          updated_at: new Date().toISOString()
        };

        // Si MANTENER recursos: mantener estado actual (o asignar si tiene recursos)
        if (mantenerRecursos && (viaje.chofer_id || viaje.camion_id)) {
          // Si el viaje tenía estado antes de expirar, mantenerlo
          // Si estaba en tránsito, volver a estado confirmado para que el chofer pueda reiniciar
          if (viaje.estado_unidad === 'en_transito_origen' || viaje.estado_unidad === 'en_transito_destino') {
            updateData.estado_unidad = 'confirmado_chofer';
            updateData.estado = 'confirmado_chofer';
          } else {
            // Mantener el estado que tenía (probablemente camion_asignado o confirmado_chofer)
            updateData.estado_unidad = viaje.estado_unidad === 'expirado' ? 'camion_asignado' : viaje.estado_unidad;
            updateData.estado = viaje.estado === 'expirado' ? 'transporte_asignado' : viaje.estado;
          }
        } else {
          // Si NO mantener recursos, limpiar asignaciones y volver a pendiente
          updateData.chofer_id = null;
          updateData.camion_id = null;
          updateData.acoplado_id = null;
          updateData.id_transporte = null;
          updateData.fecha_asignacion_transporte = null;
          updateData.estado_unidad = null;
          updateData.estado = 'pendiente';
        }

        const { error: updateError } = await supabase
          .from('viajes_despacho')
          .update(updateData)
          .eq('id', viaje.id);

        if (updateError) {
          console.error('❌ Error actualizando viaje:', viaje.id, updateError);
          throw updateError;
        }

        // 🔔 NOTIFICACIONES: Enviar notificación al chofer si tiene chofer asignado
        if (viaje.chofer_id) {
          // Obtener usuario_id del chofer
          const { data: choferData } = await supabase
            .from('choferes')
            .select('usuario_id, nombre, apellido')
            .eq('id', viaje.chofer_id)
            .single();

          if (choferData?.usuario_id) {
            console.log('📧 Enviando notificación a chofer:', choferData.nombre);
            
            await supabase.from('notificaciones').insert({
              usuario_id: choferData.usuario_id,
              tipo_notificacion: 'estado_actualizado',
              titulo: '🔄 Viaje Reprogramado',
              mensaje: `El viaje ${despacho.pedido_id} ha sido reprogramado para ${nuevaFecha} a las ${nuevaHora}`,
              viaje_id: viaje.id,
              datos_extra: {
                pedido_id: despacho.pedido_id,
                fecha_original: despacho.fecha_despacho,
                hora_original: despacho.hora_despacho,
                nueva_fecha: nuevaFecha,
                nueva_hora: nuevaHora
              },
              enviada: false,
              leida: false
            });
          }
        }

        // 🔔 NOTIFICACIONES: Enviar notificación a la empresa de transporte
        if (viaje.id_transporte) {
          // Obtener usuarios de la empresa de transporte con rol coordinador
          const { data: coordinadores } = await supabase
            .from('usuarios_empresas')
            .select('usuario_id')
            .eq('empresa_id', viaje.id_transporte)
            .eq('rol', 'coordinador_transporte');

          if (coordinadores && coordinadores.length > 0) {
            console.log('📧 Enviando notificaciones a empresa transporte:', coordinadores.length, 'coordinadores');
            
            for (const coordinador of coordinadores) {
              await supabase.from('notificaciones').insert({
                usuario_id: coordinador.usuario_id,
                tipo_notificacion: 'estado_actualizado',
                titulo: '🔄 Viaje Reprogramado',
                mensaje: `El viaje ${despacho.pedido_id} ha sido reprogramado para ${nuevaFecha} a las ${nuevaHora}`,
                viaje_id: viaje.id,
                datos_extra: {
                  pedido_id: despacho.pedido_id,
                  fecha_original: despacho.fecha_despacho,
                  hora_original: despacho.hora_despacho,
                  nueva_fecha: nuevaFecha,
                  nueva_hora: nuevaHora
                },
                enviada: false,
                leida: false
              });
            }
          }
        }
      }

      // Actualizar despacho (solo columnas que existen)
      const despachoUpdate: any = {
        scheduled_local_date: nuevaFecha,
        scheduled_local_time: nuevaHora,
        estado: mantenerRecursos ? 'asignado' : 'pendiente',
        updated_at: new Date().toISOString()
      };

      // Si no mantener recursos, limpiar transport_id
      if (!mantenerRecursos) {
        despachoUpdate.transport_id = null;
      }

      const { error: despachoError } = await supabase
        .from('despachos')
        .update(despachoUpdate)
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
    setMantenerRecursos(false);
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
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="">Seleccionar motivo...</option>
              <option value="Demora en ruta">Demora en ruta</option>
              <option value="Problema mecánico resuelto">Problema mecánico resuelto</option>
              <option value="Cambio horario cliente">Cambio de horario cliente</option>
              <option value="Incidencia reportada">Incidencia reportada</option>
              <option value="Falta de recursos">Falta de recursos</option>
              <option value="Otros">Otros</option>
            </select>
          </div>

          {/* Mantener recursos */}
          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={mantenerRecursos}
                onChange={(e) => setMantenerRecursos(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-slate-500 text-amber-600 focus:ring-amber-500 focus:ring-offset-slate-800"
              />
              <div className="flex-1">
                <div className="text-white font-medium">
                  Mantener recursos actuales
                </div>
                <div className="text-slate-400 text-sm mt-1">
                  Mantiene el transporte, chofer y camión ya asignados. Si no se marca, se limpiarán las asignaciones y el despacho volverá a estado pendiente.
                </div>
              </div>
            </label>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Info message */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-blue-300 text-sm">
            {mantenerRecursos 
              ? '✅ Los viajes mantendrán su transporte, chofer y camión asignados con la nueva fecha.'
              : '🔄 Los viajes volverán a estado "Pendiente" y deberán ser asignados nuevamente.'
            }
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
