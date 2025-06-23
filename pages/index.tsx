import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login'); // redirige automáticamente
  }, [router]);

  return null; // no muestra nada
}
