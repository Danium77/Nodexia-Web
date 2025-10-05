import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  XMarkIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CogIcon,
  UserGroupIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

interface Rol {
  id?: string;
  nombre_rol: string;
  tipo_empresa: 'coordinador' | 'transporte' | 'ambos';
  descripcion?: string;
  permisos?: any;
  activo: boolean;
}

interface FormularioRolProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rol?: Rol | null;
}

const FormularioRol: React.FC<FormularioRolProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  rol = null 
}) => {
  const [formData, setFormData] = useState<Rol>({
    nombre_rol: '',
    tipo_empresa: 'coordinador',
    descripcion: '',
    permisos: {},
    activo: true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Permisos disponibles por categoría
  const categoriasPermisos = {
    despachos: {
      nombre: 'Despachos',
      permisos: ['ver', 'crear', 'editar', 'eliminar', 'asignar']
    },
    flota: {
      nombre: 'Flota',
      permisos: ['ver', 'crear', 'editar', 'eliminar', 'mantenimiento']
    },
    choferes: {
      nombre: 'Choferes',
      permisos: ['ver', 'crear', 'editar', 'eliminar', 'asignar']
    },
    reportes: {
      nombre: 'Reportes',
      permisos: ['ver', 'crear', 'exportar', 'compartir']
    },
    usuarios: {
      nombre: 'Usuarios',
      permisos: ['ver', 'crear', 'editar', 'eliminar', 'gestionar_roles']
    },
    configuracion: {
      nombre: 'Configuración',
      permisos: ['ver', 'editar', 'backup', 'integraciones']
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (rol) {
        // Modo edición
        setFormData({
          ...rol,
          permisos: rol.permisos || {}
        });
      } else {
        // Modo creación
        setFormData({
          nombre_rol: '',
          tipo_empresa: 'coordinador',
          descripcion: '',
          permisos: {},
          activo: true
        });
      }
      setError(null);
      setValidationErrors({});
    }
  }, [isOpen, rol]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpiar error de validación del campo
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handlePermisoChange = (categoria: string, permiso: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      permisos: {
        ...prev.permisos,
        [categoria]: {
          ...prev.permisos?.[categoria],
          [permiso]: value
        }
      }
    }));
  };

  const validarFormulario = (): boolean => {
    const errors: {[key: string]: string} = {};

    if (!formData.nombre_rol.trim()) {
      errors.nombre_rol = 'El nombre del rol es obligatorio';
    }

    if (!formData.tipo_empresa) {
      errors.tipo_empresa = 'Debe seleccionar un tipo de empresa';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const verificarNombreUnico = async (nombre: string): Promise<boolean> => {
    try {
      let query = supabase
        .from('roles_empresa')
        .select('id')
        .eq('nombre_rol', nombre)
        .eq('tipo_empresa', formData.tipo_empresa);

      // Si estamos editando, excluir el rol actual
      if (rol?.id) {
        query = query.neq('id', rol.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data.length === 0;
    } catch (error) {
      console.error('Error verificando nombre único:', error);
      return true; // En caso de error, permitir continuar
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validarFormulario()) return;

    setLoading(true);
    setError(null);

    try {
      // Verificar nombre único
      const nombreUnico = await verificarNombreUnico(formData.nombre_rol.trim());
      if (!nombreUnico) {
        setError('Ya existe un rol con ese nombre para este tipo de empresa');
        setLoading(false);
        return;
      }

      const rolData = {
        nombre_rol: formData.nombre_rol.trim(),
        tipo_empresa: formData.tipo_empresa,
        descripcion: formData.descripcion?.trim() || null,
        permisos: formData.permisos,
        activo: formData.activo
      };

      if (rol?.id) {
        // Actualizar rol existente
        const { error } = await supabase
          .from('roles_empresa')
          .update({
            ...rolData,
            updated_at: new Date().toISOString()
          })
          .eq('id', rol.id);

        if (error) throw error;
      } else {
        // Crear nuevo rol
        const { error } = await supabase
          .from('roles_empresa')
          .insert([rolData]);

        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error guardando rol:', error);
      setError(error.message || 'Error al guardar el rol');
    } finally {
      setLoading(false);
    }
  };

  const getIconoTipo = (tipo: string) => {
    switch (tipo) {
      case 'coordinador':
        return <CogIcon className="h-5 w-5" />;
      case 'transporte':
        return <UserGroupIcon className="h-5 w-5" />;
      case 'ambos':
        return <BuildingOfficeIcon className="h-5 w-5" />;
      default:
        return <ShieldCheckIcon className="h-5 w-5" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <ShieldCheckIcon className="h-6 w-6 text-cyan-400" />
            <h2 className="text-xl font-semibold text-white">
              {rol ? 'Editar Rol' : 'Crear Nuevo Rol'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error general */}
          {error && (
            <div className="bg-red-900 bg-opacity-40 border border-red-700 rounded-lg p-4 flex items-center gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0" />
              <span className="text-red-300">{error}</span>
            </div>
          )}

          {/* Información básica */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre del Rol *
              </label>
              <input
                type="text"
                value={formData.nombre_rol}
                onChange={(e) => handleInputChange('nombre_rol', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg bg-gray-800 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${
                  validationErrors.nombre_rol ? 'border-red-700' : 'border-gray-700'
                }`}
                placeholder="Ej: Administrador, Coordinador, etc."
              />
              {validationErrors.nombre_rol && (
                <p className="text-red-400 text-sm mt-1">{validationErrors.nombre_rol}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tipo de Empresa *
              </label>
              <select
                value={formData.tipo_empresa}
                onChange={(e) => handleInputChange('tipo_empresa', e.target.value as 'coordinador' | 'transporte' | 'ambos')}
                className={`w-full px-3 py-2 border rounded-lg bg-gray-800 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${
                  validationErrors.tipo_empresa ? 'border-red-700' : 'border-gray-700'
                }`}
              >
                <option value="coordinador">
                  Coordinador - Solo empresas coordinadoras
                </option>
                <option value="transporte">
                  Transporte - Solo empresas de transporte
                </option>
                <option value="ambos">
                  Universal - Cualquier tipo de empresa
                </option>
              </select>
              {validationErrors.tipo_empresa && (
                <p className="text-red-400 text-sm mt-1">{validationErrors.tipo_empresa}</p>
              )}
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Descripción
            </label>
            <textarea
              value={formData.descripcion || ''}
              onChange={(e) => handleInputChange('descripcion', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="Describe las responsabilidades y funciones de este rol..."
            />
          </div>

          {/* Estado */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="activo"
              checked={formData.activo}
              onChange={(e) => handleInputChange('activo', e.target.checked)}
              className="h-4 w-4 text-cyan-400 focus:ring-cyan-500 border-gray-700 bg-gray-800 rounded"
            />
            <label htmlFor="activo" className="text-sm font-medium text-gray-300">
              Rol activo (disponible para asignar a usuarios)
            </label>
          </div>

          {/* Permisos */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-cyan-400" />
              Permisos del Rol
            </h3>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.entries(categoriasPermisos).map(([categoriaKey, categoria]) => (
                  <div key={categoriaKey} className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                    <h4 className="font-medium text-cyan-300 mb-3 flex items-center gap-2">
                      {getIconoTipo('coordinador')}
                      {categoria.nombre}
                    </h4>
                    <div className="space-y-2">
                      {categoria.permisos.map((permiso) => (
                        <label key={permiso} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permisos?.[categoriaKey]?.[permiso] || false}
                            onChange={(e) => handlePermisoChange(categoriaKey, permiso, e.target.checked)}
                            className="h-4 w-4 text-cyan-400 focus:ring-cyan-500 border-gray-700 bg-gray-800 rounded"
                          />
                          <span className="text-sm text-gray-300 capitalize">
                            {permiso.replace('_', ' ')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Información adicional */}
          <div className="bg-blue-900 bg-opacity-50 border border-blue-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {getIconoTipo(formData.tipo_empresa)}
              </div>
              <div>
                <h4 className="text-sm font-medium text-blue-300">
                  Tipo de empresa: {formData.tipo_empresa === 'ambos' ? 'Universal' : formData.tipo_empresa}
                </h4>
                <p className="text-sm text-blue-200 mt-1">
                  {formData.tipo_empresa === 'coordinador' && 'Este rol solo estará disponible para empresas coordinadoras'}
                  {formData.tipo_empresa === 'transporte' && 'Este rol solo estará disponible para empresas de transporte'}
                  {formData.tipo_empresa === 'ambos' && 'Este rol estará disponible para cualquier tipo de empresa'}
                </p>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:bg-gray-400 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-4 w-4" />
                  {rol ? 'Actualizar Rol' : 'Crear Rol'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormularioRol;