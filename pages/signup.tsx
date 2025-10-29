import { useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { 
  UserIcon, 
  AtSymbolIcon, 
  PhoneIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabaseClient';

export default function SignupSolicitud() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [form, setForm] = useState({
    nombre_completo: '',
    email: '',
    telefono: '',
    empresa_nombre: '',
    empresa_cuit: '',
    tipo_empresa_solicitado: '',
    motivo: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errorMsg) setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;

    // Validaciones básicas
    if (!form.nombre_completo || !form.email || !form.telefono || 
        !form.empresa_nombre || !form.empresa_cuit || !form.tipo_empresa_solicitado || !form.motivo) {
      setErrorMsg('Por favor completa todos los campos.');
      return;
    }

    if (!form.email.includes('@')) {
      setErrorMsg('Por favor ingresa un email válido.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // Insertar en tabla solicitudes_registro (público tiene INSERT permitido)
      const { error } = await supabase
        .from('solicitudes_registro')
        .insert([{
          nombre_completo: form.nombre_completo,
          email: form.email,
          telefono: form.telefono,
          empresa_nombre: form.empresa_nombre,
          empresa_cuit: form.empresa_cuit,
          tipo_empresa_solicitado: form.tipo_empresa_solicitado,
          motivo: form.motivo,
          estado: 'pendiente'
        }]);

      if (error) {
        console.error('Error al enviar solicitud:', error);
        setErrorMsg('Error al enviar la solicitud. Por favor intenta nuevamente.');
        setLoading(false);
        return;
      }

      // Mostrar pantalla de éxito
      setSuccess(true);
      setLoading(false);
      
    } catch (error: any) {
      console.error('Error inesperado:', error);
      setErrorMsg('Ocurrió un error inesperado. Por favor intenta nuevamente.');
      setLoading(false);
    }
  };

  const handleNuevaSolicitud = () => {
    setSuccess(false);
    setForm({
      nombre_completo: '',
      email: '',
      telefono: '',
      empresa_nombre: '',
      empresa_cuit: '',
      tipo_empresa_solicitado: '',
      motivo: ''
    });
  };

  // Pantalla de éxito
  if (success) {
    return (
      <>
        <title>Nodexia  Solicitud Enviada</title>
        
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#0e1a2d] px-4">
          <Image
            src="/logo-nodexia.png"
            alt="Logo Nodexia"
            width={180}
            height={180}
            priority
          />

          <div className="w-full max-w-md flex flex-col items-center gap-6 px-8 py-10 rounded-xl bg-[#1b273b] border border-cyan-500/20">
            <CheckCircleIcon className="h-20 w-20 text-green-400" />
            
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-50 mb-3">
                ¡Solicitud Enviada Exitosamente!
              </h1>
              <p className="text-slate-300 text-sm leading-relaxed">
                Hemos recibido tu solicitud de acceso a <span className="font-semibold text-cyan-400">Nodexia</span>.
              </p>
              <p className="text-slate-300 text-sm leading-relaxed mt-2">
                Nuestro equipo revisará tu información y te contactaremos en <span className="font-semibold text-cyan-400">24-48 horas</span>.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full mt-4">
              <button
                onClick={() => router.push('/login')}
                className="flex-1 px-6 py-3 rounded-md bg-gradient-to-r from-blue-600 to-cyan-400 text-white font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all active:scale-95"
              >
                Ir al Login
              </button>
              <button
                onClick={handleNuevaSolicitud}
                className="flex-1 px-6 py-3 rounded-md bg-[#0e1a2d] text-cyan-400 font-semibold border border-cyan-500/30 hover:bg-cyan-500/10 transition-all active:scale-95"
              >
                Enviar otra solicitud
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Formulario de solicitud
  return (
    <>
      <title>Nodexia  Solicitar Acceso</title>

      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#0e1a2d] px-4 py-8">
        <Image
          src="/logo-nodexia.png"
          alt="Logo Nodexia"
          width={160}
          height={160}
          priority
        />

        <form
          onSubmit={handleSubmit}
          className="w-full max-w-2xl flex flex-col gap-6 px-8 py-8 rounded-xl bg-[#1b273b] border border-cyan-500/20"
        >
          <div className="text-center mb-2">
            <h1 className="text-3xl font-bold text-slate-50 mb-2">
              Solicitar Acceso a Nodexia
            </h1>
            <p className="text-slate-400 text-sm">
              Completa el formulario y nos pondremos en contacto contigo pronto
            </p>
          </div>

          {/* Sección 1: Información Personal */}
          <div className="border-b border-slate-700 pb-6">
            <h2 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
               Información Personal
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-300">Nombre Completo *</span>
                <div className="flex items-center gap-2 px-4 py-3 rounded-md bg-[#0e1a2d] focus-within:ring-2 ring-cyan-500/70">
                  <UserIcon className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                  <input
                    type="text"
                    name="nombre_completo"
                    required
                    placeholder="Juan Pérez"
                    className="flex-1 bg-transparent outline-none text-slate-100 placeholder-slate-500"
                    value={form.nombre_completo}
                    onChange={handleChange}
                  />
                </div>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-300">Email *</span>
                <div className="flex items-center gap-2 px-4 py-3 rounded-md bg-[#0e1a2d] focus-within:ring-2 ring-cyan-500/70">
                  <AtSymbolIcon className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="juan@empresa.com"
                    className="flex-1 bg-transparent outline-none text-slate-100 placeholder-slate-500"
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-300">Teléfono *</span>
                <div className="flex items-center gap-2 px-4 py-3 rounded-md bg-[#0e1a2d] focus-within:ring-2 ring-cyan-500/70">
                  <PhoneIcon className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                  <input
                    type="tel"
                    name="telefono"
                    required
                    placeholder="+54 9 11 1234-5678"
                    className="flex-1 bg-transparent outline-none text-slate-100 placeholder-slate-500"
                    value={form.telefono}
                    onChange={handleChange}
                  />
                </div>
              </label>
            </div>
          </div>

          {/* Sección 2: Información de la Empresa */}
          <div className="border-b border-slate-700 pb-6">
            <h2 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
               Información de la Empresa
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-300">Nombre de la Empresa *</span>
                <div className="flex items-center gap-2 px-4 py-3 rounded-md bg-[#0e1a2d] focus-within:ring-2 ring-cyan-500/70">
                  <BuildingOfficeIcon className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                  <input
                    type="text"
                    name="empresa_nombre"
                    required
                    placeholder="Mi Empresa S.A."
                    className="flex-1 bg-transparent outline-none text-slate-100 placeholder-slate-500"
                    value={form.empresa_nombre}
                    onChange={handleChange}
                  />
                </div>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-300">CUIT *</span>
                <div className="flex items-center gap-2 px-4 py-3 rounded-md bg-[#0e1a2d] focus-within:ring-2 ring-cyan-500/70">
                  <DocumentTextIcon className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                  <input
                    type="text"
                    name="empresa_cuit"
                    required
                    placeholder="20-12345678-9"
                    className="flex-1 bg-transparent outline-none text-slate-100 placeholder-slate-500"
                    value={form.empresa_cuit}
                    onChange={handleChange}
                  />
                </div>
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-300">Tipo de Empresa *</span>
                <div className="flex items-center gap-2 px-4 py-3 rounded-md bg-[#0e1a2d] focus-within:ring-2 ring-cyan-500/70">
                  <BuildingOfficeIcon className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                  <select
                    name="tipo_empresa_solicitado"
                    required
                    className="flex-1 bg-transparent outline-none text-slate-100 cursor-pointer"
                    value={form.tipo_empresa_solicitado}
                    onChange={handleChange}
                  >
                    <option value="" className="bg-[#1b273b]">Selecciona un tipo...</option>
                    <option value="planta" className="bg-[#1b273b]"> Planta Productora</option>
                    <option value="transporte" className="bg-[#1b273b]"> Empresa de Transporte</option>
                    <option value="cliente" className="bg-[#1b273b]"> Cliente / Comprador</option>
                  </select>
                </div>
              </label>
            </div>
          </div>

          {/* Sección 3: Motivo */}
          <div className="pb-2">
            <h2 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
               Cuéntanos más
            </h2>
            
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-300">
                ¿Por qué quieres acceder a Nodexia? *
              </span>
              <textarea
                name="motivo"
                required
                rows={4}
                placeholder="Describe brevemente tu interés en la plataforma..."
                className="px-4 py-3 rounded-md bg-[#0e1a2d] text-slate-100 placeholder-slate-500 outline-none focus:ring-2 ring-cyan-500/70 resize-none"
                value={form.motivo}
                onChange={handleChange}
              />
            </label>
          </div>

          {/* Mensaje de error */}
          {errorMsg && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-md bg-red-500/10 border border-red-500/20">
              <ExclamationCircleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{errorMsg}</p>
            </div>
          )}

          {/* Botón de envío */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-4 rounded-md bg-gradient-to-r from-blue-600 to-cyan-400 text-white font-semibold text-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-cyan-500/30 active:scale-95"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Enviando solicitud...
              </span>
            ) : (
              ' Enviar Solicitud'
            )}
          </button>

          {/* Link a login */}
          <div className="text-center pt-4 border-t border-slate-700">
            <p className="text-sm text-slate-400">
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-cyan-400 hover:text-cyan-300 font-medium hover:underline transition-colors"
              >
                Inicia sesión
              </button>
            </p>
          </div>
        </form>
      </div>
    </>
  );
}
