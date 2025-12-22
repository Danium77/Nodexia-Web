import { useEffect } from 'react';

/**
 * Hook para registrar el Service Worker de la PWA
 * Solo se ejecuta en producción y en navegadores que soporten Service Workers
 */
export function useServiceWorker() {
  useEffect(() => {
    // Solo registrar en navegadores que soporten Service Workers
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Esperar a que la página cargue completamente
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('✅ Service Worker registrado:', registration.scope);

            // Verificar actualizaciones periódicamente
            registration.update();

            // Escuchar actualizaciones del SW
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // Hay una nueva versión disponible
                    console.log('🆕 Nueva versión de la app disponible');
                    // Opcionalmente mostrar un mensaje al usuario
                    if (confirm('Nueva versión disponible. ¿Actualizar ahora?')) {
                      window.location.reload();
                    }
                  }
                });
              }
            });
          })
          .catch((error) => {
            console.error('❌ Error al registrar Service Worker:', error);
          });
      });
    }
  }, []);
}

/**
 * Hook para detectar si la app está instalada como PWA
 */
export function useIsStandalone() {
  const isStandalone = 
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
     (window.navigator as any).standalone === true);

  return isStandalone;
}

/**
 * Hook para mostrar prompt de instalación de PWA
 */
export function useInstallPrompt() {
  useEffect(() => {
    let deferredPrompt: any = null;
    
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevenir que el mini-infobar aparezca automáticamente
      e.preventDefault();
      // Guardar el evento para dispararlo más tarde
      deferredPrompt = e;
      console.log('💡 PWA puede instalarse');

      // Mostrar tu propio botón de instalación
      // O llamar deferredPrompt.prompt() cuando quieras
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);
}
