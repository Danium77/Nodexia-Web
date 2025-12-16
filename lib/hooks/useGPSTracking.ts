// lib/hooks/useGPSTracking.ts
// Hook para tracking GPS automático del chofer

import { useEffect, useRef, useState } from 'react';
import { registrarUbicacionGPS } from '../api/estado-unidad';

interface GPSPosition {
  latitud: number;
  longitud: number;
  velocidad_kmh?: number;
  precision_metros?: number;
  rumbo_grados?: number;
  altitud_metros?: number;
}

interface UseGPSTrackingOptions {
  viajeId: string;
  enabled: boolean; // Solo cuando está en tránsito
  intervalMs?: number; // Default: 30 segundos
  onError?: (error: string) => void;
  onSuccess?: () => void;
}

export function useGPSTracking({
  viajeId,
  enabled,
  intervalMs = 30000,
  onError,
  onSuccess
}: UseGPSTrackingOptions) {
  const [isTracking, setIsTracking] = useState(false);
  const [lastPosition, setLastPosition] = useState<GPSPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  // Enviar posición al servidor usando nueva API
  const sendPosition = async (position: GeolocationPosition) => {
    const gpsData: GPSPosition = {
      latitud: position.coords.latitude,
      longitud: position.coords.longitude,
      velocidad_kmh: position.coords.speed ? position.coords.speed * 3.6 : undefined, // m/s a km/h
      precision_metros: position.coords.accuracy,
      rumbo_grados: position.coords.heading || undefined,
      altitud_metros: position.coords.altitude || undefined
    };

    try {
      // Usar la nueva API de estado-unidad
      await registrarUbicacionGPS({
        viaje_id: viajeId,
        lat: gpsData.latitud,
        lon: gpsData.longitud,
        precision_metros: gpsData.precision_metros,
        velocidad_kmh: gpsData.velocidad_kmh,
        rumbo_grados: gpsData.rumbo_grados,
        altitud_metros: gpsData.altitud_metros,
      });

      setLastPosition(gpsData);
      setError(null);
      onSuccess?.();
      console.log('[GPS] Ubicación enviada:', gpsData);
    } catch (err: any) {
      const errorMsg = err.message || 'Error enviando ubicación';
      setError(errorMsg);
      onError?.(errorMsg);
      console.error('[GPS] Error enviando ubicación:', err);
    }
  };

  // Manejar error de geolocalización
  const handleGeolocationError = (err: GeolocationPositionError) => {
    let errorMsg = 'Error desconocido';
    
    switch (err.code) {
      case err.PERMISSION_DENIED:
        errorMsg = 'Permiso de ubicación denegado. Habilite GPS en configuración.';
        break;
      case err.POSITION_UNAVAILABLE:
        errorMsg = 'Ubicación no disponible. Verifique que GPS esté activado.';
        break;
      case err.TIMEOUT:
        errorMsg = 'Timeout obteniendo ubicación. Reintentando...';
        break;
    }
    
    setError(errorMsg);
    onError?.(errorMsg);
    console.error('Geolocation error:', err);
  };

  // Iniciar tracking
  useEffect(() => {
    if (!enabled || !viajeId) {
      // Detener tracking si está activo
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      setIsTracking(false);
      return;
    }

    // Verificar soporte de geolocalización
    if (!navigator.geolocation) {
      setError('Geolocalización no soportada en este dispositivo');
      onError?.('Geolocalización no soportada');
      return;
    }

    setIsTracking(true);

    // Opciones para geolocalización de alta precisión
    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0 // No usar caché
    };

    // Obtener posición inicial inmediatamente
    navigator.geolocation.getCurrentPosition(
      sendPosition,
      handleGeolocationError,
      geoOptions
    );

    // Configurar tracking continuo
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        // watchPosition detecta cambios, pero enviamos cada N segundos
        // para no saturar el servidor
      },
      handleGeolocationError,
      geoOptions
    );

    // Enviar posición cada intervalMs (30 seg por defecto)
    intervalIdRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        sendPosition,
        handleGeolocationError,
        geoOptions
      );
    }, intervalMs);

    // Cleanup al desmontar o cambiar deps
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      setIsTracking(false);
    };
  }, [enabled, viajeId, intervalMs]);

  return {
    isTracking,
    lastPosition,
    error,
    clearError: () => setError(null)
  };
}
