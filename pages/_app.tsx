import '../styles/globals.css';
import 'leaflet/dist/leaflet.css';
import type { AppProps } from "next/app";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import * as Sentry from '@sentry/nextjs';
import { UserRoleProvider } from '@/lib/contexts/UserRoleContext';
import { FeatureFlagProvider } from '@/lib/contexts/FeatureFlagContext';
import { useServiceWorker } from '@/lib/hooks/usePWA';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { supabase } from '@/lib/supabaseClient';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Registrar Service Worker para PWA
  useServiceWorker();

  // Setear usuario en Sentry para contexto de errores
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        Sentry.setUser({ id: session.user.id, email: session.user.email });
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        Sentry.setUser({ id: session.user.id, email: session.user.email });
      } else {
        Sentry.setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Page transition loading indicator with safety timeout
  useEffect(() => {
    let safetyTimer: ReturnType<typeof setTimeout> | null = null;

    const handleStart = (url: string) => {
      if (url !== router.asPath) {
        setIsNavigating(true);
        // Safety timeout: force-clear after 8 seconds to avoid infinite loading
        if (safetyTimer) clearTimeout(safetyTimer);
        safetyTimer = setTimeout(() => setIsNavigating(false), 8000);
      }
    };
    const handleDone = () => {
      setIsNavigating(false);
      if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleDone);
    router.events.on('routeChangeError', handleDone);
    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleDone);
      router.events.off('routeChangeError', handleDone);
      if (safetyTimer) clearTimeout(safetyTimer);
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
        <FeatureFlagProvider>
          <Component {...pageProps} />
        </FeatureFlagProvider>
      </UserRoleProvider>
    </ErrorBoundary>
  );
}
