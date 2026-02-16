import '../styles/globals.css';
import 'leaflet/dist/leaflet.css';
import type { AppProps } from "next/app";
import { useRouter } from 'next/router';
import { UserRoleProvider } from '../lib/contexts/UserRoleContext';
import { useServiceWorker } from '../lib/hooks/usePWA';
import { ErrorBoundary } from '../components/ErrorBoundary';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  
  // Registrar Service Worker para PWA
  useServiceWorker();
  
  // Páginas que NO necesitan el UserRoleContext
  const publicPages = ['/login', '/signup', '/complete-invite'];
  const isPublicPage = publicPages.includes(router.pathname);
  
  // Si es página pública, no envolver en UserRoleProvider
  if (isPublicPage) {
    return (
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    );
  }
  
  // Páginas protegidas usan UserRoleProvider
  return (
    <ErrorBoundary>
      <UserRoleProvider>
        <Component {...pageProps} />
      </UserRoleProvider>
    </ErrorBoundary>
  );
}
