import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import type { Ubicacion, UbicacionFormData } from '@/types/ubicaciones';

interface CrearUbicacionModalProps {
  isOpen: boolean;
  onClose: (actualizado: boolean) => void;
  ubicacion?: Ubicacion | null;
}

const PROVINCIAS = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán'
];

const STORAGE_KEY = 'nodexia_ubicacion_draft';

export default function CrearUbicacionModal({ isOpen, onClose, ubicacion }: CrearUbicacionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 🔥 FUNCIÓN HELPER: Cargar draft desde sessionStorage
  const loadDraft = (): UbicacionFormData => {
    if (typeof window === 'undefined') return getEmptyForm();
    
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        console.log('💾 Recuperando borrador guardado');
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Error recuperando draft:', e);
    }
    return getEmptyForm();
  };

  const getEmptyForm = (): UbicacionFormData => ({
    nombre: '',
    cuit: '',
    tipo: 'planta',
    direccion: '',
    ciudad: '',
    provincia: 'Buenos Aires',
    pais: 'Argentina',
    codigo_postal: '',
    telefono: '',
    email: '',
    contacto_nombre: '',
    contacto_cargo: '',
    horario_atencion: '',
    capacidad_carga: '',
    observaciones: '',
    activo: true
  });
  
  const [formData, setFormData] = useState<UbicacionFormData>(loadDraft);

  // 🔥 AUTO-GUARDAR en sessionStorage cada vez que formData cambia
  useEffect(() => {
    if (typeof window !== 'undefined' && isOpen) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
      console.log('💾 Borrador auto-guardado');
    }
  }, [formData, isOpen]);

  // Cargar datos si estamos editando
  useEffect(() => {
    if (ubicacion) {
      setFormData({
        nombre: ubicacion.nombre || '',
        cuit: ubicacion.cuit || '',
        tipo: ubicacion.tipo || 'planta',
        direccion: ubicacion.direccion || '',
        ciudad: ubicacion.ciudad || '',
        provincia: ubicacion.provincia || 'Buenos Aires',
        pais: ubicacion.pais || 'Argentina',
        codigo_postal: ubicacion.codigo_postal || '',
        latitud: ubicacion.latitud,
        longitud: ubicacion.longitud,
        telefono: ubicacion.telefono || '',
        email: ubicacion.email || '',
        contacto_nombre: ubicacion.contacto_nombre || '',
        contacto_cargo: ubicacion.contacto_cargo || '',
        horario_atencion: ubicacion.horario_atencion || '',
        capacidad_carga: ubicacion.capacidad_carga || '',
        observaciones: ubicacion.observaciones || '',
        activo: ubicacion.activo !== undefined ? ubicacion.activo : true
      });
    }
  }, [ubicacion]);

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('🚀 handleSubmit LLAMADO - Evento:', e.type);
    e.preventDefault();
    console.log('🛑 preventDefault ejecutado');
    setError(null);
    setLoading(true);
    console.log('⏳ Loading activado');

    try {
      console.log('🔵 Iniciando guardado de ubicación...', formData);
      
      // Validaciones básicas
      if (!formData.nombre || !formData.cuit || !formData.direccion) {
        throw new Error('Completa todos los campos obligatorios (Nombre, CUIT y Dirección)');
      }

      // 🔥 Validar formato CUIT (XX-XXXXXXXX-X) - Solo números y guiones
      const cuitRegex = /^\d{2}-\d{8}-\d{1}$/;
      if (!cuitRegex.test(formData.cuit)) {
        throw new Error('El CUIT debe tener formato: XX-XXXXXXXX-X (solo números y guiones)');
      }

      // 🔥 Validar Código Postal (4 dígitos, solo números)
      if (formData.codigo_postal && !/^\d{4}$/.test(formData.codigo_postal)) {
        throw new Error('El Código Postal debe tener exactamente 4 dígitos numéricos');
      }

      // 🔥 Validar Teléfono (números y símbolos, máximo 14 dígitos)
      if (formData.telefono) {
        // Extraer solo los dígitos
        const soloDigitos = formData.telefono.replace(/\D/g, '');
        if (soloDigitos.length > 14) {
          throw new Error(`El Teléfono tiene ${soloDigitos.length} dígitos. El máximo permitido es 14 dígitos.`);
        }
        // Verificar que solo contenga números y símbolos permitidos
        if (!/^[\d\s\-\(\)\+]+$/.test(formData.telefono)) {
          throw new Error('El Teléfono solo puede contener números y los símbolos: ( ) - + espacio');
        }
      }

      // 🔥 Validaciones de longitud de campos
      const camposLongitud: { campo: string; valor: string; max: number }[] = [
        { campo: 'Nombre', valor: formData.nombre, max: 150 },
        { campo: 'CUIT', valor: formData.cuit, max: 13 },
        { campo: 'Dirección', valor: formData.direccion, max: 300 },
        { campo: 'Ciudad', valor: formData.ciudad || '', max: 100 },
        { campo: 'Provincia', valor: formData.provincia || '', max: 100 },
        { campo: 'Código Postal', valor: formData.codigo_postal || '', max: 4 },
        { campo: 'Teléfono', valor: formData.telefono || '', max: 20 },
        { campo: 'Email', valor: formData.email || '', max: 255 },
        { campo: 'Nombre del Contacto', valor: formData.contacto_nombre || '', max: 100 },
        { campo: 'Cargo del Contacto', valor: formData.contacto_cargo || '', max: 100 },
        { campo: 'Horario de Atención', valor: formData.horario_atencion || '', max: 200 },
        { campo: 'Capacidad de Carga', valor: formData.capacidad_carga || '', max: 100 },
      ];

      for (const { campo, valor, max } of camposLongitud) {
        if (valor.length > max) {
          throw new Error(`El campo "${campo}" supera el límite de ${max} caracteres. Actualmente tiene ${valor.length} caracteres.`);
        }
      }

      // Validación especial para Observaciones
      if (formData.observaciones && formData.observaciones.length > 2000) {
        throw new Error(`El campo "Observaciones" supera el límite de 2000 caracteres. Actualmente tiene ${formData.observaciones.length} caracteres.`);
      }

      console.log('✅ Validaciones pasadas');

      console.log('📦 Data a guardar:', formData);

      if (ubicacion) {
        // Actualizar ubicación existente usando API
        console.log('🔄 Actualizando ubicación existente...');
        const response = await fetchWithAuth('/api/ubicaciones/actualizar', {
          method: 'PUT',
          body: JSON.stringify({
            id: ubicacion.id,
            ...formData
          })
        });

        const result = await response.json();

        if (!response.ok) {
          console.error('❌ Error al actualizar:', result);
          throw new Error(result.error || 'Error al actualizar la ubicación');
        }
        console.log('✅ Ubicación actualizada:', result.data);
      } else {
        // Crear nueva ubicación usando API
        console.log('➕ Creando nueva ubicación...');
        const response = await fetchWithAuth('/api/ubicaciones/crear', {
          method: 'POST',
          body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (!response.ok) {
          console.error('❌ Error al crear:', result);
          throw new Error(result.error || 'Error al crear la ubicación');
        }
        console.log('✅ Ubicación creada exitosamente:', result.data);
      }

      // Éxito
      console.log('🎉 Guardado exitoso, cerrando modal...');
      
      // 🔥 LIMPIAR draft de sessionStorage después de guardar exitosamente
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(STORAGE_KEY);
        console.log('🗑️ Borrador eliminado de sessionStorage');
      }
      
      onClose(true);
    } catch (err: any) {
      console.error('❌ Error guardando ubicación:', err);
      setError(err.message || 'Error al guardar la ubicación');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof UbicacionFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 🔥 Función para cerrar y limpiar draft
  const handleCancel = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY);
      console.log('🗑️ Borrador cancelado y eliminado');
    }
    onClose(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1b273b] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8 border border-slate-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-50">
            {ubicacion ? 'Editar Ubicación' : 'Nueva Ubicación'}
          </h2>
          <button
            onClick={handleCancel}
            className="text-slate-400 hover:text-slate-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nombre */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nombre <span className="text-red-400">*</span>
                <span className="text-slate-500 text-xs ml-2">
                  (máx. 150 caracteres)
                </span>
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => handleChange('nombre', e.target.value)}
                maxLength={150}
                className="w-full px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
                placeholder="Ej: Planta Industrial Zona Norte"
              />
            </div>

            {/* CUIT */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                CUIT <span className="text-red-400">*</span>
                <span className="text-slate-500 text-xs ml-2">
                  (formato: XX-XXXXXXXX-X)
                </span>
              </label>
              <input
                type="text"
                value={formData.cuit}
                onChange={(e) => handleChange('cuit', e.target.value)}
                maxLength={13}
                className="w-full px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
                placeholder="30-12345678-9"
                pattern="\d{2}-\d{8}-\d{1}"
                disabled={!!ubicacion} // No se puede cambiar el CUIT al editar
              />
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Tipo <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => handleChange('tipo', e.target.value)}
                className="w-full px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              >
                <option value="planta">Planta</option>
                <option value="deposito">Depósito</option>
                <option value="cliente">Cliente</option>
              </select>
            </div>

            {/* Dirección */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Dirección <span className="text-red-400">*</span>
                <span className="text-slate-500 text-xs ml-2">
                  (máx. 300 caracteres)
                </span>
              </label>
              <input
                type="text"
                value={formData.direccion}
                onChange={(e) => handleChange('direccion', e.target.value)}
                maxLength={300}
                className="w-full px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
                placeholder="Ej: Av. Rivadavia 1234, CABA"
              />
            </div>

            {/* Ciudad */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Ciudad
              </label>
              <input
                type="text"
                value={formData.ciudad}
                onChange={(e) => handleChange('ciudad', e.target.value)}
                className="w-full px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Ej: Villa María"
              />
            </div>

            {/* Provincia */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Provincia
              </label>
              <select
                value={formData.provincia}
                onChange={(e) => handleChange('provincia', e.target.value)}
                className="w-full px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {PROVINCIAS.map(prov => (
                  <option key={prov} value={prov}>{prov}</option>
                ))}
              </select>
            </div>

            {/* Código Postal */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Código Postal
                <span className="text-slate-500 text-xs ml-2">
                  (4 dígitos)
                </span>
              </label>
              <input
                type="text"
                value={formData.codigo_postal}
                onChange={(e) => handleChange('codigo_postal', e.target.value)}
                maxLength={4}
                className="w-full px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Ej: 5900"
              />
            </div>

            {/* Coordenadas */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                📍 Coordenadas GPS
                <span className="text-slate-500 text-xs ml-2">
                  (para navegación en Maps)
                </span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitud ?? ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, latitud: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    className="w-full px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Latitud (ej: -34.6037)"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitud ?? ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, longitud: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    className="w-full px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Longitud (ej: -58.3816)"
                  />
                </div>
              </div>
              <p className="text-slate-500 text-xs mt-1">
                Tip: Buscá la ubicación en Google Maps, hacé click derecho y copiá las coordenadas.
              </p>
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Teléfono
                <span className="text-slate-500 text-xs ml-2">
                  (máx. 14 dígitos)
                </span>
              </label>
              <input
                type="text"
                value={formData.telefono}
                onChange={(e) => handleChange('telefono', e.target.value)}
                maxLength={20}
                className="w-full px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Ej: 0341-4567890"
              />
            </div>

            {/* Email */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Ej: planta@industriasrl.com.ar"
              />
            </div>

            {/* Contacto Nombre */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nombre del Contacto
              </label>
              <input
                type="text"
                value={formData.contacto_nombre}
                onChange={(e) => handleChange('contacto_nombre', e.target.value)}
                className="w-full px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Ej: Juan Pérez"
              />
            </div>

            {/* Contacto Cargo */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Cargo del Contacto
              </label>
              <input
                type="text"
                value={formData.contacto_cargo}
                onChange={(e) => handleChange('contacto_cargo', e.target.value)}
                className="w-full px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Ej: Jefe de Logística"
              />
            </div>

            {/* Horario de Atención */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Horario de Atención
              </label>
              <input
                type="text"
                value={formData.horario_atencion}
                onChange={(e) => handleChange('horario_atencion', e.target.value)}
                className="w-full px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Ej: Lun-Vie 8-17hs"
              />
            </div>

            {/* Capacidad de Carga */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Capacidad de Carga
              </label>
              <input
                type="text"
                value={formData.capacidad_carga}
                onChange={(e) => handleChange('capacidad_carga', e.target.value)}
                className="w-full px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Ej: 30 toneladas/día"
              />
            </div>

            {/* Observaciones */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Observaciones
                <span className="text-slate-500 text-xs ml-2">
                  ({(formData.observaciones || '').length}/2000 caracteres)
                </span>
              </label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => handleChange('observaciones', e.target.value)}
                rows={3}
                maxLength={2000}
                className="w-full px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                placeholder="Observaciones adicionales..."
              />
              {(formData.observaciones || '').length > 1800 && (
                <p className="mt-1 text-xs text-amber-400">
                  ⚠️ Te quedan {2000 - (formData.observaciones || '').length} caracteres
                </p>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-700">
            <button
              type="button"
              onClick={() => {
                console.log('🔴 Botón Cancelar clickeado');
                handleCancel();
              }}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-semibold transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={(e) => {
                console.log('🟢 Botón Crear clickeado - llamando handleSubmit directamente');
                e.preventDefault();
                handleSubmit(e as any);
              }}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Guardando...' : ubicacion ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
