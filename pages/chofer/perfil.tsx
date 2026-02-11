// pages/chofer/perfil.tsx
// Redirige al tab perfil de chofer-mobile
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ChoferPerfil() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/chofer-mobile?tab=perfil');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <p className="text-gray-400">Redirigiendo a perfil...</p>
    </div>
  );
}
