import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabaseClient';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import { getRolDisplayName } from '@/lib/utils/roleHelpers';
import { ROLES_BY_TIPO, RolInterno, TipoEmpresa, ROL_INTERNO_LABELS } from '@/lib/types';
import {
  UserIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  // ShieldCheckIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

// Declarar el tipo extendido para window
declare global {
  interface Window {
    resolveEmailExistsModal?: ((value: { continuar: boolean; accion?: string }) => void) | null;
  }
}

interface Empresa {
  id: string;
  nombre: string;
  cuit: string;
  tipo_empresa: string;
}

interface WizardData {
  empresa: string;
  rol: string;
  email: string;
  nombre_completo: string;
  telefono: string;
  dni: string;
  departamento: string;
  fecha_ingreso: string;
  notas: string;
}

interface WizardUsuarioProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode?: 'create' | 'edit';
  initialData?: {
    user_id?: string;
    empresa_id?: string;
    empresa_nombre?: string;
    rol_id?: string;
    rol_nombre?: string;
    email?: string;
    nombre_completo?: string;
    telefono?: string;
    dni?: string;
    departamento?: string;
  };
}

const WizardUsuario: React.FC<WizardUsuarioProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  mode = 'create',
  initialData 
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [autoSaved, setAutoSaved] = useState(false); // Indicador de guardado automático
  const isMountedRef = useRef(true); // Para evitar errores de setState después de desmontar
  
  // Estados para el modal de email existente
  const [showEmailExistsModal, setShowEmailExistsModal] = useState(false);
  const [emailExistente] = useState<string>(''); // setEmailExistente solo se usaba en función comentada
  
  // Datos del formulario
  const [formData, setFormData] = useState<WizardData>({
    empresa: '',
    rol: '',
    email: '',
    nombre_completo: '',
    telefono: '',
    dni: '',
    departamento: '',
    fecha_ingreso: new Date().toISOString().split('T')[0] || '',
    notas: ''
  });

  // Opciones para selectores
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [rolesDisponibles, setRolesDisponibles] = useState<RolInterno[]>([]);

  // Validaciones por paso
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Cleanup al desmontar
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Persistir estado del wizard en sessionStorage
  useEffect(() => {
    if (isOpen) {
      // Marcar que el modal está abierto
      sessionStorage.setItem('wizardUsuarioOpen', 'true');
      
      // Si es modo edición, cargar datos iniciales
      if (mode === 'edit' && initialData) {
        const nombrePartes = (initialData.nombre_completo || '').trim().split(' ');
        const nombre = nombrePartes[0] || '';
        const apellido = nombrePartes.slice(1).join(' ') || '';
        
        setFormData({
          empresa: initialData.empresa_id || '',
          rol: initialData.rol_id || '',
          email: initialData.email || '',
          nombre_completo: initialData.nombre_completo || '',
          telefono: initialData.telefono || '',
          dni: initialData.dni || '',
          departamento: initialData.departamento || '',
          fecha_ingreso: new Date().toISOString().split('T')[0] || '',
          notas: ''
        });
        setCurrentStep(2); // Saltar paso de empresa/rol en edición
      } else {
        // Modo creación: intentar recuperar estado guardado
        const savedState = sessionStorage.getItem('wizardUsuarioState');
        if (savedState) {
          try {
            const parsed = JSON.parse(savedState);
            setFormData(parsed.formData || formData);
            setCurrentStep(parsed.currentStep || 1);
            console.log('[WizardUsuario] Estado recuperado de sessionStorage');
          } catch (e) {
            console.error('[WizardUsuario] Error al parsear estado guardado:', e);
            resetForm();
          }
        } else {
          resetForm();
        }
      }
      loadEmpresas();
    } else {
      // Limpiar sessionStorage cuando se cierra el modal intencionalmente
      sessionStorage.removeItem('wizardUsuarioState');
      sessionStorage.removeItem('wizardUsuarioOpen');
    }
  }, [isOpen, mode, initialData]);

  // Guardar estado cada vez que cambia
  useEffect(() => {
    if (isOpen) {
      const stateToSave = {
        formData,
        currentStep
      };
      sessionStorage.setItem('wizardUsuarioState', JSON.stringify(stateToSave));
      
      // Mostrar indicador de guardado automático
      setAutoSaved(true);
      const timer = setTimeout(() => setAutoSaved(false), 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [formData, currentStep, isOpen]);

  useEffect(() => {
    if (formData.empresa) {
      filterRolesByEmpresa();
    }
  }, [formData.empresa, empresas]);

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

  const filterRolesByEmpresa = () => {
    const empresaSeleccionada = empresas.find(e => e.id === formData.empresa);
    console.log('🏢 Empresa seleccionada:', empresaSeleccionada);
    
    if (!empresaSeleccionada) {
      setRolesDisponibles([]);
      return;
    }

    // 🔥 Usar mapeo de roles del sistema nuevo
    const rolesFiltrados = ROLES_BY_TIPO[empresaSeleccionada.tipo_empresa as TipoEmpresa] || [];
    
    console.log(`📋 Roles disponibles para ${empresaSeleccionada.tipo_empresa}:`, rolesFiltrados.length);
    console.log('📋 Detalle de roles:', rolesFiltrados);
    
    setRolesDisponibles(rolesFiltrados);
    
    // Si el rol actual no está disponible, limpiar la selección
    if (formData.rol && !rolesFiltrados.includes(formData.rol as RolInterno)) {
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
      dni: '',
      departamento: '',
      fecha_ingreso: new Date().toISOString().split('T')[0] || '',
      notas: ''
    });
    setCurrentStep(1);
    setError(null);
    setValidationErrors({});
    sessionStorage.removeItem('wizardUsuarioState');
    sessionStorage.removeItem('wizardUsuarioOpen');
  };

  const handleClose = () => {
    // Si hay datos en el formulario, preguntar antes de cerrar
    const hasData = formData.empresa || formData.rol || formData.email || formData.nombre_completo;
    
    if (hasData && currentStep > 1) {
      const confirmClose = window.confirm(
        '¿Estás seguro de que deseas cerrar? Los datos ingresados se guardarán temporalmente.'
      );
      if (!confirmClose) return;
    }
    
    onClose();
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

  // NO SE USA - COMENTADA
  /*
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
  */

  // NO SE USA - COMENTADA
  /*
  const mostrarOpcionesEmailExistente = async (email: string): Promise<{continuar: boolean, accion?: string}> => {
    setEmailExistente(email);
    setShowEmailExistsModal(true);
    
    return new Promise((resolve) => {
      // La promesa se resolverá cuando el usuario haga clic en algún botón del modal
      window.resolveEmailExistsModal = resolve;
    });
  };
  */

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

  // NO SE USA - COMENTADA
  /*
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
        console.log('✅ Invitación reenviada exitosamente');
        if (isMountedRef.current) {
          setSuccess(`✅ Invitación reenviada exitosamente a ${email}.\n\nEl usuario recibirá un nuevo email de invitación.`);
        }
        
        // Limpiar sessionStorage antes de cerrar
        sessionStorage.removeItem('wizardUsuarioState');
        sessionStorage.removeItem('wizardUsuarioOpen');
        
        // Cerrar el wizard después de un breve delay
        setTimeout(() => {
          onClose();
          setTimeout(() => {
            if (onSuccess) onSuccess();
          }, 100);
        }, 2000);
      } else {
        if (result.error === 'Usuario ya registrado') {
          if (isMountedRef.current) {
            setError(`ℹ️ Este usuario ya completó su registro y puede iniciar sesión normalmente.\n\nNo es necesario enviar otra invitación.`);
          }
        } else {
          if (isMountedRef.current) {
            setError(`Error al reenviar invitación: ${result.error}`);
          }
        }
      }
    } catch (error: any) {
      console.error('Error reenviando invitación:', error);
      setError(`Error de conexión: ${error.message}`);
    }
  };
  */



  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    setError(null);

    try {
      // Dividir nombre completo en nombre y apellido
      const nombrePartes = formData.nombre_completo.trim().split(' ');
      const nombre = nombrePartes[0] || '';
      const apellido = nombrePartes.slice(1).join(' ') || '';

      if (mode === 'edit' && initialData?.user_id) {
        // MODO EDICIÓN
        console.log('📝 Actualizando usuario existente...');

        const response = await fetchWithAuth('/api/admin/actualizar-usuario', {
          method: 'PUT',
          body: JSON.stringify({
            user_id: initialData.user_id,
            nombre_completo: formData.nombre_completo,
            telefono: formData.telefono || '',
            dni: formData.dni || '',
            departamento: formData.departamento || ''
          })
        });

        const result = await response.json();

        if (response.ok) {
          console.log('✅ Usuario actualizado exitosamente');
          
          if (isMountedRef.current) {
            setSuccess(
              `✅ Usuario actualizado exitosamente\n\n` +
              `👤 Nombre: ${formData.nombre_completo}\n` +
              `📧 Email: ${formData.email}\n` +
              `📞 Teléfono: ${formData.telefono || 'No especificado'}\n` +
              `🆔 DNI: ${formData.dni || 'No especificado'}`
            );
          }
          
          // Limpiar sessionStorage
          sessionStorage.removeItem('wizardUsuarioState');
          sessionStorage.removeItem('wizardUsuarioOpen');
          
          // Cerrar y notificar éxito
          setTimeout(() => {
            onClose();
            setTimeout(() => {
              if (onSuccess) onSuccess();
            }, 100);
          }, 2000);
        } else {
          throw new Error(result.error || 'Error al actualizar usuario');
        }
      } else {
        // MODO CREACIÓN (código original)
        console.log('📧 Enviando invitación formal por email...');

        // El rol ya es un RolInterno (string), no necesitamos buscar
        const rolInterno = formData.rol as RolInterno;

      // Enviar invitación usando el nuevo API formal
      const response = await fetchWithAuth('/api/admin/nueva-invitacion', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email,
          nombre: nombre,
          apellido: apellido,
          telefono: formData.telefono || '',
          dni: formData.dni || '',
          empresa_id: formData.empresa,
          rol_interno: rolInterno,
          departamento: formData.departamento || ''
        })
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Invitación procesada exitosamente');
        
        if (isMountedRef.current) {
          // Mensaje diferente según el método usado
          let successMsg = '';
          
          if (result.metodo === 'email_activacion') {
            // CON SMTP: Email de activación enviado
            successMsg = `✅ Usuario creado exitosamente!\n\n` +
              `📧 Email: ${result.usuario.email}\n` +
              `👤 Nombre: ${result.usuario.nombre_completo}\n` +
              `🏢 Empresa: ${result.usuario.empresa}\n` +
              `📍 Rol: ${result.usuario.rol_interno}\n\n` +
              `📬 EMAIL DE ACTIVACIÓN ENVIADO\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
              `El usuario recibirá un email con instrucciones\n` +
              `para activar su cuenta y establecer su contraseña.\n\n` +
              `⚠️ IMPORTANTE:\n` +
              `• El link de activación expira en 24 horas\n` +
              `• El usuario debe revisar su bandeja de entrada\n` +
              `• Si no recibe el email, verifica la carpeta de spam\n` +
              `• Esta ventana se cerrará automáticamente en 10 segundos`;
          } else {
            // SIN SMTP: Credenciales temporales
            successMsg = `✅ Usuario creado exitosamente!\n\n` +
              `📧 Email: ${result.usuario.email}\n` +
              `👤 Nombre: ${result.usuario.nombre_completo}\n` +
              `🏢 Empresa: ${result.usuario.empresa}\n` +
              `📍 Rol: ${result.usuario.rol_interno}\n\n` +
              `🔑 CREDENCIALES TEMPORALES:\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
              `Email: ${result.usuario.email}\n` +
              `Password: ${result.password_temporal}\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `⚠️ IMPORTANTE:\n` +
              `• Guarda estas credenciales ahora\n` +
              `• Envíalas al usuario por WhatsApp o mensaje directo\n` +
              `• El usuario debe cambiar su contraseña en el primer login\n` +
              `• Esta ventana se cerrará automáticamente en 30 segundos`;
          }
          
          setSuccess(successMsg);
        }
        
        // Limpiar sessionStorage antes de cerrar
        sessionStorage.removeItem('wizardUsuarioState');
        sessionStorage.removeItem('wizardUsuarioOpen');
        
        // Tiempo de cierre según el método
        const closeDelay = result.metodo === 'email_activacion' ? 10000 : 30000;
        
        // Cerrar el wizard después del delay
        setTimeout(() => {
          // Primero cerrar el modal para evitar errores de DOM
          onClose();
          // Luego llamar a onSuccess para recargar la lista
          setTimeout(() => {
            onSuccess();
          }, 100);
        }, closeDelay);
      } else {
        console.error('❌ Error enviando invitación:', result);
        if (isMountedRef.current) {
          if (result.error?.includes('already been registered')) {
            setError(`El email ${formData.email} ya está registrado. Use la opción "Reenviar Invitación" en su lugar.`);
          } else {
            setError(result.error || 'Error enviando la invitación');
          }
        }
      }
      } // Cierre del else (modo creación)

    } catch (err: any) {
      console.error('Error en handleSubmit:', err);
      setError(err.message || 'Error procesando la solicitud');
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


  // --- NUEVO ESTADO Y FUNCIONES PARA BUSQUEDA PREDICTIVA DE EMPRESA POR CUIT ---
  const [searchCuit, setSearchCuit] = useState('');
  const [filteredEmpresas, setFilteredEmpresas] = useState<Empresa[]>([]);
  const [showEmpresaSuggestions, setShowEmpresaSuggestions] = useState(false);

  const handleCuitSearch = (value: string) => {
    setSearchCuit(value);
    if (value.length === 0) {
      setFilteredEmpresas([]);
      setShowEmpresaSuggestions(false);
      handleInputChange('empresa', '');
      return;
    }
    const filtered = empresas.filter(e => e.cuit.includes(value));
    setFilteredEmpresas(filtered);
    setShowEmpresaSuggestions(filtered.length > 0);
    handleInputChange('empresa', '');
  };

  const handleEmpresaSelect = (empresa: Empresa) => {
    handleInputChange('empresa', empresa.id);
    setSearchCuit(empresa.cuit);
    setFilteredEmpresas([]);
    setShowEmpresaSuggestions(false);
  };

  if (!isOpen) return null;

  // Usar portal para evitar conflictos de React DOM
  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">
              {mode === 'edit' ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-gray-400">Paso {currentStep} de 4: {getStepTitle(currentStep)}</p>
              {autoSaved && (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <CheckCircleIcon className="h-3 w-3" />
                  Guardado
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
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
          {success && (
            <div className="mb-6 bg-green-900 border border-green-700 text-green-100 px-4 py-3 rounded">
              <div className="flex items-start gap-2">
                <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <pre className="whitespace-pre-wrap text-sm font-mono">{success}</pre>
                  {success.includes('🔗 Link') && (
                    <div className="mt-4 space-y-2">
                      <div className="text-yellow-300 text-sm font-semibold flex items-center gap-2">
                        ⏰ Este modal se cerrará automáticamente en 30 segundos
                      </div>
                      <button
                        onClick={() => {
                          const linkMatch = success.match(/🔗 Link de activación:\n(.+)\n/);
                          const passwordMatch = success.match(/Password: (.+)\n/);
                          if (linkMatch && passwordMatch) {
                            navigator.clipboard.writeText(
                              `Link de activación: ${linkMatch[1]}\n\nCredenciales temporales:\n${passwordMatch[0]}`
                            );
                            alert('✅ Credenciales copiadas al portapapeles');
                          }
                        }}
                        className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors w-full"
                      >
                        📋 Copiar credenciales al portapapeles
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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
                <h3 className="text-lg font-medium text-white mt-2">
                  {mode === 'edit' ? 'Empresa y Rol (No Editables)' : 'Seleccionar Empresa y Rol'}
                </h3>
                <p className="text-gray-400 mt-1">
                  {mode === 'edit' 
                    ? 'Estos campos no se pueden modificar. Usa la tabla principal para gestionar roles.'
                    : 'Elige la empresa y el rol que tendrá el nuevo usuario'
                  }
                </p>
              </div>
              {mode === 'edit' ? (
                // Modo edición: Mostrar datos bloqueados
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Empresa
                    </label>
                    <input
                      type="text"
                      value={initialData?.empresa_nombre || ''}
                      disabled
                      className="w-full bg-gray-700 border border-gray-600 text-gray-400 rounded-lg px-3 py-2 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Rol
                    </label>
                    <input
                      type="text"
                      value={initialData?.rol_nombre || ''}
                      disabled
                      className="w-full bg-gray-700 border border-gray-600 text-gray-400 rounded-lg px-3 py-2 cursor-not-allowed"
                    />
                  </div>
                  <div className="bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-lg p-3">
                    <p className="text-yellow-300 text-xs">
                      ⚠️ Para cambiar empresa o roles, usa los botones en la tabla de Gestión de Usuarios.
                    </p>
                  </div>
                </>
              ) : (
                // Modo creación: Formulario normal
                <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Empresa (buscar por CUIT) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={empresas.find(e => e.id === formData.empresa)?.cuit || searchCuit || ''}
                    onChange={e => handleCuitSearch(e.target.value)}
                    placeholder="Ingresá el número de CUIT..."
                    className={`w-full bg-gray-700 border text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 ${validationErrors.empresa ? 'border-red-500' : 'border-gray-600'}`}
                  />
                  {showEmpresaSuggestions && filteredEmpresas.length > 0 && (
                    <ul className="absolute z-10 w-full bg-gray-800 border border-gray-600 rounded-lg mt-1 max-h-48 overflow-y-auto">
                      {filteredEmpresas.map(empresa => (
                        <li
                          key={empresa.id}
                          className="px-4 py-2 cursor-pointer hover:bg-cyan-700 text-white"
                          onClick={() => handleEmpresaSelect(empresa)}
                        >
                          {empresa.cuit} - {empresa.nombre} ({empresa.tipo_empresa})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
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
                  {rolesDisponibles.map(rol => {
                    const empresaSeleccionada = empresas.find(e => e.id === formData.empresa);
                    const displayName = getRolDisplayName(rol, empresaSeleccionada?.tipo_empresa || 'planta');
                    return (
                      <option key={rol} value={rol}>
                        {displayName}
                      </option>
                    );
                  })}
                </select>
                {validationErrors.rol && (
                  <p className="text-red-400 text-sm mt-1">{validationErrors.rol}</p>
                )}
                {formData.empresa && rolesDisponibles.length === 0 && (
                  <div className="bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-lg p-3 mt-2">
                    <p className="text-yellow-400 text-sm flex items-center gap-2">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      No hay roles configurados para este tipo de empresa.
                    </p>
                  </div>
                )}
              </div>
              </>
              )}
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
                  Email {mode === 'edit' ? '(No editable)' : '*'}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="usuario@empresa.com"
                  disabled={mode === 'edit'}
                  className={`w-full bg-gray-700 border text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 ${
                    mode === 'edit' ? 'cursor-not-allowed text-gray-400' : ''
                  } ${
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
                  DNI
                </label>
                <input
                  type="text"
                  value={formData.dni}
                  onChange={(e) => handleInputChange('dni', e.target.value)}
                  placeholder="12345678"
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500"
                />
                <p className="text-gray-400 text-xs mt-1">
                  Necesario para vincular choferes a la flota
                </p>
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
                      {formData.rol ? ROL_INTERNO_LABELS[formData.rol as RolInterno] || formData.rol : 'No seleccionado'}
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
                  {mode === 'edit' ? 'Actualizando...' : 'Creando...'}
                </>
              ) : currentStep === 4 ? (
                <>
                  <CheckCircleIcon className="h-4 w-4" />
                  {mode === 'edit' ? 'Guardar Cambios' : 'Crear Usuario'}
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

  // Renderizar usando portal para evitar errores de React DOM
  if (typeof window === 'undefined') return null;
  return createPortal(modalContent, document.body);
};

export default WizardUsuario;