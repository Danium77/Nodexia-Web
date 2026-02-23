import '../styles/globals.css';
import 'leaflet/dist/leaflet.css';
import type { AppProps } from "next/app";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { UserRoleProvider } from '../lib/contexts/UserRoleContext';
import { useServiceWorker } from '../lib/hooks/usePWA';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Registrar Service Worker para PWA
  useServiceWorker();

  // Page transition loading indicator
  useEffect(() => {
    const handleStart = (url: string) => {
      if (url !== router.asPath) setIsNavigating(true);
    };
    const handleDone = () => setIsNavigating(false);

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleDone);
    router.events.on('routeChangeError', handleDone);
    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleDone);
      router.events.off('routeChangeError', handleDone);
    };
  }, [router]);
  
  // Páginas que NO necesitan el UserRoleContext
  const publicPages = ['/login', '/signup', '/complete-invite'];
  const isPublicPage = publicPages.includes(router.pathname);
  
  // Si es página pública, no envolver en UserRoleProvider
  if (isPublicPage) {
    return (
      <ErrorBoundary>
        {isNavigating && <LoadingSpinner fullScreen text="Cargando..." />}
        <Component {...pageProps} />
      </ErrorBoundary>
    );
  }
  
  // Páginas protegidas usan UserRoleProvider
  return (
    <ErrorBoundary>
      {isNavigating && <LoadingSpinner fullScreen text="Cargando..." />}
      <UserRoleProvider>
        <Component {...pageProps} />
      </UserRoleProvider>
    </ErrorBoundary>
  );
}
