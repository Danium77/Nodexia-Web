/**
 * Configuración de Firebase Cloud Messaging
 * Para notificaciones push en la aplicación
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

// Configuración de Firebase (usar variables de entorno)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

/**
 * Inicializa Firebase solo si está en el navegador
 */
export function initializeFirebase(): FirebaseApp | null {
  if (typeof window === 'undefined') {
    return null; // No inicializar en SSR
  }

  if (getApps().length > 0) {
    app = getApps()[0];
  } else {
    try {
      app = initializeApp(firebaseConfig);
      console.log('[Firebase] App inicializada');
    } catch (error) {
      console.error('[Firebase] Error al inicializar:', error);
      return null;
    }
  }

  return app;
}

/**
 * Obtiene la instancia de Messaging
 */
export function getMessagingInstance(): Messaging | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!app) {
    app = initializeFirebase();
  }

  if (!app) {
    return null;
  }

  if (!messaging) {
    try {
      messaging = getMessaging(app);
      console.log('[FCM] Messaging inicializado');
    } catch (error) {
      console.error('[FCM] Error al inicializar messaging:', error);
      return null;
    }
  }

  return messaging;
}

/**
 * Solicita permisos de notificaciones y obtiene el token FCM
 * 
 * @returns Token FCM o null si falló
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // Verificar si ya tiene permiso
    if (Notification.permission === 'granted') {
      return await getFCMToken();
    }

    // Solicitar permiso
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      console.log('[FCM] Permiso concedido');
      return await getFCMToken();
    } else {
      console.log('[FCM] Permiso denegado');
      return null;
    }
  } catch (error) {
    console.error('[FCM] Error solicitando permiso:', error);
    return null;
  }
}

/**
 * Obtiene el token FCM del dispositivo
 */
export async function getFCMToken(): Promise<string | null> {
  const messagingInstance = getMessagingInstance();

  if (!messagingInstance) {
    console.error('[FCM] Messaging no disponible');
    return null;
  }

  try {
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

    if (!vapidKey) {
      console.error('[FCM] VAPID key no configurada');
      return null;
    }

    const token = await getToken(messagingInstance, { vapidKey });

    if (token) {
      console.log('[FCM] Token obtenido:', token.substring(0, 20) + '...');
      return token;
    } else {
      console.log('[FCM] No se pudo obtener token');
      return null;
    }
  } catch (error) {
    console.error('[FCM] Error obteniendo token:', error);
    return null;
  }
}

/**
 * Configura el listener para mensajes en primer plano
 */
export function onForegroundMessage(
  callback: (payload: any) => void
): (() => void) | null {
  const messagingInstance = getMessagingInstance();

  if (!messagingInstance) {
    return null;
  }

  try {
    const unsubscribe = onMessage(messagingInstance, (payload) => {
      console.log('[FCM] Mensaje recibido en primer plano:', payload);
      callback(payload);
    });

    return unsubscribe;
  } catch (error) {
    console.error('[FCM] Error configurando listener:', error);
    return null;
  }
}

/**
 * Guarda el token FCM en la base de datos asociado al usuario
 */
export async function saveTokenToDatabase(
  userId: string,
  token: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications/register-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        token_fcm: token,
        dispositivo_info: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          timestamp: new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Error guardando token');
    }

    console.log('[FCM] Token guardado en BD');
    return true;
  } catch (error) {
    console.error('[FCM] Error guardando token:', error);
    return false;
  }
}

/**
 * Elimina el token FCM de la base de datos (al hacer logout)
 */
export async function removeTokenFromDatabase(token: string): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications/unregister-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token_fcm: token }),
    });

    if (!response.ok) {
      throw new Error('Error eliminando token');
    }

    console.log('[FCM] Token eliminado de BD');
    return true;
  } catch (error) {
    console.error('[FCM] Error eliminando token:', error);
    return false;
  }
}

/**
 * Verifica si las notificaciones están soportadas
 */
export function areNotificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Muestra una notificación local
 */
export function showLocalNotification(title: string, options?: NotificationOptions) {
  if (!areNotificationsSupported()) {
    console.warn('[Notifications] No soportadas en este navegador');
    return;
  }

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        ...options,
      });
    } catch (error) {
      console.error('[Notifications] Error mostrando notificación:', error);
    }
  }
}
