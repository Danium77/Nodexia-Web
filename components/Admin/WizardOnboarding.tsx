import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  BuildingOfficeIcon,
  UserIcon,
  CreditCardIcon,
  CogIcon,
  DocumentCheckIcon
} from '@heroicons/react/24/outline';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Plan {
  id: string;
  nombre: string;
  precio_mensual: number;
  caracteristicas: any;
}

interface TipoEmpresa {
  id: string;
  nombre: string;
  descripcion: string;
}

interface ClienteData {
  // Paso 1: Información Básica
  nombre: string;
  cuit: string;
  email: string;
  telefono: string;
  direccion: string;
  
  // Paso 2: Tipo de Negocio
  tipoEcosistema: string;
  
  // Paso 3: Plan
  planId: string;
  
  // Paso 4: Configuración
  configuraciones: {
    zona_horaria: string;
    moneda: string;
    idioma: string;
  };
}

const pasos = [
  {
    id: 1,
    titulo: 'Información Básica',
    descripcion: 'Datos principales de la empresa',
    icono: BuildingOfficeIcon
  },
  {
    id: 2,
    titulo: 'Tipo de Negocio',
    descripcion: 'Seleccionar ecosistema',
    icono: CogIcon
  },
  {
    id: 3,
    titulo: 'Plan de Suscripción',
    descripcion: 'Elegir plan y límites',
    icono: CreditCardIcon
  },
  {
    id: 4,
    titulo: 'Configuración',
    descripcion: 'Preferencias iniciales',
    icono: CogIcon
  },
  {
    id: 5,
    titulo: 'Confirmación',
    descripcion: 'Revisar y crear',
    icono: DocumentCheckIcon
  }
];

interface WizardOnboardingProps {
  onClose: () => void;
  onComplete: (clienteId: string) => void;
}

export default function WizardOnboarding({ onClose, onComplete }: WizardOnboardingProps) {
  const [pasoActual, setPasoActual] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [tiposEmpresa, setTiposEmpresa] = useState<TipoEmpresa[]>([]);
  
  const [clienteData, setClienteData] = useState<ClienteData>({
    nombre: '',
    cuit: '',
    email: '',
    telefono: '',
    direccion: '',
    tipoEcosistema: '',
    planId: '',
    configuraciones: {
      zona_horaria: 'America/Argentina/Buenos_Aires',
      moneda: 'ARS',
      idioma: 'es'
    }
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      // Cargar planes
      const { data: planesData } = await supabase
        .from('planes_suscripcion')
        .select('*')
        .eq('activo', true);

      // Cargar tipos de empresa
      const { data: tiposData } = await supabase
        .from('tipos_empresa_ecosistema')
        .select('*')
        .eq('activo', true);

      setPlanes(planesData || []);
      setTiposEmpresa(tiposData || []);
    } catch (err) {
      console.error('Error cargando datos:', err);
    }
  };

  const validarPaso = (paso: number): boolean => {
    switch (paso) {
      case 1:
        return !!(clienteData.nombre && clienteData.cuit && clienteData.email);
      case 2:
        return !!clienteData.tipoEcosistema;
      case 3:
        return !!clienteData.planId;
      case 4:
        return true; // Configuraciones son opcionales
      case 5:
        return true; // Solo confirmación
      default:
        return false;
    }
  };

  const verificarCUITExistente = async (cuit: string) => {
    if (!cuit || cuit.length < 10) return;
    
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nombre')
        .eq('cuit', cuit)
        .limit(1);

      if (error) {
        console.error('Error verificando CUIT:', error);
        return;
      }

      if (data && data.length > 0) {
        setError(`Ya existe una empresa registrada con el CUIT ${cuit}: "${data[0].nombre}"`);
      } else {
        setError(null);
      }
    } catch (err) {
      console.error('Error en verificación:', err);
    }
  };

  const siguientePaso = () => {
    if (validarPaso(pasoActual)) {
      setPasoActual(prev => Math.min(prev + 1, 5));
      setError(null);
    } else {
      setError('Por favor completa todos los campos obligatorios');
    }
  };

  const pasoAnterior = () => {
    setPasoActual(prev => Math.max(prev - 1, 1));
    setError(null);
  };

  const crearCliente = async () => {
    setLoading(true);
    setError(null);

    try {
      // Encontrar el tipo de empresa por nombre
      const tipoEmpresa = tiposEmpresa.find(t => t.nombre === clienteData.tipoEcosistema);
      
      // 1. Crear empresa solamente
      const empresaData = {
        nombre: clienteData.nombre,
        cuit: clienteData.cuit,
        email: clienteData.email,
        telefono: clienteData.telefono || null,
        direccion: clienteData.direccion || null,
        tipo_ecosistema_id: tipoEmpresa?.id || null,
        plan_suscripcion_id: clienteData.planId,
        activa: true,
        configuracion_empresa: clienteData.configuraciones,
        created_at: new Date().toISOString()
      };

      console.log('Datos a enviar:', empresaData); // Para debug

      const { data: empresaCreada, error: empresaError } = await supabase
        .from('empresas')
        .insert([empresaData])
        .select()
        .single();

      if (empresaError) {
        console.error('Error detallado:', empresaError);
        
        // Manejar errores específicos
        if (empresaError.code === '23505' && empresaError.message.includes('empresas_cuit_key')) {
          throw new Error('Ya existe una empresa registrada con este CUIT. Por favor verifica el número o contacta al administrador.');
        } else if (empresaError.code === '23505' && empresaError.message.includes('empresas_email_key')) {
          throw new Error('Ya existe una empresa registrada con este email corporativo.');
        } else {
          throw new Error(empresaError.message || 'Error desconocido al crear la empresa');
        }
      }

      onComplete(empresaCreada.id);
    } catch (err: any) {
      console.error('Error creando cliente:', err);
      setError('Error creando cliente: ' + (err.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  };

  const renderPaso = () => {
    switch (pasoActual) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Nombre de la Empresa *</label>
                <input
                  type="text"
                  value={clienteData.nombre}
                  onChange={(e) => setClienteData(prev => ({ ...prev, nombre: e.target.value }))}
                  className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                  placeholder="Transportes Ejemplo S.A."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">CUIT *</label>
                <input
                  type="text"
                  value={clienteData.cuit}
                  onChange={(e) => {
                    const newCuit = e.target.value;
                    setClienteData(prev => ({ ...prev, cuit: newCuit }));
                    
                    // Verificar CUIT después de un delay
                    if (newCuit.length >= 10) {
                      setTimeout(() => verificarCUITExistente(newCuit), 500);
                    }
                  }}
                  className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                  placeholder="20-12345678-9"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Email Corporativo *</label>
                <input
                  type="email"
                  value={clienteData.email}
                  onChange={(e) => setClienteData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                  placeholder="contacto@ejemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Teléfono</label>
                <input
                  type="text"
                  value={clienteData.telefono}
                  onChange={(e) => setClienteData(prev => ({ ...prev, telefono: e.target.value }))}
                  className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                  placeholder="+54 11 1234-5678"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">Dirección</label>
              <input
                type="text"
                value={clienteData.direccion}
                onChange={(e) => setClienteData(prev => ({ ...prev, direccion: e.target.value }))}
                className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                placeholder="Av. Ejemplo 1234, CABA"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <p className="text-gray-300">Selecciona el tipo de empresa en el ecosistema Nodexia</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tiposEmpresa.map((tipo) => (
                <button
                  key={tipo.id}
                  onClick={() => setClienteData(prev => ({ ...prev, tipoEcosistema: tipo.nombre }))}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    clienteData.tipoEcosistema === tipo.nombre
                      ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400'
                      : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <h3 className="text-lg font-bold mb-2">{tipo.nombre}</h3>
                  <p className="text-sm opacity-80">{tipo.descripcion}</p>
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <p className="text-gray-300">Selecciona el plan de suscripción inicial</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {planes.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setClienteData(prev => ({ ...prev, planId: plan.id }))}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    clienteData.planId === plan.id
                      ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400'
                      : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <h3 className="text-lg font-bold mb-2">{plan.nombre}</h3>
                  <p className="text-2xl font-bold text-green-400 mb-2">${plan.precio_mensual}/mes</p>
                  <div className="text-sm opacity-80">
                    {plan.caracteristicas && Object.entries(plan.caracteristicas).map(([key, value]) => (
                      <div key={key}>{key}: {String(value)}</div>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <p className="text-gray-300">Configuraciones iniciales (opcionales)</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Zona Horaria</label>
                <select
                  value={clienteData.configuraciones.zona_horaria}
                  onChange={(e) => setClienteData(prev => ({ 
                    ...prev, 
                    configuraciones: { ...prev.configuraciones, zona_horaria: e.target.value }
                  }))}
                  className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-500"
                >
                  <option value="America/Argentina/Buenos_Aires">Buenos Aires</option>
                  <option value="America/Argentina/Cordoba">Córdoba</option>
                  <option value="America/Argentina/Mendoza">Mendoza</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Moneda</label>
                <select
                  value={clienteData.configuraciones.moneda}
                  onChange={(e) => setClienteData(prev => ({ 
                    ...prev, 
                    configuraciones: { ...prev.configuraciones, moneda: e.target.value }
                  }))}
                  className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-500"
                >
                  <option value="ARS">Peso Argentino (ARS)</option>
                  <option value="USD">Dólar (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Idioma</label>
                <select
                  value={clienteData.configuraciones.idioma}
                  onChange={(e) => setClienteData(prev => ({ 
                    ...prev, 
                    configuraciones: { ...prev.configuraciones, idioma: e.target.value }
                  }))}
                  className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-500"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                  <option value="pt">Português</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 5:
        const planSeleccionado = planes.find(p => p.id === clienteData.planId);
        const tipoSeleccionado = tiposEmpresa.find(t => t.nombre === clienteData.tipoEcosistema);
        
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-white mb-2">Resumen del Cliente</h3>
              <p className="text-gray-300">Revisa los datos antes de crear el cliente</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-700 rounded-lg p-6">
                <h4 className="font-bold text-white mb-4">Información de la Empresa</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-400">Nombre:</span> <span className="text-white">{clienteData.nombre}</span></div>
                  <div><span className="text-gray-400">CUIT:</span> <span className="text-white">{clienteData.cuit}</span></div>
                  <div><span className="text-gray-400">Email:</span> <span className="text-white">{clienteData.email}</span></div>
                  <div><span className="text-gray-400">Tipo:</span> <span className="text-white">{tipoSeleccionado?.nombre}</span></div>
                  <div><span className="text-gray-400">Teléfono:</span> <span className="text-white">{clienteData.telefono || 'No especificado'}</span></div>
                </div>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-6">
                <h4 className="font-bold text-white mb-4">Plan y Configuración</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-400">Plan:</span> <span className="text-white">{planSeleccionado?.nombre}</span></div>
                  <div><span className="text-gray-400">Precio:</span> <span className="text-green-400">${planSeleccionado?.precio_mensual}/mes</span></div>
                  <div><span className="text-gray-400">Zona Horaria:</span> <span className="text-white">{clienteData.configuraciones.zona_horaria}</span></div>
                  <div><span className="text-gray-400">Moneda:</span> <span className="text-white">{clienteData.configuraciones.moneda}</span></div>
                  <div><span className="text-gray-400">Idioma:</span> <span className="text-white">{clienteData.configuraciones.idioma}</span></div>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-500/20 border border-blue-500 text-blue-300 p-4 rounded-lg">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="font-medium">Próximo paso</h4>
                  <p className="text-sm mt-1">Una vez creado el cliente, podrás agregar usuarios y asignar roles desde el módulo correspondiente en el panel de administración.</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-6 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Nuevo Cliente</h2>
              <p className="text-cyan-100 mt-1">Wizard de onboarding paso a paso</p>
            </div>
            <button
              onClick={onClose}
              className="text-cyan-100 hover:text-white text-xl font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            {pasos.map((paso, index) => (
              <div key={paso.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  pasoActual >= paso.id 
                    ? 'bg-cyan-500 border-cyan-500 text-white' 
                    : 'border-gray-600 text-gray-400'
                }`}>
                  {pasoActual > paso.id ? (
                    <CheckCircleIcon className="h-6 w-6" />
                  ) : (
                    <paso.icono className="h-5 w-5" />
                  )}
                </div>
                {index < pasos.length - 1 && (
                  <div className={`w-16 h-0.5 mx-2 ${
                    pasoActual > paso.id ? 'bg-cyan-500' : 'bg-gray-600'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-white">{pasos[pasoActual - 1]?.titulo}</h3>
            <p className="text-gray-400 text-sm">{pasos[pasoActual - 1]?.descripcion}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-400 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}
          
          {renderPaso()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex justify-between">
          <button
            onClick={pasoAnterior}
            disabled={pasoActual === 1}
            className="flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Anterior
          </button>

          {pasoActual === 5 ? (
            <button
              onClick={crearCliente}
              disabled={loading}
              className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Cliente'}
              <CheckCircleIcon className="h-4 w-4 ml-2" />
            </button>
          ) : (
            <button
              onClick={siguientePaso}
              disabled={!validarPaso(pasoActual)}
              className="flex items-center px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50"
            >
              Siguiente
              <ArrowRightIcon className="h-4 w-4 ml-2" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}