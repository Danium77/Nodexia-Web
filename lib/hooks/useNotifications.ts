/**
 * Hook para gestionar notificaciones push de Firebase
 * Solicita permisos, obtiene token y maneja mensajes
 */

import { useState, useEffect, useCallback } from 'react';
import {
  requestNotificationPermission,
  onForegroundMessage,
  saveTokenToDatabase,
  areNotificationsSupported,
  showLocalNotification,
} from '../firebase/messaging';

export interface UseNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  requestPermission: () => Promise<void>;
  showNotification: (title: string, options?: NotificationOptions) => void;
}

/**
 * Hook principal para notificaciones push
 * 
 * @param userId - ID del usuario para asociar el token
 * @param autoRequest - Si debe solicitar permisos automáticamente (default: false)
 * 
 * @example
 * ```tsx
 * const { permission, requestPermission, showNotification } = useNotifications(userId);
 * ```
 */
export function useNotifications(
  userId: string | null,
  autoRequest: boolean = false
): UseNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificar soporte al montar
  useEffect(() => {
    const supported = areNotificationsSupported();
    setIsSupported(supported);

    if (supported && typeof window !== 'undefined') {
      setPermission(Notification.permission);
    }
  }, []);

  /**
   * Solicita permisos y obtiene el token
   */
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      setError('Notificaciones no soportadas en este navegador');
      return;
    }

    if (!userId) {
      setError('Usuario no autenticado');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fcmToken = await requestNotificationPermission();

      if (fcmToken) {
        setToken(fcmToken);
        setPermission('granted');

        // Guardar token en la base de datos
        await saveTokenToDatabase(userId, fcmToken);

        console.log('[Notifications] Token registrado exitosamente');
      } else {
        setPermission(Notification.permission);
        setError('No se pudo obtener el token de notificaciones');
      }
    } catch (err: any) {
      setError(err.message || 'Error solicitando permisos');
      console.error('[Notifications] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [isSupported, userId]);

  /**
   * Auto-request al montar si está habilitado
   */
  useEffect(() => {
    if (autoRequest && userId && isSupported && permission !== 'granted') {
      requestPermission();
    }
  }, [autoRequest, userId, isSupported, permission]);

  /**
   * Configurar listener para mensajes en primer plano
   */
  useEffect(() => {
    if (!isSupported || permission !== 'granted') {
      return;
    }

    const unsubscribe = onForegroundMessage((payload) => {
      console.log('[Notifications] Mensaje recibido:', payload);

      // Mostrar notificación local
      if (payload.notification) {
        showLocalNotification(payload.notification.title, {
          body: payload.notification.body,
          icon: payload.notification.icon || '/icon-192x192.png',
          data: payload.data,
        });
      }

      // Emitir evento personalizado para que otros componentes lo escuchen
      const event = new CustomEvent('fcm-message', { detail: payload });
      window.dispatchEvent(event);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isSupported, permission]);

  /**
   * Muestra una notificación local
   */
  const showNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (permission === 'granted') {
        showLocalNotification(title, options);
      }
    },
    [permission]
  );

  return {
    isSupported,
    permission,
    token,
    loading,
    error,
    requestPermission,
    showNotification,
  };
}

/**
 * Hook simplificado para escuchar eventos de notificación
 * 
 * @example
 * ```tsx
 * useNotificationListener((payload) => {
 *   console.log('Nueva notificación:', payload);
 *   // Actualizar estado, mostrar toast, etc.
 * });
 * ```
 */
export function useNotificationListener(
  callback: (payload: any) => void
): void {
  useEffect(() => {
    const handleMessage = (event: Event) => {
      const customEvent = event as CustomEvent;
      callback(customEvent.detail);
    };

    window.addEventListener('fcm-message', handleMessage);

    return () => {
      window.removeEventListener('fcm-message', handleMessage);
    };
  }, [callback]);
}
