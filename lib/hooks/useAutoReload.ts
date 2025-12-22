import { useEffect, useState } from 'react';

export const useAutoReload = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Detectar cuando la pestaña se vuelve visible/invisible
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === 'visible');
      
      // DESHABILITADO: Auto-reload causaba problemas al cambiar entre apps
      // if (document.visibilityState === 'visible' && process.env.NODE_ENV === 'development') {
      //   setTimeout(() => {
      //     const hmrConnection = (window as any).__NEXT_HMR_CB;
      //     if (!hmrConnection || !hmrConnection.connected) {
      //       console.log('HMR desconectado, recargando página...');
      //       window.location.reload();
      //     }
      //   }, 1000);
      // }
    };

    // Detectar errores de red/conexión
    const handleOnline = () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Conexión restaurada');
        // Opcional: recargar si estuvo offline mucho tiempo
      }
    };

    const handleOffline = () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Sin conexión detectada');
      }
    };

    // Event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isVisible };
};

// Hook para verificar el estado de HMR
export const useHMRStatus = () => {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const checkHMRConnection = () => {
      const hmr = (window as any).__NEXT_HMR_CB;
      const connected = hmr && hmr.connected !== false;
      setIsConnected(connected);
      
      if (!connected) {
        console.warn('HMR desconectado - considera recargar la página');
      }
    };

    // Verificar cada 5 segundos
    const interval = setInterval(checkHMRConnection, 5000);

    return () => clearInterval(interval);
  }, []);

  return { isConnected };
};