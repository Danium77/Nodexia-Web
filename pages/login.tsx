import { useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { AtSymbolIcon, KeyIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabaseClient';

// Función para traducir errores de Supabase a mensajes profesionales
const getErrorMessage = (error: any): string => {
  const errorMessage = error?.message?.toLowerCase() || '';
  
  if (errorMessage.includes('invalid login') || errorMessage.includes('invalid credentials')) {
    return 'Email o contraseña incorrectos. Por favor, verifica tus datos.';
  }
  if (errorMessage.includes('email not confirmed')) {
    return 'Por favor confirma tu email antes de iniciar sesión.';
  }
  if (errorMessage.includes('too many requests')) {
    return 'Demasiados intentos. Por favor, espera unos minutos e intenta nuevamente.';
  }
  if (errorMessage.includes('user not found')) {
    return 'No existe una cuenta con este email. ¿Deseas registrarte?';
  }
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return 'Error de conexión. Verifica tu internet e intenta nuevamente.';
  }
  
  // Error genérico
  return 'Ocurrió un error al iniciar sesión. Por favor, intenta nuevamente.';
};

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Limpiar error al escribir
    if (errorMsg) setErrorMsg('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevenir múltiples clicks (Mejora 3)
    if (loading) return;
    
    console.log(' Iniciando proceso de login...');
    setLoading(true);
    setErrorMsg('');

    try {
      // Validación básica del lado del cliente
      if (!form.email || !form.password) {
        setErrorMsg('Por favor completa todos los campos.');
        setLoading(false);
        return;
      }

      if (!form.email.includes('@')) {
        setErrorMsg('Por favor ingresa un email válido.');
        setLoading(false);
        return;
      }

      // Limpiar cache de usuario anterior ANTES de autenticar
      if (typeof window !== 'undefined') {
        localStorage.removeItem('nodexia_user');
        localStorage.removeItem('nodexia_roles');
        localStorage.removeItem('nodexia_lastFetch');
      }

      // Autenticar con Supabase
      console.log('🔐 Autenticando con Supabase...');
      const { error: loginError } = await supabase.auth.signInWithPassword(form);

      if (loginError) {
        // Suprimir el error para que no aparezca en el overlay de Next.js
        console.log('❌ Error de login (esperado):', loginError.message);
        setErrorMsg(getErrorMessage(loginError));
        setLoading(false);
        return;
      }

      console.log('✅ Login exitoso');
      
      // Limpiar el formulario
      setForm({ email: '', password: '' });
      
      // Redirigir al dashboard - UserRoleContext se encargará del resto
      console.log(' Redirigiendo a dashboard...');
      await router.push('/dashboard');
      
      // Nota: No ponemos setLoading(false) aquí porque queremos mantener
      // el estado de loading durante la redirección
      
    } catch (error: any) {
      console.error(' Error inesperado en login:', error);
      setErrorMsg(getErrorMessage(error));
      setLoading(false);
    }
  };

  return (
    <>
      <title>Nodexia  Iniciar Sesión</title>

      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#0e1a2d] px-4">
        <Image
          src="/logo-nodexia.png"
          alt="Logo Nodexia"
          width={200}
          height={200}
          priority
        />

        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm flex flex-col gap-4"
        >
          <h1 className="text-2xl font-semibold text-slate-50 text-center mb-2">
            Iniciar Sesión
          </h1>

          <label className="flex items-center gap-2 px-4 py-3 rounded-md bg-[#1b273b] focus-within:ring-2 ring-cyan-500/70">
            <AtSymbolIcon className="h-5 w-5 text-cyan-400" />
            <input
              type="email"
              name="email"
              required
              placeholder="Email"
              className="flex-1 bg-transparent outline-none text-slate-100 placeholder-slate-400"
              onChange={handleChange}
              value={form.email}
            />
          </label>

          <label className="flex items-center gap-2 px-4 py-3 rounded-md bg-[#1b273b] focus-within:ring-2 ring-cyan-500/70">
            <KeyIcon className="h-5 w-5 text-cyan-400" />
            <input
              type="password"
              name="password"
              required
              placeholder="Contraseña"
              className="flex-1 bg-transparent outline-none text-slate-100 placeholder-slate-400"
              onChange={handleChange}
              value={form.password}
            />
          </label>

          {/* Mensaje de error profesional */}
          {errorMsg && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-md bg-red-500/10 border border-red-500/20 -mt-2">
              <ExclamationCircleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{errorMsg}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-md bg-gradient-to-r from-blue-600 to-cyan-400 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-cyan-500/30 active:scale-95"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Iniciando sesión...
              </span>
            ) : (
              'Iniciar Sesión'
            )}
          </button>

          <div className="text-center mt-4">
            <p className="text-sm text-slate-400 mb-2">
              ¿No tienes cuenta?
            </p>
            <button
              type="button"
              onClick={() => router.push('/signup')}
              className="text-cyan-400 hover:text-cyan-300 font-medium text-sm hover:underline transition-colors"
            >
               Solicitar Acceso a Nodexia
            </button>
            <p className="text-xs text-slate-500 mt-2">
              Para nuevas empresas, solicita acceso y te contactaremos pronto
            </p>
          </div>
        </form>
      </div>
    </>
  );
}
