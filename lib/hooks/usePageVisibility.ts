/**
 * usePageVisibility Hook
 * 
 * Detecta cuando el usuario cambia de app/tab y vuelve a Nodexia.
 * Proporciona un flag `isReturning` que se activa por 2 segundos
 * cuando el usuario regresa, permitiendo evitar redirects no deseados.
 * 
 * Uso:
 * ```tsx
 * const { isVisible, isReturning } = usePageVisibility();
 * 
 * useEffect(() => {
 *   if (isReturning) return; // No ejecutar durante retorno
 *   // ... lógica normal
 * }, [isReturning, ...otherDeps]);
 * ```
 */

import { useEffect, useState } from 'react';

interface PageVisibilityState {
  /** Indica si la página es visible actualmente */
  isVisible: boolean;
  /** 
   * Indica si el usuario acaba de volver (true por 2 segundos)
   * Usar para evitar redirects/reloads no deseados
   */
  isReturning: boolean;
}

export function usePageVisibility(): PageVisibilityState {
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    // Initialize from current state if available
    if (typeof document !== 'undefined') {
      return !document.hidden;
    }
    return true;
  });
  
  const [isReturning, setIsReturning] = useState<boolean>(false);

  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = (): void => {
      const nowVisible = !document.hidden;
      const wasHidden = !isVisible;
      
      console.log(`👁️ [PageVisibility] Estado: ${nowVisible ? 'VISIBLE' : 'OCULTO'}`);
      
      if (wasHidden && nowVisible) {
        // Usuario está VOLVIENDO a la app
        console.log('🔄 [PageVisibility] Usuario VOLVIÓ - Activando flag isReturning por 2s');
        setIsReturning(true);
        
        // Desactivar flag después de 2 segundos
        setTimeout(() => {
          console.log('✅ [PageVisibility] Flag isReturning desactivado - operaciones normales');
          setIsReturning(false);
        }, 2000);
      }
      
      setIsVisible(nowVisible);
    };

    // Listener para visibilitychange
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // También escuchar focus/blur de window (backup)
    const handleFocus = () => {
      if (!isVisible) {
        console.log('🎯 [PageVisibility] Window focus - backup trigger');
        handleVisibilityChange();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    
    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isVisible]);

  return { isVisible, isReturning };
}
