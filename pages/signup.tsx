import { useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { AtSymbolIcon, KeyIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabaseClient';

export default function SignUp() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    const { error } = await supabase.auth.signUp(form);
    setLoading(false);

    if (error) return setErrorMsg(error.message);
    router.push('/login');
  };

  return (
    <>
      <title>Nodexia • Registro</title>

      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#0e1a2d] px-4">
        {/* logo */}
        <Image
          src="/logo-nodexia.png"
          alt="Logo Nodexia"
          width={200}
          height={200}
          priority
        />

        <form
          onSubmit={handleRegister}
          className="w-full max-w-sm flex flex-col gap-4"
        >
          <h1 className="text-2xl font-semibold text-slate-50 text-center mb-2">
            Crear cuenta
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
            {loading ? 'Creando…' : 'Registrarme'}
          </button>

          <p className="text-center text-sm text-slate-300 mt-1">
            ¿Ya tienes cuenta?{' '}
            <span
              onClick={() => router.push('/login')}
              className="cursor-pointer text-cyan-400 hover:underline"
            >
              Inicia sesión
            </span>
          </p>
        </form>
      </div>
    </>
  );
}
