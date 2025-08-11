import { useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { AtSymbolIcon, KeyIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabaseClient';

interface Role {
  name: string;
}

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

    // 1. Iniciar sesión con Supabase
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword(form);

    if (loginError) {
      setLoading(false);
      setErrorMsg(loginError.message);
      return;
    }

    if (loginData.user) {
      // 2. Una vez logueado, consultar su rol desde la tabla 'profile_users'
      const { data: profileUserData, error: profileError } = await supabase
        .from('profile_users')
        .select('roles(name)') // Sintaxis correcta para la relación
        .eq('user_id', loginData.user.id)
        .single();

      // --- INICIO DEBUG ---
      console.log('Datos del perfil obtenidos:', profileUserData);
      console.log('Error al obtener perfil:', profileError);
      // --- FIN DEBUG ---

      if (profileError) {
        console.error("Error al obtener el rol del usuario:", profileError);
        // Si hay un error (ej. el usuario no está en la tabla), lo mandamos al dashboard por defecto.
        router.push('/dashboard');
        setLoading(false);
        return;
      }

      // 3. Redirigir según el rol
      const isAdmin = Array.isArray(profileUserData?.roles)
        ? (profileUserData.roles as Role[]).some((role) => role.name === 'admin')
        : (profileUserData?.roles as Role)?.name === 'admin';
      if (isAdmin) {
        router.push('/admin/usuarios'); // ¡Si es admin, va a la página de admin!
      } else {
        console.log(`Rol detectado: '${isAdmin ? 'admin' : 'otro'}'. Redirigiendo a dashboard.`);
        router.push('/dashboard'); // Si no, al dashboard normal.
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = () => {
    alert('Función de recuperar contraseña no implementada.');
  };

  return (
    <>
      <title>Nodexia • Iniciar Sesión</title>

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

          {errorMsg && <p className="text-sm text-red-400 -mt-2">{errorMsg}</p>}

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-md bg-gradient-to-r from-blue-600 to-cyan-400 text-white font-semibold disabled:opacity-60"
          >
            {loading ? 'Iniciando…' : 'Iniciar Sesión'}
          </button>

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
      </div>
    </>
  );
}
