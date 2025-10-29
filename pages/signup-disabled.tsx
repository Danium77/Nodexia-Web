import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

/**
 * PÁGINA DE REGISTRO DESHABILITADA
 * 
 * Decisión de arquitectura (19-Oct-2025):
 * - Solo Admin Nodexia puede crear usuarios
 * - No existe auto-registro ni solicitudes públicas
 * - Los usuarios son creados directamente por el administrador
 * 
 * Para crear usuarios: Admin debe usar /admin/usuarios
 */
export default function SignupDisabled() {
  const router = useRouter();

  // Opcional: redirigir automáticamente después de 5 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/login');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <>
      <title>Nodexia - Registro Deshabilitado</title>
      
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#0e1a2d] px-4">
        <Image
          src="/logo-nodexia.png"
          alt="Logo Nodexia"
          width={180}
          height={180}
          priority
        />

        <div className="w-full max-w-md flex flex-col items-center gap-6 px-8 py-10 rounded-xl bg-[#1b273b] border border-yellow-500/20">
          <ExclamationTriangleIcon className="h-20 w-20 text-yellow-400" />
          
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-50 mb-3">
              Registro No Disponible
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              El auto-registro está deshabilitado en <span className="font-semibold text-cyan-400">Nodexia</span>.
            </p>
            <p className="text-slate-300 text-sm leading-relaxed mt-3">
              Los usuarios son creados exclusivamente por el <span className="font-semibold text-cyan-400">Administrador Nodexia</span>.
            </p>
          </div>

          <div className="w-full flex flex-col gap-3 mt-4">
            <button
              onClick={() => router.push('/login')}
              className="w-full py-3 px-4 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors"
            >
              Ir a Login
            </button>

            <div className="text-center">
              <p className="text-slate-400 text-xs">
                Si necesitas acceso, contacta al administrador de tu empresa.
              </p>
            </div>
          </div>
        </div>

        <p className="text-slate-400 text-xs text-center max-w-sm">
          Serás redirigido a la página de login en 5 segundos...
        </p>
      </div>
    </>
  );
}
