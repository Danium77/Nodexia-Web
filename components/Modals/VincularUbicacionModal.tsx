import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type { Ubicacion, EmpresaUbicacion } from '../../types/ubicaciones';

interface VincularUbicacionModalProps {
  isOpen: boolean;
  onClose: (actualizado: boolean) => void;
  ubicacion?: Ubicacion | null;
  vinculo?: EmpresaUbicacion | null;
  empresaId: string;
}

export default function VincularUbicacionModal({ 
  isOpen, 
  onClose, 
  ubicacion, 
  vinculo,
  empresaId 
}: VincularUbicacionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    es_origen: false,
    es_destino: false,
    alias: '',
    prioridad: 0,
    notas: ''
  });

  // Cargar datos si estamos editando
  useEffect(() => {
    if (vinculo) {
      setFormData({
        es_origen: vinculo.es_origen || false,
        es_destino: vinculo.es_destino || false,
        alias: vinculo.alias || '',
        prioridad: vinculo.prioridad || 0,
        notas: vinculo.notas || ''
      });
    } else {
      // Valores por defecto al crear
      setFormData({
        es_origen: true,
        es_destino: true,
        alias: '',
        prioridad: 0,
        notas: ''
      });
    }
  }, [vinculo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validación: al menos uno debe ser true
      if (!formData.es_origen && !formData.es_destino) {
        throw new Error('Debe marcar al menos Origen o Destino');
      }

      // Obtener user_id actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      if (vinculo) {
        // Actualizar vínculo existente
        const { error: updateError } = await supabase
          .from('empresa_ubicaciones')
          .update({
            es_origen: formData.es_origen,
            es_destino: formData.es_destino,
            alias: formData.alias || null,
            prioridad: formData.prioridad,
            notas: formData.notas || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', vinculo.id);

        if (updateError) throw updateError;
      } else {
        // Crear nuevo vínculo
        if (!ubicacion) throw new Error('No se especificó la ubicación');

        const { error: insertError } = await supabase
          .from('empresa_ubicaciones')
          .insert([{
            empresa_id: empresaId,
            ubicacion_id: ubicacion.id,
            es_origen: formData.es_origen,
            es_destino: formData.es_destino,
            alias: formData.alias || null,
            prioridad: formData.prioridad,
            notas: formData.notas || null,
            activo: true,
            created_by: user.id
          }]);

        if (insertError) {
          if (insertError.code === '23505') {
            throw new Error('Esta ubicación ya está vinculada a tu empresa');
          }
          throw insertError;
        }
      }

      // Éxito
      onClose(true);
    } catch (err: any) {
      console.error('Error vinculando ubicación:', err);
      setError(err.message || 'Error al vincular la ubicación');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const ubicacionActual = vinculo?.ubicaciones || ubicacion;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1b273b] rounded-lg max-w-2xl w-full border border-slate-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-50">
            {vinculo ? 'Editar Vinculación' : 'Vincular Ubicación'}
          </h2>
          <button
            onClick={() => onClose(false)}
            className="text-slate-400 hover:text-slate-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Info de la ubicación */}
        {ubicacionActual && (
          <div className="px-6 py-4 bg-[#0a0e1a] border-b border-slate-700">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-50 mb-1">
                  {ubicacionActual.nombre}
                </h3>
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <span>CUIT: {ubicacionActual.cuit}</span>
                  <span>•</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    ubicacionActual.tipo === 'planta' 
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : ubicacionActual.tipo === 'deposito'
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'bg-green-500/20 text-green-400 border border-green-500/30'
                  }`}>
                    {ubicacionActual.tipo}
                  </span>
                </div>
                <div className="mt-2 text-sm text-slate-500">
                  {ubicacionActual.direccion}
                  {ubicacionActual.ciudad && ` • ${ubicacionActual.ciudad}`}
                  {ubicacionActual.provincia && `, ${ubicacionActual.provincia}`}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Checkboxes: Origen / Destino */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                ¿Cómo usarás esta ubicación? <span className="text-red-400">*</span>
              </label>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer p-3 bg-[#0a0e1a] rounded-lg border border-slate-600 hover:border-slate-500 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.es_origen}
                    onChange={(e) => setFormData(prev => ({ ...prev, es_origen: e.target.checked }))}
                    className="mt-1 w-4 h-4 text-cyan-600 bg-slate-700 border-slate-500 rounded focus:ring-cyan-500 focus:ring-2"
                  />
                  <div className="flex-1">
                    <div className="text-slate-50 font-medium">Como Origen</div>
                    <div className="text-sm text-slate-400">
                      Podrás seleccionar esta ubicación como punto de partida en tus despachos
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer p-3 bg-[#0a0e1a] rounded-lg border border-slate-600 hover:border-slate-500 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.es_destino}
                    onChange={(e) => setFormData(prev => ({ ...prev, es_destino: e.target.checked }))}
                    className="mt-1 w-4 h-4 text-cyan-600 bg-slate-700 border-slate-500 rounded focus:ring-cyan-500 focus:ring-2"
                  />
                  <div className="flex-1">
                    <div className="text-slate-50 font-medium">Como Destino</div>
                    <div className="text-sm text-slate-400">
                      Podrás seleccionar esta ubicación como punto de llegada en tus despachos
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Alias */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Alias (opcional)
              </label>
              <input
                type="text"
                value={formData.alias}
                onChange={(e) => setFormData(prev => ({ ...prev, alias: e.target.value }))}
                className="w-full px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Ej: Planta Central, Depósito Norte..."
              />
              <p className="mt-1 text-xs text-slate-500">
                Nombre personalizado para identificar rápidamente esta ubicación
              </p>
            </div>

            {/* Prioridad */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Prioridad
              </label>
              <input
                type="number"
                value={formData.prioridad}
                onChange={(e) => setFormData(prev => ({ ...prev, prioridad: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                min="0"
                max="100"
              />
              <p className="mt-1 text-xs text-slate-500">
                Mayor prioridad = aparece primero en el autocomplete (0-100)
              </p>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Notas (opcional)
              </label>
              <textarea
                value={formData.notas}
                onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                placeholder="Información adicional sobre esta ubicación..."
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-700">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-semibold transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Guardando...' : vinculo ? 'Actualizar' : 'Vincular'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
