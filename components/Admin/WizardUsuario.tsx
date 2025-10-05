import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  UserIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface Empresa {
  id: string;
  nombre: string;
  cuit: string;
  tipo_empresa: string;
}

interface Rol {
  id: string;
  nombre_rol: string;
  tipo_empresa: string;
  descripcion?: string;
  permisos?: any;
  activo?: boolean;
}

interface WizardData {
  empresa: string;
  rol: string;
  email: string;
  nombre_completo: string;
  telefono: string;
  departamento: string;
  fecha_ingreso: string;
  notas: string;
}

interface WizardUsuarioProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const WizardUsuario: React.FC<WizardUsuarioProps> = ({ isOpen, onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estados para el modal de email existente
  const [showEmailExistsModal, setShowEmailExistsModal] = useState(false);
  const [emailExistente, setEmailExistente] = useState<string>('');
  
  // Datos del formulario
  const [formData, setFormData] = useState<WizardData>({
    empresa: '',
    rol: '',
    email: '',
    nombre_completo: '',
    telefono: '',
    departamento: '',
    fecha_ingreso: new Date().toISOString().split('T')[0],
    notas: ''
  });

  // Opciones para selectores
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [rolesDisponibles, setRolesDisponibles] = useState<Rol[]>([]);

  // Validaciones por paso
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (isOpen) {
      resetForm();
      loadEmpresas();
      loadRoles();
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.empresa) {
      filterRolesByEmpresa();
    }
  }, [formData.empresa, empresas, roles]);

  const loadEmpresas = async () => {
    try {
      console.log('Intentando cargar empresas...');
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nombre, cuit, tipo_empresa')
        .eq('activa', true)
        .order('nombre');

      console.log('Resultado consulta empresas:', { data, error });
      
      if (error) {
        console.error('Error específico empresas:', error);
        throw error;
      }
      
      setEmpresas(data || []);
      console.log('Empresas cargadas exitosamente:', data?.length || 0);
    } catch (err: any) {
      console.error('Error completo cargando empresas:', err);
      setError(`Error al cargar las empresas: ${err.message}`);
    }
  };

  // Función para setup automático de roles
  const setupRolesEmpresa = async () => {
    console.log('🚀 Ejecutando setup automático de roles...');

    try {
      const rolesData = [
        // Roles para empresas coordinadoras
        {
          nombre_rol: 'Administrador',
          tipo_empresa: 'coordinador',
          descripcion: 'Acceso completo al sistema',
          permisos: { admin: true, crear: true, editar: true, eliminar: true },
          activo: true
        },
        {
          nombre_rol: 'Coordinador',
          tipo_empresa: 'coordinador',
          descripcion: 'Gestión de despachos y seguimiento',
          permisos: { admin: false, crear: true, editar: true, eliminar: false },
          activo: true
        },
        {
          nombre_rol: 'Operador',
          tipo_empresa: 'coordinador',
          descripcion: 'Seguimiento y monitoreo de operaciones',
          permisos: { admin: false, crear: false, editar: true, eliminar: false },
          activo: true
        },
        // Roles para empresas de transporte
        {
          nombre_rol: 'Administrador',
          tipo_empresa: 'transporte',
          descripcion: 'Acceso completo al sistema de transporte',
          permisos: { admin: true, crear: true, editar: true, eliminar: true },
          activo: true
        },
        {
          nombre_rol: 'Supervisor',
          tipo_empresa: 'transporte',
          descripcion: 'Supervisión de flota y choferes',
          permisos: { admin: false, crear: true, editar: true, eliminar: false },
          activo: true
        },
        {
          nombre_rol: 'Chofer',
          tipo_empresa: 'transporte',
          descripcion: 'Acceso básico para conductores',
          permisos: { admin: false, crear: false, editar: false, eliminar: false },
          activo: true
        },
        // Roles para empresas mixtas
        {
          nombre_rol: 'Administrador General',
          tipo_empresa: 'ambos',
          descripcion: 'Acceso completo a coordinación y transporte',
          permisos: { admin: true, crear: true, editar: true, eliminar: true },
          activo: true
        },
        {
          nombre_rol: 'Coordinador de Operaciones',
          tipo_empresa: 'ambos',
          descripcion: 'Gestión integral de despachos y flota',
          permisos: { admin: false, crear: true, editar: true, eliminar: false },
          activo: true
        }
      ];

      // Intentar insertar los roles
      for (const rol of rolesData) {
        const { data: existing } = await supabase
          .from('roles_empresa')
          .select('id')
          .eq('nombre_rol', rol.nombre_rol)
          .eq('tipo_empresa', rol.tipo_empresa)
          .maybeSingle();

        if (!existing) {
          await supabase.from('roles_empresa').insert(rol);
          console.log(`✅ Rol creado: ${rol.nombre_rol} (${rol.tipo_empresa})`);
        }
      }

      return true;
    } catch (error: any) {
      console.error('❌ Error en setup de roles:', error.message);
      return false;
    }
  };

  const loadRoles = async () => {
    try {
      console.log('🔄 Cargando roles desde el módulo centralizado...');
      
      // Cargar solo roles activos desde la base de datos
      const { data, error } = await supabase
        .from('roles_empresa')
        .select('*')
        .eq('activo', true)
        .order('tipo_empresa, nombre_rol');

      console.log('📋 Resultado consulta roles:', { data, error });
      
      if (error) {
        console.error('❌ Error cargando roles:', error);
        // Mostrar mensaje al usuario sobre la necesidad de configurar roles
        setRoles([]);
        return;
      }

      if (!data || data.length === 0) {
        console.log('⚠️ No hay roles configurados en el sistema');
        setRoles([]);
      } else {
        setRoles(data);
        console.log('✅ Roles cargados exitosamente:', data.length);
      }
      
    } catch (err: any) {
      console.error('❌ Error completo cargando roles:', err);
      setRoles([]);
    }
  };

  const filterRolesByEmpresa = () => {
    const empresaSeleccionada = empresas.find(e => e.id === formData.empresa);
    console.log('🏢 Empresa seleccionada:', empresaSeleccionada);
    
    if (!empresaSeleccionada) {
      setRolesDisponibles([]);
      return;
    }

    // Filtrar roles según el tipo de empresa
    const rolesFiltrados = roles.filter(rol => 
      rol.tipo_empresa === empresaSeleccionada.tipo_empresa || 
      rol.tipo_empresa === 'ambos'
    );
    
    console.log(`📋 Roles disponibles para ${empresaSeleccionada.tipo_empresa}:`, rolesFiltrados.length);
    console.log('📋 Detalle de roles:', rolesFiltrados);
    
    setRolesDisponibles(rolesFiltrados);
    
    // Si el rol actual no está disponible, limpiar la selección
    if (formData.rol && !rolesFiltrados.find(r => r.id === formData.rol)) {
      console.log('⚠️ Rol actual no disponible para esta empresa, limpiando selección');
      setFormData(prev => ({ ...prev, rol: '' }));
    }
  };

  const resetForm = () => {
    setFormData({
      empresa: '',
      rol: '',
      email: '',
      nombre_completo: '',
      telefono: '',
      departamento: '',
      fecha_ingreso: new Date().toISOString().split('T')[0],
      notas: ''
    });
    setCurrentStep(1);
    setError(null);
    setValidationErrors({});
  };

  const validateStep = (step: number): boolean => {
    const errors: {[key: string]: string} = {};

    switch (step) {
      case 1: // Selección de empresa y rol
        if (!formData.empresa) {
          errors.empresa = 'Debes seleccionar una empresa';
        }
        if (!formData.rol) {
          errors.rol = 'Debes seleccionar un rol';
        }
        break;

      case 2: // Datos personales
        if (!formData.email) {
          errors.email = 'El email es requerido';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          errors.email = 'El formato del email no es válido';
        }
        
        if (!formData.nombre_completo.trim()) {
          errors.nombre_completo = 'El nombre completo es requerido';
        }
        break;

      case 3: // Información adicional
        if (!formData.fecha_ingreso) {
          errors.fecha_ingreso = 'La fecha de ingreso es requerida';
        }
        break;

      default:
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('usuarios_empresa')
        .select('email_interno')
        .eq('email_interno', email)
        .limit(1);

      if (error) throw error;
      return (data && data.length > 0);
    } catch (err) {
      console.error('Error verificando email:', err);
      return false;
    }
  };

  const mostrarOpcionesEmailExistente = async (email: string): Promise<{continuar: boolean, accion?: string}> => {
    setEmailExistente(email);
    setShowEmailExistsModal(true);
    
    return new Promise((resolve) => {
      // La promesa se resolverá cuando el usuario haga clic en algún botón del modal
      window.resolveEmailExistsModal = resolve;
    });
  };

  const handleEmailExistsAction = (accion: string) => {
    setShowEmailExistsModal(false);
    
    if (window.resolveEmailExistsModal) {
      if (accion === 'cancelar') {
        window.resolveEmailExistsModal({ continuar: false });
      } else if (accion === 'reenviar') {
        window.resolveEmailExistsModal({ continuar: true, accion: 'reenviar' });
      } else if (accion === 'cambiar') {
        window.resolveEmailExistsModal({ continuar: false });
        // Enfocar el campo de email para que el usuario pueda cambiarlo
        setError('Por favor, ingresa un email diferente.');
      }
      window.resolveEmailExistsModal = null;
    }
  };

  const reenviarInvitacionExistente = async (email: string) => {
    try {
      const response = await fetch('/api/admin/reenviar-invitacion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(`✅ Invitación reenviada exitosamente a ${email}.\n\nEl usuario recibirá un nuevo email de invitación.`);
        
        // Cerrar el wizard después de un breve delay
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess();
        }, 2000);
      } else {
        if (result.error === 'Usuario ya registrado') {
          setError(`ℹ️ Este usuario ya completó su registro y puede iniciar sesión normalmente.\n\nNo es necesario enviar otra invitación.`);
        } else {
          setError(`Error al reenviar invitación: ${result.error}`);
        }
      }
    } catch (error: any) {
      console.error('Error reenviando invitación:', error);
      setError(`Error de conexión: ${error.message}`);
    }
  };



  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    setError(null);

    try {
      console.log('📧 Enviando invitación formal por email...');

      // Dividir nombre completo en nombre y apellido
      const nombrePartes = formData.nombre_completo.trim().split(' ');
      const nombre = nombrePartes[0] || '';
      const apellido = nombrePartes.slice(1).join(' ') || '';

      // Obtener datos del rol seleccionado
      const rolSeleccionado = rolesDisponibles.find(r => r.id === formData.rol);

      // Enviar invitación usando el nuevo API formal
      const response = await fetch('/api/admin/nueva-invitacion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          nombre: nombre,
          apellido: apellido,
          telefono: formData.telefono || '',
          empresa_id: formData.empresa,
          rol_interno: rolSeleccionado?.nombre_rol || 'usuario',
          departamento: formData.departamento || ''
        })
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Invitación enviada exitosamente');
        setSuccess(`✅ Invitación enviada a ${formData.email}\n\n${result.message}`);
        
        // Cerrar el wizard después de 2 segundos
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        console.error('❌ Error enviando invitación:', result);
        if (result.error?.includes('already been registered')) {
          setError(`El email ${formData.email} ya está registrado. Use la opción "Reenviar Invitación" en su lugar.`);
        } else {
          setError(result.error || 'Error enviando la invitación');
        }
      }
    } catch (err: any) {
      console.error('Error enviando invitación:', err);
      setError(err.message || 'Error al enviar la invitación por email');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof WizardData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error de validación si existe
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getStepTitle = (step: number) => {
    const titles = {
      1: 'Empresa y Rol',
      2: 'Datos Personales', 
      3: 'Información Adicional',
      4: 'Confirmación'
    };
    return titles[step as keyof typeof titles] || '';
  };

  const getProgressPercentage = () => {
    return (currentStep / 4) * 100;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white">Crear Nuevo Usuario</h2>
            <p className="text-gray-400 mt-1">Paso {currentStep} de 4: {getStepTitle(currentStep)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-cyan-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`text-xs ${
                  step <= currentStep ? 'text-cyan-400' : 'text-gray-500'
                }`}
              >
                {getStepTitle(step)}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-6 bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              {error}
            </div>
          )}

          {/* Step 1: Empresa y Rol */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <BuildingOfficeIcon className="mx-auto h-12 w-12 text-cyan-400" />
                <h3 className="text-lg font-medium text-white mt-2">Seleccionar Empresa y Rol</h3>
                <p className="text-gray-400 mt-1">
                  Elige la empresa y el rol que tendrá el nuevo usuario
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Empresa *
                </label>
                <select
                  value={formData.empresa}
                  onChange={(e) => handleInputChange('empresa', e.target.value)}
                  className={`w-full bg-gray-700 border text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 ${
                    validationErrors.empresa ? 'border-red-500' : 'border-gray-600'
                  }`}
                >
                  <option value="">Seleccionar empresa...</option>
                  {empresas.map(empresa => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nombre} ({empresa.cuit}) - {empresa.tipo_empresa}
                    </option>
                  ))}
                </select>
                {validationErrors.empresa && (
                  <p className="text-red-400 text-sm mt-1">{validationErrors.empresa}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Rol *
                </label>
                <select
                  value={formData.rol}
                  onChange={(e) => handleInputChange('rol', e.target.value)}
                  disabled={!formData.empresa}
                  className={`w-full bg-gray-700 border text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                    validationErrors.rol ? 'border-red-500' : 'border-gray-600'
                  }`}
                >
                  <option value="">Seleccionar rol...</option>
                  {rolesDisponibles.map(rol => (
                    <option key={rol.id} value={rol.id}>
                      {rol.nombre_rol} - {rol.descripcion || 'Sin descripción'}
                    </option>
                  ))}
                </select>
                {validationErrors.rol && (
                  <p className="text-red-400 text-sm mt-1">{validationErrors.rol}</p>
                )}
                {formData.empresa && rolesDisponibles.length === 0 && (
                  <div className="bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-lg p-3 mt-2">
                    <p className="text-yellow-400 text-sm flex items-center gap-2">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      No hay roles disponibles para esta empresa
                    </p>
                    <p className="text-yellow-300 text-xs mt-1">
                      Debes crear roles en el{' '}
                      <a 
                        href="/admin/roles" 
                        target="_blank"
                        className="underline hover:text-yellow-200 font-medium"
                      >
                        módulo de Roles
                      </a>
                      {' '}antes de crear usuarios.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Datos Personales */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <UserIcon className="mx-auto h-12 w-12 text-cyan-400" />
                <h3 className="text-lg font-medium text-white mt-2">Datos Personales</h3>
                <p className="text-gray-400 mt-1">
                  Información básica del usuario
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="usuario@empresa.com"
                  className={`w-full bg-gray-700 border text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 ${
                    validationErrors.email ? 'border-red-500' : 'border-gray-600'
                  }`}
                />
                {validationErrors.email && (
                  <p className="text-red-400 text-sm mt-1">{validationErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={formData.nombre_completo}
                  onChange={(e) => handleInputChange('nombre_completo', e.target.value)}
                  placeholder="Juan Pérez"
                  className={`w-full bg-gray-700 border text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 ${
                    validationErrors.nombre_completo ? 'border-red-500' : 'border-gray-600'
                  }`}
                />
                {validationErrors.nombre_completo && (
                  <p className="text-red-400 text-sm mt-1">{validationErrors.nombre_completo}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => handleInputChange('telefono', e.target.value)}
                  placeholder="+54 11 1234-5678"
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
          )}

          {/* Step 3: Información Adicional */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <InformationCircleIcon className="mx-auto h-12 w-12 text-cyan-400" />
                <h3 className="text-lg font-medium text-white mt-2">Información Adicional</h3>
                <p className="text-gray-400 mt-1">
                  Detalles opcionales del usuario
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Departamento/Área
                </label>
                <input
                  type="text"
                  value={formData.departamento}
                  onChange={(e) => handleInputChange('departamento', e.target.value)}
                  placeholder="Operaciones, Administración, etc."
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Fecha de Ingreso *
                </label>
                <input
                  type="date"
                  value={formData.fecha_ingreso}
                  onChange={(e) => handleInputChange('fecha_ingreso', e.target.value)}
                  className={`w-full bg-gray-700 border text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 ${
                    validationErrors.fecha_ingreso ? 'border-red-500' : 'border-gray-600'
                  }`}
                />
                {validationErrors.fecha_ingreso && (
                  <p className="text-red-400 text-sm mt-1">{validationErrors.fecha_ingreso}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notas adicionales
                </label>
                <textarea
                  value={formData.notas}
                  onChange={(e) => handleInputChange('notas', e.target.value)}
                  placeholder="Información adicional sobre el usuario..."
                  rows={3}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 4: Confirmación */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
                <h3 className="text-lg font-medium text-white mt-2">Confirmar Información</h3>
                <p className="text-gray-400 mt-1">
                  Revisa los datos antes de crear el usuario
                </p>
              </div>

              <div className="bg-gray-700 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Empresa:</p>
                    <p className="text-white font-medium">
                      {empresas.find(e => e.id === formData.empresa)?.nombre}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Rol:</p>
                    <p className="text-white font-medium">
                      {rolesDisponibles.find(r => r.id === formData.rol)?.nombre_rol}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Email:</p>
                    <p className="text-white font-medium">{formData.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Nombre:</p>
                    <p className="text-white font-medium">{formData.nombre_completo}</p>
                  </div>
                  {formData.telefono && (
                    <div>
                      <p className="text-sm text-gray-400">Teléfono:</p>
                      <p className="text-white font-medium">{formData.telefono}</p>
                    </div>
                  )}
                  {formData.departamento && (
                    <div>
                      <p className="text-sm text-gray-400">Departamento:</p>
                      <p className="text-white font-medium">{formData.departamento}</p>
                    </div>
                  )}
                </div>
                
                <div>
                  <p className="text-sm text-gray-400">Fecha de Ingreso:</p>
                  <p className="text-white font-medium">
                    {new Date(formData.fecha_ingreso).toLocaleDateString('es-AR')}
                  </p>
                </div>
                
                {formData.notas && (
                  <div>
                    <p className="text-sm text-gray-400">Notas:</p>
                    <p className="text-white">{formData.notas}</p>
                  </div>
                )}
              </div>

              <div className="bg-blue-900 border border-blue-700 text-blue-100 px-4 py-3 rounded flex items-center gap-2">
                <EnvelopeIcon className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="font-medium">Se enviará invitación por email</p>
                  <p className="text-sm text-blue-200">
                    El usuario recibirá un email con instrucciones para activar su cuenta
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1 || loading}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Anterior
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            
            <button
              onClick={handleNext}
              disabled={loading}
              className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creando...
                </>
              ) : currentStep === 4 ? (
                <>
                  <CheckCircleIcon className="h-4 w-4" />
                  Crear Usuario
                </>
              ) : (
                <>
                  Siguiente
                  <ArrowRightIcon className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Email Existente */}
      {showEmailExistsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-8 w-8 text-amber-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-white">Email Ya Registrado</h3>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-300 mb-4">
                El email <strong>{emailExistente}</strong> ya está registrado en el sistema.
              </p>
              <p className="text-sm text-gray-400">
                ¿Qué te gustaría hacer?
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleEmailExistsAction('reenviar')}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                🔄 Reenviar Invitación
                <div className="text-xs text-blue-200 mt-1">El usuario recibirá un nuevo email de invitación</div>
              </button>
              
              <button
                onClick={() => handleEmailExistsAction('cambiar')}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                ✏️ Usar Email Diferente
                <div className="text-xs text-green-200 mt-1">Cambiar a otro email para este usuario</div>
              </button>
              
              <button
                onClick={() => handleEmailExistsAction('cancelar')}
                className="w-full px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                ❌ Cancelar
                <div className="text-xs text-gray-400 mt-1">Cerrar wizard y revisar usuario existente</div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WizardUsuario;