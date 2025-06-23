import { useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { AtSymbolIcon, KeyIcon } from '@heroicons/react/24/outline';
import { PhoneIcon, EnvelopeIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline'; // Asegúrate de tener estos importados
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    const { error } = await supabase.auth.signInWithPassword(form);
    setLoading(false);

    if (error) return setErrorMsg(error.message);

    // NUEVO: Después del login exitoso, forzar un refresco de sesión
    // Esto a menudo resuelve problemas de estado de usuario inconsistente
    const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
        console.error("Error al refrescar sesión después del login:", refreshError.message);
        setErrorMsg("Error de sesión. Intenta de nuevo.");
        return;
    }
    
    router.push('/dashboard'); // Redirigir al dashboard
  };

  const handleForgotPassword = () => {
    router.push('/recuperar-contrasena');
  };

  return (
    <>
      <title>Nodexia • Iniciar sesión</title>

      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#0e1a2d] px-4">
        <Image
          src="/logo-nodexia.png" // Asegúrate de que esta sea la ruta correcta a tu logo completo
          alt="Logo Nodexia"
          width={200}
          height={200}
          priority
        />

        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm flex flex-col gap-4"
        >
          <label className="flex items-center gap-2 px-4 py-3 rounded-md bg-[#1b273b] focus-within:ring-2 ring-cyan-500/70">
            <AtSymbolIcon className="h-5 w-5 text-cyan-400" />
            <input
              type="email"
              name="email"
              required
              placeholder="Email"
              className="flex-1 bg-transparent outline-none text-slate-100 placeholder-slate-400"
              onChange={handleChange}
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
            />
          </label>

          {errorMsg && (
            <p className="text-sm text-red-400 -mt-2">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-md bg-gradient-to-r from-blue-600 to-cyan-400 text-white font-semibold disabled:opacity-60"
          >
            {loading ? 'Ingresando…' : 'Iniciar sesión'}
          </button>

          <p className="text-center text-sm mt-2">
            <span
              onClick={handleForgotPassword}
              className="cursor-pointer text-cyan-400 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </span>
          </p>

          <p className="text-center text-sm text-slate-300 mt-1">
            ¿No tienes cuenta?{' '}
            <span
              onClick={() => router.push('/signup')}
              className="cursor-pointer text-cyan-400 hover:underline"
            >
              Regístrate
            </span>
          </p>
        </form>

        <div className="w-full max-w-sm flex flex-col gap-2 mt-8 text-center text-slate-400 text-sm">
          <p>Contactate con soporte:</p>
          <div className="flex justify-center gap-6">
            <a href="tel:+54911xxxxxxxx" className="flex items-center gap-1 text-slate-300 hover:text-cyan-400 transition-colors">
              <PhoneIcon className="h-5 w-5" />
              <span>+54 9 11 xxxx-xxxx</span>
            </a>
            <a href="mailto:soporte@nodexia.com" className="flex items-center gap-1 text-slate-300 hover:text-cyan-400 transition-colors">
              <EnvelopeIcon className="h-5 w-5" />
              <span>soporte@nodexia.com</span>
            </a>
            <a href="https://wa.me/54911xxxxxxxx?text=Hola%20Nodexia,%20necesito%20soporte" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-slate-300 hover:text-cyan-400 transition-colors">
              <ChatBubbleBottomCenterTextIcon className="h-5 w-5" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}