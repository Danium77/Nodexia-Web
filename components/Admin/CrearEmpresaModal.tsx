import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

interface Empresa {
  id?: string;
  nombre: string;
  cuit: string;
  email: string;
  telefono: string;
  direccion: string;
  localidad: string;
  provincia: string;
  tipo_empresa: 'transporte' | 'planta' | 'cliente' | 'sistema';
  estado_suscripcion: string;
  fecha_suscripcion: string;
  activo: boolean;
  notas?: string;
}

interface CrearEmpresaModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresaToEdit?: Empresa | null;
}

const PROVINCIAS_ARGENTINA = [
  'Buenos Aires',
  'CABA',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucumán'
];

const CrearEmpresaModal: React.FC<CrearEmpresaModalProps> = ({
  isOpen,
  onClose,
  empresaToEdit
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<Empresa>({
    nombre: '',
    cuit: '',
    email: '',
    telefono: '',
    direccion: '',
    localidad: '',
    provincia: '',
    tipo_empresa: 'planta',
    estado_suscripcion: 'activa',
    fecha_suscripcion: new Date().toISOString().split('T')[0] || '',
    activo: true,
    notas: ''
  });

  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (empresaToEdit && empresaToEdit.id) {
      setFormData({
        nombre: empresaToEdit.nombre || '',
        cuit: empresaToEdit.cuit || '',
        email: empresaToEdit.email || '',
        telefono: empresaToEdit.telefono || '',
        direccion: empresaToEdit.direccion || '',
        localidad: empresaToEdit.localidad || '',
        provincia: empresaToEdit.provincia || '',
        tipo_empresa: empresaToEdit.tipo_empresa || 'planta',
        estado_suscripcion: empresaToEdit.estado_suscripcion || 'activa',
        fecha_suscripcion: (empresaToEdit.fecha_suscripcion?.split('T')[0] || new Date().toISOString().split('T')[0]) || '',
        activo: empresaToEdit.activo ?? true,
        notas: empresaToEdit.notas || ''
      });
    }
  }, [empresaToEdit]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });

    // Limpiar error del campo
    if (validationErrors[name]) {
      setValidationErrors({ ...validationErrors, [name]: '' });
    }
    if (error) setError(null);
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!formData.nombre.trim()) {
      errors.nombre = 'El nombre es requerido';
    }

    if (!formData.cuit.trim()) {
      errors.cuit = 'El CUIT es requerido';
    } else if (!/^\d{2}-\d{8}-\d{1}$/.test(formData.cuit)) {
      errors.cuit = 'Formato de CUIT inválido (XX-XXXXXXXX-X)';
    }

    if (!formData.email.trim()) {
      errors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email inválido';
    }

    if (!formData.provincia) {
      errors.provincia = 'La provincia es requerida';
    }

    if (!formData.tipo_empresa) {
      errors.tipo_empresa = 'El tipo de empresa es requerido';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setError('Por favor corrige los errores en el formulario');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Verificar si el CUIT ya existe (solo al crear o si se cambió el CUIT)
      const cuitCambiado = empresaToEdit?.cuit !== formData.cuit;
      
      if (!empresaToEdit || cuitCambiado) {
        const { data: empresaExistente } = await supabase
          .from('empresas')
          .select('id, nombre')
          .eq('cuit', formData.cuit.trim())
          .maybeSingle();

        if (empresaExistente && empresaExistente.id !== empresaToEdit?.id) {
          setError(`Ya existe una empresa con el CUIT ${formData.cuit}: "${empresaExistente.nombre}". Por favor verifica el número.`);
          setLoading(false);
          return;
        }
      }

      const empresaData = {
        nombre: formData.nombre.trim(),
        cuit: formData.cuit.trim(),
        email: formData.email.trim(),
        telefono: formData.telefono.trim(),
        direccion: formData.direccion.trim(),
        localidad: formData.localidad.trim(),
        provincia: formData.provincia,
        tipo_empresa: formData.tipo_empresa,
        estado_suscripcion: formData.estado_suscripcion,
        fecha_suscripcion: formData.fecha_suscripcion,
        activo: formData.activo,
        activa: formData.activo, // Para compatibilidad
        notas: formData.notas?.trim() || null,
        updated_at: new Date().toISOString()
      };

      if (empresaToEdit?.id) {
        // Actualizar empresa existente
        const { error: updateError } = await supabase
          .from('empresas')
          .update(empresaData)
          .eq('id', empresaToEdit.id);

        if (updateError) {
          console.error('Error de Supabase:', updateError);
          throw new Error(updateError.message);
        }
      } else {
        // Crear nueva empresa
        const { error: insertError } = await supabase
          .from('empresas')
          .insert([{
            ...empresaData,
            created_at: new Date().toISOString(),
            fecha_creacion: new Date().toISOString(),
            configuracion_empresa: {}
          }]);

        if (insertError) {
          console.error('Error de Supabase:', insertError);
          throw new Error(insertError.message);
        }
      }

      setSuccess(true);
      setLoading(false);

      // Cerrar modal y notificar al padre para recargar
      setTimeout(() => {
        onClose(true); // true = se guardó exitosamente, recargar lista
      }, 1500); // Esperar 1.5s para que el usuario vea el mensaje de éxito

    } catch (err: any) {
      console.error('Error guardando empresa:', err);
      let errorMessage = 'Error al guardar la empresa';
      
      // Mensajes más amigables para errores comunes
      if (err.message && err.message.includes('empresa_cuit_key')) {
        errorMessage = 'Ya existe una empresa con este CUIT. Por favor verifica el número.';
      } else if (err.message && err.message.includes('duplicate')) {
        errorMessage = 'Ya existe un registro con estos datos. Por favor verifica.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      cuit: '',
      email: '',
      telefono: '',
      direccion: '',
      localidad: '',
      provincia: '',
      tipo_empresa: 'planta',
      estado_suscripcion: 'activa',
      fecha_suscripcion: new Date().toISOString().split('T')[0] || '',
      activo: true,
      notas: ''
    });
    setValidationErrors({});
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="bg-[#1b273b] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-700 shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#1b273b] border-b border-slate-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-50">
            {empresaToEdit ? 'Editar Empresa' : 'Nueva Empresa Cliente'}
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mx-6 mt-6 p-6 bg-green-500/20 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircleIcon className="h-8 w-8 text-green-400" />
              <div>
                <h3 className="text-green-400 font-bold text-lg">
                  ¡Éxito!
                </h3>
                <p className="text-green-300">
                  Empresa {empresaToEdit ? 'actualizada' : 'creada'} correctamente
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
            >
              Cerrar y Volver
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-3">
            <ExclamationCircleIcon className="h-6 w-6 text-red-400" />
            <span className="text-red-400">{error}</span>
          </div>
        )}

        {/* Form - Solo mostrar si no hay éxito */}
        {!success && (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Información Básica */}
          <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Información Básica</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  Razón Social <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  placeholder="Ej: Transportes del Sur SA"
                  className={`w-full px-4 py-2 bg-[#0a0e1a] border ${
                    validationErrors.nombre ? 'border-red-500' : 'border-slate-600'
                  } rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500`}
                />
                {validationErrors.nombre && (
                  <p className="text-red-400 text-sm mt-1">{validationErrors.nombre}</p>
                )}
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  CUIT <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="cuit"
                  value={formData.cuit}
                  onChange={handleChange}
                  placeholder="30-12345678-9"
                  maxLength={13}
                  className={`w-full px-4 py-2 bg-[#0a0e1a] border ${
                    validationErrors.cuit ? 'border-red-500' : 'border-slate-600'
                  } rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500`}
                />
                {validationErrors.cuit && (
                  <p className="text-red-400 text-sm mt-1">{validationErrors.cuit}</p>
                )}
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  Tipo de Empresa <span className="text-red-400">*</span>
                </label>
                <select
                  name="tipo_empresa"
                  value={formData.tipo_empresa}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 bg-[#0a0e1a] border ${
                    validationErrors.tipo_empresa ? 'border-red-500' : 'border-slate-600'
                  } rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500`}
                >
                  <option value="planta">🏭 Planta / Productor</option>
                  <option value="transporte">🚛 Transporte</option>
                  <option value="cliente">👥 Cliente / Comprador</option>
                </select>
                {validationErrors.tipo_empresa && (
                  <p className="text-red-400 text-sm mt-1">{validationErrors.tipo_empresa}</p>
                )}
              </div>
            </div>
          </div>

          {/* Contacto */}
          <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Información de Contacto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="contacto@empresa.com"
                  className={`w-full px-4 py-2 bg-[#0a0e1a] border ${
                    validationErrors.email ? 'border-red-500' : 'border-slate-600'
                  } rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500`}
                />
                {validationErrors.email && (
                  <p className="text-red-400 text-sm mt-1">{validationErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  Teléfono
                </label>
                <input
                  type="text"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  placeholder="+54 341 1234567"
                  className="w-full px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Ubicación */}
          <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Ubicación</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  Dirección
                </label>
                <input
                  type="text"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                  placeholder="Av. Ejemplo 1234"
                  className="w-full px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  Localidad
                </label>
                <input
                  type="text"
                  name="localidad"
                  value={formData.localidad}
                  onChange={handleChange}
                  placeholder="Rosario"
                  className="w-full px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  Provincia <span className="text-red-400">*</span>
                </label>
                <select
                  name="provincia"
                  value={formData.provincia}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 bg-[#0a0e1a] border ${
                    validationErrors.provincia ? 'border-red-500' : 'border-slate-600'
                  } rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500`}
                >
                  <option value="">Selecciona una provincia</option>
                  {PROVINCIAS_ARGENTINA.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
                {validationErrors.provincia && (
                  <p className="text-red-400 text-sm mt-1">{validationErrors.provincia}</p>
                )}
              </div>
            </div>
          </div>

          {/* Suscripción */}
          <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Suscripción</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  Estado de Suscripción
                </label>
                <select
                  name="estado_suscripcion"
                  value={formData.estado_suscripcion}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="activa">✅ Activa</option>
                  <option value="prueba">🔵 Prueba</option>
                  <option value="suspendida">⚠️ Suspendida</option>
                  <option value="cancelada">❌ Cancelada</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  Fecha de Suscripción
                </label>
                <input
                  type="date"
                  name="fecha_suscripcion"
                  value={formData.fecha_suscripcion}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="activo"
                    checked={formData.activo}
                    onChange={handleChange}
                    className="w-5 h-5 rounded border-slate-600 bg-[#0a0e1a] text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
                  />
                  <span className="text-slate-300">Empresa activa en el sistema</span>
                </label>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Notas / Observaciones
            </label>
            <textarea
              name="notas"
              value={formData.notas}
              onChange={handleChange}
              rows={3}
              placeholder="Información adicional sobre la empresa..."
              className="w-full px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5" />
                  {empresaToEdit ? 'Actualizar Empresa' : 'Crear Empresa'}
                </>
              )}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};

export default CrearEmpresaModal;
