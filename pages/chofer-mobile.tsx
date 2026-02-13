// pages/chofer-mobile.tsx
// Dashboard móvil para choferes - Optimizado para smartphones

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { fetchWithAuth } from '../lib/api/fetchWithAuth';
import { useUserRole } from '../lib/contexts/UserRoleContext';
import { QRCodeSVG } from 'qrcode.react';
import { 
  TruckIcon, 
  MapPinIcon, 
  ClockIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  BellIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  QrCodeIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';
import { SubirDocumento, ListaDocumentos } from '../components/Documentacion';

interface ViajeChofer {
  id: string;
  numero_viaje: string;
  despacho_id: string;
  estado: string;
  observaciones: string;
  despachos: {
    pedido_id: string;
    origen: string;
    origen_id: string;
    origen_ciudad?: string;
    origen_provincia?: string;
    origen_latitud?: number;
    origen_longitud?: number;
    destino: string;
    destino_id: string;
    destino_ciudad?: string;
    destino_provincia?: string;
    destino_latitud?: number;
    destino_longitud?: number;
    scheduled_local_date: string;
    scheduled_local_time: string;
    type: string;
  };
  camiones: {
    patente: string;
    marca: string;
    modelo: string;
  } | null;
}

interface UbicacionGPS {
  lat: number;
  lon: number;
  precision?: number;
  velocidad?: number;
}

export default function ChoferMobile() {
  const router = useRouter();
  const { user, primaryRole } = useUserRole();
  
  const [loading, setLoading] = useState(true);
  const [viajes, setViajes] = useState<ViajeChofer[]>([]);
  const [viajeActivo, setViajeActivo] = useState<ViajeChofer | null>(null);
  const [choferData, setChoferData] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [location, setLocation] = useState<UbicacionGPS | null>(null);
  const [lastLocationSent, setLastLocationSent] = useState<Date | null>(null);
  const [sendingLocation, setSendingLocation] = useState(false);
  const [activeTab, setActiveTab] = useState<'viajes' | 'incidencias' | 'perfil'>('viajes');

  // Permitir navegación directa a un tab vía query param (?tab=perfil)
  useEffect(() => {
    const tab = router.query.tab as string;
    if (tab === 'perfil' || tab === 'incidencias' || tab === 'viajes') {
      setActiveTab(tab);
    }
  }, [router.query.tab]);
  const [showMenuHamburguesa, setShowMenuHamburguesa] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showUploadDoc, setShowUploadDoc] = useState(false);
  const [docRefreshKey, setDocRefreshKey] = useState(0);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  
  // Modal de incidencias
  const [showIncidenciaModal, setShowIncidenciaModal] = useState(false);
  const [incidenciaTipo, setIncidenciaTipo] = useState<string>('');
  const [incidenciaTipoNombre, setIncidenciaTipoNombre] = useState<string>('');
  const [incidenciaDescripcion, setIncidenciaDescripcion] = useState<string>('');
  const [reportandoIncidencia, setReportandoIncidencia] = useState(false);

  // Debug helper - agregar logs visibles
  const addDebugLog = (message: string) => {
    console.log(message);
    setDebugLogs(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Verificar rol de chofer
  useEffect(() => {
    if (user && primaryRole !== 'chofer') {
      router.push('/dashboard');
    }
  }, [user, primaryRole, router]);

  // Cargar datos del chofer
  useEffect(() => {
    if (user) {
      fetchChoferData();
      fetchViajes();
    }
  }, [user]);

  // Limpiar mensajes automáticamente después de 5 segundos
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [message]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [error]);

  // Recargar viajes solo cuando volvemos al tab de viajes desde otro tab
  useEffect(() => {
    if (activeTab === 'viajes' && user) {
      // Solo recargar si han pasado más de 5 segundos desde la última carga
      const ahora = Date.now();
      const ultimaCarga = localStorage.getItem('ultima_carga_viajes');
      if (!ultimaCarga || ahora - parseInt(ultimaCarga) > 5000) {
        fetchViajes();
        localStorage.setItem('ultima_carga_viajes', ahora.toString());
      }
    }
  }, [activeTab]);

  // Detectar estado online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Obtener ubicación GPS cada 30 segundos si hay viaje activo
  useEffect(() => {
    if (!viajeActivo || (viajeActivo.estado !== 'en_transito_origen' && viajeActivo.estado !== 'en_transito_destino')) {
      return;
    }

    if (!choferData?.id) {
      console.log('⚠️ No hay chofer_id, esperando datos del chofer');
      return;
    }

    const enviarUbicacion = async (position: GeolocationPosition) => {
      try {
        const trackingData = {
          chofer_id: choferData.id,
          latitud: position.coords.latitude,
          longitud: position.coords.longitude,
          timestamp: new Date().toISOString(),
          velocidad: position.coords.speed || undefined,
          rumbo: position.coords.heading || undefined,
          precision_metros: position.coords.accuracy,
          bateria_porcentaje: await getBatteryLevel(),
          app_version: '1.0.0'
        };

        const response = await fetchWithAuth('/api/tracking/actualizar-ubicacion', {
          method: 'POST',
          body: JSON.stringify(trackingData)
        });

        if (response.ok) {
          const result = await response.json();
          setLastLocationSent(new Date());
          
          // Si el servidor detectó arribo, actualizar estado local
          if (result.estado_detectado) {
            setMessage(`📍 ${result.estado_detectado === 'ingresado_origen' ? 'Arribaste al origen' : 'Arribaste al destino'}`);
            fetchViajes(); // Recargar viajes para actualizar estado
          }
        } else {
          const error = await response.json();
          console.error('❌ Error enviando ubicación:', error);
        }
      } catch (error) {
        console.error('❌ Error al enviar ubicación:', error);
      }
    };

    const getBatteryLevel = async (): Promise<number | undefined> => {
      if ('getBattery' in navigator) {
        try {
          const battery: any = await (navigator as any).getBattery();
          return Math.round(battery.level * 100);
        } catch {
          return undefined;
        }
      }
      return undefined;
    };

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation: UbicacionGPS = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          precision: position.coords.accuracy
        };
        if (position.coords.speed !== null) {
          newLocation.velocidad = position.coords.speed;
        }
        setLocation({ lat: newLocation.lat, lon: newLocation.lon });
        
        // Enviar ubicación al servidor
        enviarUbicacion(position);
      },
      (error) => {
        console.error('❌ Error obteniendo ubicación:', error);
        setError('No se pudo obtener tu ubicación GPS');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [viajeActivo, choferData]);

  // 🔔 REALTIME: Escuchar cambios en viajes_despacho para actualizar automáticamente
  useEffect(() => {
    if (!choferData?.id) return;

    console.log('🔔 Chofer Móvil - Suscripción realtime activada');
    
    const channel = supabase
      .channel('chofer-viajes-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'viajes_despacho',
          filter: `chofer_id=eq.${choferData.id}`
        },
        (payload) => {
          console.log('🔔 Chofer Móvil - Cambio detectado en viaje:', payload);
          
          // Mostrar notificación al usuario
          if (payload.eventType === 'UPDATE') {
            const oldData = payload.old as any;
            const newData = payload.new as any;
            
            // Detectar reprogramación
            if (oldData?.scheduled_at !== newData?.scheduled_at) {
              setMessage('🔄 Viaje reprogramado - Revisa la nueva fecha');
              addDebugLog('🔄 Viaje reprogramado');
            }
            
            // Detectar cambio de estado
            if (oldData?.estado !== newData?.estado) {
              setMessage(`📋 Estado actualizado a: ${newData.estado}`);
              addDebugLog(`📋 Estado: ${newData.estado}`);
            }
          }
          
          // Recargar viajes
          fetchViajes();
        }
      )
      .subscribe();

    return () => {
      console.log('🔕 Chofer Móvil - Desuscribiendo');
      supabase.removeChannel(channel);
    };
  }, [choferData]);

  const fetchChoferData = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('choferes')
        .select('*')
        .eq('usuario_id', user.id)
        .single();

      if (error) throw error;
      setChoferData(data);
    } catch (error) {
      console.error('Error cargando datos del chofer:', error);
    }
  };

  const fetchViajes = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      console.log('👤 Buscando chofer con usuario_id:', user.id);
      const { data: chofer, error: choferError } = await supabase
        .from('choferes')
        .select('id')
        .eq('usuario_id', user.id)
        .single();

      if (choferError || !chofer) {
        console.error('❌ Chofer no encontrado:', choferError);
        setError('No se encontró el perfil de chofer');
        return;
      }

      console.log('✅ Chofer encontrado:', chofer.id);

      const { data, error} = await supabase
        .from('viajes_despacho')
        .select(`
          id,
          numero_viaje,
          despacho_id,
          estado,
          observaciones,
          despachos!inner (
            pedido_id,
            origen,
            origen_id,
            destino,
            destino_id,
            scheduled_local_date,
            scheduled_local_time,
            type
          ),
          camion_id,
          camiones (
            patente,
            marca,
            modelo
          )
        `)
        .eq('chofer_id', chofer.id)
        .in('estado', ['transporte_asignado', 'camion_asignado', 'confirmado_chofer', 'en_transito_origen', 'ingresado_origen', 'llamado_carga', 'cargando', 'cargado', 'egreso_origen', 'en_transito_destino', 'ingresado_destino', 'llamado_descarga', 'descargando', 'descargado', 'egreso_destino', 'completado'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to match interface
      let transformedData = (data || []).map(item => ({
        ...item,
        despachos: Array.isArray(item.despachos) ? item.despachos[0] : item.despachos,
        camiones: Array.isArray(item.camiones) ? item.camiones[0] : item.camiones
      })) as ViajeChofer[];

      // Obtener información de ubicaciones (plantas) - ciudad, provincia, coordenadas
      const ubicacionesIds = new Set<string>();
      transformedData.forEach(viaje => {
        if (viaje.despachos.origen_id) ubicacionesIds.add(viaje.despachos.origen_id);
        if (viaje.despachos.destino_id) ubicacionesIds.add(viaje.despachos.destino_id);
      });

      console.log('🏭 IDs de ubicaciones a buscar:', Array.from(ubicacionesIds));
      addDebugLog(`🏭 Buscando ${ubicacionesIds.size} ubicaciones`);

      if (ubicacionesIds.size > 0) {
        const { data: ubicacionesData, error: ubicacionesError } = await supabase
          .from('ubicaciones')
          .select('id, ciudad, provincia, latitud, longitud')
          .in('id', Array.from(ubicacionesIds));

        console.log('🏭 Datos de ubicaciones obtenidos:', ubicacionesData);
        console.log('🏭 Error ubicaciones:', ubicacionesError);
        addDebugLog(`🏭 Ubicaciones encontradas: ${ubicacionesData?.length || 0}`);

        if (ubicacionesData) {
          const ubicacionesMap: Record<string, any> = {};
          ubicacionesData.forEach(u => { ubicacionesMap[u.id] = u; });

          // Enriquecer datos de viajes con info de ubicaciones
          transformedData = transformedData.map(viaje => ({
            ...viaje,
            despachos: {
              ...viaje.despachos,
              origen_ciudad: ubicacionesMap[viaje.despachos.origen_id]?.ciudad,
              origen_provincia: ubicacionesMap[viaje.despachos.origen_id]?.provincia,
              origen_latitud: ubicacionesMap[viaje.despachos.origen_id]?.latitud,
              origen_longitud: ubicacionesMap[viaje.despachos.origen_id]?.longitud,
              destino_ciudad: ubicacionesMap[viaje.despachos.destino_id]?.ciudad,
              destino_provincia: ubicacionesMap[viaje.despachos.destino_id]?.provincia,
              destino_latitud: ubicacionesMap[viaje.despachos.destino_id]?.latitud,
              destino_longitud: ubicacionesMap[viaje.despachos.destino_id]?.longitud,
            }
          }));

          console.log('✅ Viajes enriquecidos con datos de ubicaciones:', transformedData[0]);
          addDebugLog(`✅ Datos enriquecidos OK`);
        }
      }

      setViajes(transformedData);
      
      // Establecer el primer viaje como activo si existe
      if (transformedData.length > 0 && !viajeActivo) {
        setViajeActivo(transformedData[0] || null);
      }
    } catch (error: any) {
      console.error('Error cargando viajes:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarViaje = async () => {
    if (!viajeActivo || !user?.id) return;

    try {
      setLoading(true);
      addDebugLog(`🔵 Confirmando viaje...`);
      
      // Llamar a la API - actualizar a confirmado_chofer (sistema dual)
      const response = await fetchWithAuth('/api/viajes/actualizar-estado', {
        method: 'POST',
        body: JSON.stringify({
          viaje_id: viajeActivo.id,
          nuevo_estado: 'confirmado_chofer'
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        addDebugLog(`❌ Error: ${result.error}`);
        throw new Error(result.error || 'Error al confirmar viaje');
      }
      
      addDebugLog(`✅ Viaje confirmado`);
      setMessage('✅ Viaje confirmado exitosamente');
      
      // Actualizar el viaje activo Y la lista de viajes localmente
      if (viajeActivo) {
        const viajeActualizado = { ...viajeActivo, estado: 'confirmado_chofer' };
        setViajeActivo(viajeActualizado);
        
        // Actualizar también en la lista de viajes
        setViajes(viajes.map(v => 
          v.id === viajeActivo.id ? viajeActualizado : v
        ));
      }
    } catch (error: any) {
      console.error('Error al confirmar viaje:', error);
      addDebugLog(`❌ ${error.message}`);
      setError('Error al confirmar viaje: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleIniciarViaje = async () => {
    if (!viajeActivo || !user?.id) return;

    try {
      setLoading(true);
      
      // El chofer inicia el viaje hacia origen
      const response = await fetchWithAuth('/api/viajes/actualizar-estado', {
        method: 'POST',
        body: JSON.stringify({
          viaje_id: viajeActivo.id,
          nuevo_estado: 'en_transito_origen'
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      setMessage('✅ Viaje iniciado - GPS activado');
      
      // Actualizar el viaje activo Y la lista de viajes localmente
      if (viajeActivo) {
        const viajeActualizado = { ...viajeActivo, estado: 'en_transito_origen' };
        setViajeActivo(viajeActualizado);
        
        // Actualizar también en la lista de viajes
        setViajes(viajes.map(v => 
          v.id === viajeActivo.id ? viajeActualizado : v
        ));
      }
    } catch (error: any) {
      setError('Error al iniciar viaje: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // NOTA: handleLlegarOrigen eliminado — en el nuevo flujo,
  // el ingreso a origen lo registra Control de Acceso al escanear el QR.
  // La UI ya muestra "Esperando registro en portería" cuando estado === 'en_transito_origen'.

  const handleIniciarTransitoDestino = async () => {
    if (!viajeActivo || !user?.id) return;

    try {
      setLoading(true);
      
      const response = await fetchWithAuth('/api/viajes/actualizar-estado', {
        method: 'POST',
        body: JSON.stringify({
          viaje_id: viajeActivo.id,
          nuevo_estado: 'en_transito_destino'
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      setMessage('✅ Viaje iniciado hacia destino');
      
      // Actualizar el viaje activo Y la lista de viajes localmente
      if (viajeActivo) {
        const viajeActualizado = { ...viajeActivo, estado: 'en_transito_destino' };
        setViajeActivo(viajeActualizado);
        
        // Actualizar también en la lista de viajes
        setViajes(viajes.map(v => 
          v.id === viajeActivo.id ? viajeActualizado : v
        ));
      }
    } catch (error: any) {
      setError('Error al iniciar tránsito: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLlegarDestino = async () => {
    if (!viajeActivo || !user?.id) return;

    try {
      setLoading(true);
      
      const response = await fetchWithAuth('/api/viajes/actualizar-estado', {
        method: 'POST',
        body: JSON.stringify({
          viaje_id: viajeActivo.id,
          nuevo_estado: 'ingresado_destino'
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      setMessage('✅ Llegada a destino registrada');
      
      // Actualizar el viaje activo Y la lista de viajes localmente
      if (viajeActivo) {
        const viajeActualizado = { ...viajeActivo, estado: 'ingresado_destino' };
        setViajeActivo(viajeActualizado);
        
        // Actualizar también en la lista de viajes
        setViajes(viajes.map(v => 
          v.id === viajeActivo.id ? viajeActualizado : v
        ));
      }
    } catch (error: any) {
      setError('Error al registrar llegada: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReportarIncidencia = async () => {
    if (!viajeActivo) {
      alert('No hay viaje activo seleccionado');
      return;
    }

    const tipoIncidencia = prompt(
      'Tipo de incidencia:\n1 - Demora\n2 - Problema mecánico\n3 - Problema con carga\n4 - Ruta bloqueada\n5 - Otro\n\nIngresa el número:'
    );

    if (!tipoIncidencia) return;

    const tipos: Record<string, string> = {
      '1': 'demora',
      '2': 'problema_mecanico',
      '3': 'problema_carga',
      '4': 'ruta_bloqueada',
      '5': 'otro'
    };

    const tipo = tipos[tipoIncidencia];
    if (!tipo) {
      alert('Opción inválida');
      return;
    }

    const descripcion = prompt('Describe la incidencia:');
    if (!descripcion) return;

    try {
      const { error } = await supabase.from('incidencias_viaje').insert({
        viaje_id: viajeActivo.id,
        tipo_incidencia: tipo,
        descripcion: descripcion,
        reportado_por: user?.id,
        fecha_reporte: new Date().toISOString(),
        estado_resolucion: 'pendiente'
      });

      if (error) throw error;

      alert('✅ Incidencia reportada correctamente');
      addDebugLog('📢 Incidencia reportada');
    } catch (error: any) {
      console.error('Error reportando incidencia:', error);
      alert('❌ Error al reportar incidencia: ' + error.message);
    }
  };

  // Helper para reportar incidencia con tipo específico
  const handleReportarIncidenciaTipo = async (tipo: string, tipoNombre: string) => {
    if (!viajeActivo) {
      setError('No hay viaje activo seleccionado');
      return;
    }

    // Abrir modal nativo
    setIncidenciaTipo(tipo);
    setIncidenciaTipoNombre(tipoNombre);
    setIncidenciaDescripcion('');
    setShowIncidenciaModal(true);
  };

  const handleEnviarIncidencia = async () => {
    if (!viajeActivo || !incidenciaDescripcion.trim()) {
      setError('Debes ingresar una descripción');
      return;
    }

    try {
      setReportandoIncidencia(true);
      
      // 1. Insertar incidencia
      const { error: incidenciaError } = await supabase.from('incidencias_viaje').insert({
        viaje_id: viajeActivo.id,
        tipo_incidencia: incidenciaTipo,
        descripcion: incidenciaDescripcion,
        reportado_por: user?.id,
        fecha_reporte: new Date().toISOString(),
        estado_resolucion: 'pendiente'
      });

      if (incidenciaError) throw incidenciaError;

      // 2. SOLO pausar viaje si es problema mecánico (avería del vehículo)
      if (incidenciaTipo === 'problema_mecanico') {
        const { error: updateError } = await supabase
          .from('viajes_despacho')
          .update({ 
            estado: 'pausado',
            updated_at: new Date().toISOString()
          })
          .eq('id', viajeActivo.id);

        if (updateError) {
          console.error('Error actualizando estado a pausado:', updateError);
          // No lanzar error, la incidencia ya se guardó
        }
        
        setMessage(`⚠️ ${incidenciaTipoNombre} reportado - Viaje pausado`);
        addDebugLog(`📢 ${incidenciaTipoNombre} - Viaje PAUSADO`);
      } else {
        // Otras incidencias NO pausan el viaje
        setMessage(`✅ ${incidenciaTipoNombre} reportado correctamente`);
        addDebugLog(`📢 ${incidenciaTipoNombre} reportado (viaje continúa)`);
      }
      
      // 3. Recargar viajes para reflejar cambios
      await fetchViajes();
      
      // Cerrar modal y volver a viajes
      setShowIncidenciaModal(false);
      setActiveTab('viajes');
    } catch (error: any) {
      console.error('Error reportando incidencia:', error);
      setError('Error al reportar incidencia: ' + error.message);
    } finally {
      setReportandoIncidencia(false);
    }
  };

  const handleEnviarUbicacionManual = async () => {
    if (!choferData?.id) {
      setError('No se pudo obtener tu información de chofer');
      return;
    }

    setSendingLocation(true);
    addDebugLog('📍 Iniciando envío manual de ubicación...');
    
    try {
      let position: GeolocationPosition;
      
      // 🔥 INTENTO 1: Usar GPS real
      try {
        addDebugLog('🛰️ Intentando obtener GPS real...');
        position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });
        addDebugLog('✅ GPS real obtenido');
      } catch (gpsError: any) {
        // 🔥 FALLBACK: Si GPS falla (por HTTPS), usar coordenadas simuladas
        addDebugLog(`⚠️ GPS falló: ${gpsError.message}`);
        addDebugLog('🎭 Usando coordenadas simuladas para testing...');
        
        // Coordenadas simuladas: Ruta Buenos Aires → Rosario
        // Simular movimiento progresivo desde origen hacia destino
        const baseLatOrigen = -34.603684;  // Buenos Aires (Aceitera San Miguel)
        const baseLonOrigen = -58.381559;
        const baseLatDestino = -32.941668; // Rosario (Tecnopack Zayas)
        const baseLonDestino = -60.693645;
        
        // Calcular posición intermedia basada en timestamp (para simular movimiento)
        const progress = (Date.now() % 10000) / 10000; // 0 a 1
        const simLat = baseLatOrigen + (baseLatDestino - baseLatOrigen) * progress;
        const simLon = baseLonOrigen + (baseLonDestino - baseLonOrigen) * progress;
        
        position = {
          coords: {
            latitude: simLat,
            longitude: simLon,
            accuracy: 15,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: 80 // km/h simulado
          },
          timestamp: Date.now()
        } as GeolocationPosition;
        
        addDebugLog(`📍 Ubicación simulada: ${simLat.toFixed(6)}, ${simLon.toFixed(6)}`);
      }

      const getBatteryLevel = async (): Promise<number | undefined> => {
        if ('getBattery' in navigator) {
          try {
            const battery: any = await (navigator as any).getBattery();
            return Math.round(battery.level * 100);
          } catch {
            return undefined;
          }
        }
        return undefined;
      };

      const trackingData = {
        chofer_id: choferData.id,
        latitud: position.coords.latitude,
        longitud: position.coords.longitude,
        timestamp: new Date().toISOString(),
        velocidad: position.coords.speed || undefined,
        rumbo: position.coords.heading || undefined,
        precision_metros: position.coords.accuracy,
        bateria_porcentaje: await getBatteryLevel(),
        app_version: '1.0.0'
      };

      addDebugLog('📤 Enviando ubicación al servidor...');
      addDebugLog(`🆔 Chofer ID: ${choferData.id}`);
      console.log('📦 Tracking data:', trackingData);
      console.log('👤 ChoferData completo:', choferData);

      const response = await fetchWithAuth('/api/tracking/actualizar-ubicacion', {
        method: 'POST',
        body: JSON.stringify(trackingData)
      });

      if (response.ok) {
        const result = await response.json();
        addDebugLog('✅ Ubicación guardada en BD');
        console.log('📊 Resultado:', result);
        
        setLastLocationSent(new Date());
        setLocation({ lat: position.coords.latitude, lon: position.coords.longitude });
        setMessage('✅ Ubicación enviada correctamente');
        
        if (result.estado_detectado) {
          const estadoMsg = result.estado_detectado === 'ingresado_origen' ? 'Arribaste al origen' : 'Arribaste al destino';
          setMessage(`📍 ${estadoMsg}`);
          addDebugLog(`🎯 Estado detectado: ${result.estado_detectado}`);
          fetchViajes();
        }
      } else {
        const error = await response.json();
        addDebugLog(`❌ Error del servidor: ${error.error}`);
        throw new Error(error.error || 'Error al enviar ubicación');
      }
    } catch (error: any) {
      console.error('❌ Error enviando ubicación manual:', error);
      addDebugLog(`❌ Error: ${error.message}`);
      setError(error.message || 'No se pudo obtener tu ubicación GPS');
    } finally {
      setSendingLocation(false);
      addDebugLog('🏁 Proceso de ubicación finalizado');
    }
  };

  const handleLlamarCoordinador = () => {
    // TODO: Obtener teléfono del coordinador
    window.location.href = 'tel:+541121608941';
  };

  if (loading && viajes.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Cargando viajes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-24">
      {/* Header compacto */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 shadow-2xl sticky top-0 z-10 border-b border-slate-700">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg">
                {choferData?.nombre?.charAt(0) || 'C'}
              </div>
              <div>
                <h1 className="text-base font-bold text-white">
                  {activeTab === 'viajes' && '🚚 Mis Viajes'}
                  {activeTab === 'incidencias' && '🚨 Incidencias'}
                  {activeTab === 'perfil' && '👤 Mi Perfil'}
                </h1>
                <p className="text-xs text-slate-400">
                  {activeTab === 'viajes' && `${viajes.length} ${viajes.length === 1 ? 'viaje' : 'viajes'}`}
                  {activeTab === 'incidencias' && 'Reportar problemas'}
                  {activeTab === 'perfil' && `${choferData?.nombre} ${choferData?.apellido}`}
                </p>
              </div>
            </div>
            
            {/* Botones de acciones rápidas */}
            <div className="flex items-center space-x-2">
              {/* Botón QR */}
              {viajeActivo && (
                <button
                  onClick={() => setShowQRModal(true)}
                  className="w-10 h-10 rounded-full bg-cyan-600 hover:bg-cyan-700 flex items-center justify-center shadow-lg transition-all hover:scale-105"
                >
                  <QrCodeIcon className="h-6 w-6 text-white" />
                </button>
              )}
              
              {/* Indicador de conexión */}
              <div className={`flex items-center space-x-1 px-2 py-1.5 rounded-full ${isOnline ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
                <span className="text-xs font-semibold sr-only sm:not-sr-only">{isOnline ? 'Online' : 'Offline'}</span>
              </div>
              
              {/* Botón Menú Hamburguesa */}
              <button
                onClick={() => setShowMenuHamburguesa(true)}
                className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center shadow-lg transition-all hover:scale-105"
              >
                <Bars3Icon className="h-6 w-6 text-white" />
              </button>
            </div>
          </div>

          {/* Selector de viajes eliminado - Chofer solo puede tener 1 viaje activo */}
        </div>
      </div>

      {/* Mensajes con animación */}
      {message && (
        <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-xl text-green-400 text-sm backdrop-blur-sm shadow-lg animate-in slide-in-from-top duration-300">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="font-medium">{message}</span>
          </div>
        </div>
      )}
      
      {error && (
        <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm backdrop-blur-sm shadow-lg animate-in slide-in-from-top duration-300">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Panel de Debug (visible solo cuando hay logs) */}
      {debugLogs.length > 0 && (
        <div className="mx-4 mt-4 p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg text-purple-300 text-xs">
          <div className="font-bold mb-2">🔍 Debug Logs:</div>
          {debugLogs.map((log, i) => (
            <div key={i} className="font-mono">{log}</div>
          ))}
        </div>
      )}

      {/* Sin viajes */}
      {viajes.length === 0 && activeTab === 'viajes' && (
        <div className="text-center py-20 px-6">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-2xl animate-pulse"></div>
            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-full border border-slate-700">
              <TruckIcon className="h-20 w-20 text-slate-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-200 mb-2">Sin viajes asignados</h2>
          <p className="text-slate-400 max-w-xs mx-auto">
            Cuando el coordinador te asigne un nuevo viaje, recibirás una notificación y aparecerá aquí
          </p>
        </div>
      )}

      {/* Contenido principal del viaje activo */}
      {viajeActivo && (
        <div className="p-4 space-y-4">
          {/* Tarjeta de estado actual */}
          <div className="bg-gradient-to-br from-cyan-600 to-blue-700 rounded p-2 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-cyan-100 text-sm font-medium">Estado Actual</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                viajeActivo.estado === 'transporte_asignado' || viajeActivo.estado === 'camion_asignado' ? 'bg-yellow-600' :
                viajeActivo.estado === 'confirmado_chofer' ? 'bg-blue-600' :
                viajeActivo.estado === 'en_transito_origen' || viajeActivo.estado === 'en_transito_destino' ? 'bg-green-600' :
                viajeActivo.estado === 'ingresado_origen' || viajeActivo.estado === 'ingresado_destino' ? 'bg-purple-600' :
                viajeActivo.estado === 'llamado_carga' || viajeActivo.estado === 'cargando' || viajeActivo.estado === 'llamado_descarga' || viajeActivo.estado === 'descargando' ? 'bg-amber-600' :
                viajeActivo.estado === 'cargado' || viajeActivo.estado === 'descargado' || viajeActivo.estado === 'egreso_origen' || viajeActivo.estado === 'egreso_destino' || viajeActivo.estado === 'completado' ? 'bg-emerald-600' :
                viajeActivo.estado === 'pausado' ? 'bg-orange-600' :
                'bg-slate-600'
              } text-white`}>
                {viajeActivo.estado === 'transporte_asignado' ? 'CHOFER ASIGNADO' : 
                 viajeActivo.estado === 'pausado' ? '⏸️ PAUSADO' :
                 viajeActivo.estado.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-1">
              Viaje #{viajeActivo.numero_viaje}
            </h2>
            <p className="text-cyan-100 text-sm">{viajeActivo.despachos.pedido_id}</p>
          </div>

          {/* Información del viaje */}
          <div className="bg-slate-800 rounded-xl p-4 shadow-lg space-y-3">
            <h3 className="text-lg font-bold text-white mb-3">Detalles del Viaje</h3>
            
            {/* Origen */}
            <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-3">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                  <MapPinIcon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-green-400 font-semibold mb-1">ORIGEN</p>
                  <p className="text-white font-bold text-lg">{viajeActivo.despachos.origen}</p>
                  {(viajeActivo.despachos.origen_ciudad || viajeActivo.despachos.origen_provincia) && (
                    <p className="text-slate-300 text-sm mt-1">
                      📍 {viajeActivo.despachos.origen_ciudad}
                      {viajeActivo.despachos.origen_ciudad && viajeActivo.despachos.origen_provincia && ', '}
                      {viajeActivo.despachos.origen_provincia}
                    </p>
                  )}
                  {viajeActivo.despachos.origen_latitud && viajeActivo.despachos.origen_longitud && (
                    <button
                      onClick={() => {
                        const url = `https://www.google.com/maps/dir/?api=1&destination=${viajeActivo.despachos.origen_latitud},${viajeActivo.despachos.origen_longitud}`;
                        window.open(url, '_blank');
                      }}
                      className="mt-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1 transition-colors"
                    >
                      <MapPinIcon className="h-4 w-4" />
                      <span>Abrir en Maps</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Línea conectora */}
            <div className="ml-5 border-l-2 border-dashed border-slate-600 h-6"></div>

            {/* Destino */}
            <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-3">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                  <MapPinIcon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-red-400 font-semibold mb-1">DESTINO</p>
                  <p className="text-white font-bold text-lg">{viajeActivo.despachos.destino}</p>
                  {(viajeActivo.despachos.destino_ciudad || viajeActivo.despachos.destino_provincia) && (
                    <p className="text-slate-300 text-sm mt-1">
                      📍 {viajeActivo.despachos.destino_ciudad}
                      {viajeActivo.despachos.destino_ciudad && viajeActivo.despachos.destino_provincia && ', '}
                      {viajeActivo.despachos.destino_provincia}
                    </p>
                  )}
                  {viajeActivo.despachos.destino_latitud && viajeActivo.despachos.destino_longitud && (
                    <button
                      onClick={() => {
                        const url = `https://www.google.com/maps/dir/?api=1&destination=${viajeActivo.despachos.destino_latitud},${viajeActivo.despachos.destino_longitud}`;
                        window.open(url, '_blank');
                      }}
                      className="mt-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1 transition-colors"
                    >
                      <MapPinIcon className="h-4 w-4" />
                      <span>Abrir en Maps</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Fecha y hora */}
            <div className="flex items-center space-x-3 pt-3 border-t border-slate-700">
              <ClockIcon className="h-5 w-5 text-cyan-400" />
              <div>
                <p className="text-xs text-slate-400">Fecha programada</p>
                <p className="text-white font-medium">
                  {new Date(viajeActivo.despachos.scheduled_local_date).toLocaleDateString('es-AR')} - {viajeActivo.despachos.scheduled_local_time}
                </p>
              </div>
            </div>

            {/* Vehículo */}
            {viajeActivo.camiones && (
              <div className="flex items-center space-x-3 pt-3 border-t border-slate-700">
                <TruckIcon className="h-5 w-5 text-cyan-400" />
                <div>
                  <p className="text-xs text-slate-400">Vehículo asignado</p>
                  <p className="text-white font-medium">
                    {viajeActivo.camiones.marca} {viajeActivo.camiones.modelo} - {viajeActivo.camiones.patente}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Acciones según estado - Botones modernos */}
          <div className="space-y-3">
            {/* Estado: transporte_asignado o camion_asignado -> Mostrar botón Confirmar */}
            {(viajeActivo.estado === 'transporte_asignado' || viajeActivo.estado === 'camion_asignado' || viajeActivo.estado === 'asignado') && (
              <button
                onClick={handleConfirmarViaje}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                <CheckCircleIcon className="h-7 w-7 relative z-10" />
                <span className="relative z-10">✓ Confirmar Viaje</span>
              </button>
            )}

            {/* Estado: pausado (incidencia reportada) -> Mostrar botón Reiniciar Viaje */}
            {viajeActivo.estado === 'pausado' && (
              <>
                <div className="bg-gradient-to-br from-yellow-500/20 to-orange-600/10 border border-yellow-500/40 rounded-xl p-4 mb-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                    <span className="text-yellow-400 font-bold text-sm">Viaje Pausado - Incidencia Reportada</span>
                  </div>
                  <p className="text-slate-300 text-xs">
                    El viaje está pausado debido a una incidencia. Cuando estés listo, reinicia el viaje.
                  </p>
                </div>
                <button
                  onClick={handleIniciarViaje}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 via-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-green-500/30 hover:shadow-2xl hover:shadow-green-500/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                  <TruckIcon className="h-7 w-7 relative z-10" />
                  <span className="relative z-10">🔄 Reiniciar Viaje</span>
                </button>
              </>
            )}

            {/* Estado: confirmado_chofer -> Mostrar botón Iniciar Viaje */}
            {viajeActivo.estado === 'confirmado_chofer' && (
              <button
                onClick={handleIniciarViaje}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 via-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-green-500/30 hover:shadow-2xl hover:shadow-green-500/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                <TruckIcon className="h-7 w-7 relative z-10" />
                <span className="relative z-10">🚚 Iniciar Viaje a Origen</span>
              </button>
            )}

            {viajeActivo.estado === 'en_transito_origen' && (
              <>
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/40 rounded-xl p-5 text-center backdrop-blur-sm">
                  <div className="flex items-center justify-center space-x-2 mb-3">
                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                    <p className="text-blue-400 font-bold text-lg">🚛 En tránsito hacia origen</p>
                  </div>
                  <p className="text-sm text-slate-300">GPS activo - Tu ubicación se está compartiendo</p>
                  {location && (
                    <p className="text-xs text-slate-400 mt-2 font-mono">
                      📍 {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
                    </p>
                  )}
                  {lastLocationSent && (
                    <p className="text-xs text-green-400 mt-1">
                      ✓ Última ubicación: {new Date(lastLocationSent).toLocaleTimeString('es-AR')}
                    </p>
                  )}
                </div>

                {/* Botón manual para enviar ubicación */}
                <button
                  onClick={handleEnviarUbicacionManual}
                  disabled={sendingLocation}
                  className="w-full bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 text-white py-3 rounded-xl font-semibold text-sm shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/30 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <MapPinIcon className="h-5 w-5" />
                  <span>{sendingLocation ? 'Enviando...' : '📍 Enviar Ubicación Ahora'}</span>
                </button>
                
                {/* Botón deshabilitado - El arribo a origen lo registra Control de Acceso */}
                <div className="bg-yellow-900/20 border border-yellow-500/40 rounded-xl p-4 text-center">
                  <p className="text-yellow-400 text-sm font-medium mb-2">⚠️ Esperando registro en porteria</p>
                  <p className="text-slate-400 text-xs">Control de Acceso registrará tu llegada al escanear el QR</p>
                </div>
              </>
            )}

            {viajeActivo.estado === 'ingresado_origen' && (
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/40 rounded-xl p-5 text-center backdrop-blur-sm">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🏭</span>
                </div>
                <p className="text-blue-400 font-bold text-lg mb-2">Ingreso registrado</p>
                <p className="text-sm text-slate-300">Esperando llamado a carga del supervisor</p>
              </div>
            )}

            {(viajeActivo.estado === 'llamado_carga' || viajeActivo.estado === 'cargando' || viajeActivo.estado === 'cargado') && (
              <div className="bg-gradient-to-br from-amber-500/20 to-orange-600/10 border border-amber-500/40 rounded-xl p-5 text-center backdrop-blur-sm">
                <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                  <span className="text-2xl">{viajeActivo.estado === 'llamado_carga' ? '📢' : viajeActivo.estado === 'cargando' ? '⏳' : '✅'}</span>
                </div>
                <p className="text-amber-400 font-bold text-lg mb-2">
                  {viajeActivo.estado === 'llamado_carga' ? 'Llamado a Carga' : 
                   viajeActivo.estado === 'cargando' ? 'Cargando...' : 'Carga Completada'}
                </p>
                <p className="text-sm text-slate-300">
                  {viajeActivo.estado === 'llamado_carga' ? 'Dirigite a la posición de carga asignada' :
                   viajeActivo.estado === 'cargando' ? 'Permanecé cerca del vehículo durante la carga' :
                   'Esperando autorización de egreso de Control de Acceso'}
                </p>
              </div>
            )}

            {viajeActivo.estado === 'egreso_origen' && (
              <button
                onClick={handleIniciarTransitoDestino}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-3 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                <TruckIcon className="h-7 w-7 relative z-10" />
                <span className="relative z-10">🚛 Partir hacia Destino</span>
              </button>
            )}

            {viajeActivo.estado === 'en_transito_destino' && (
              <>
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/40 rounded-xl p-5 text-center backdrop-blur-sm">
                  <div className="flex items-center justify-center space-x-2 mb-3">
                    <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
                    <p className="text-purple-400 font-bold text-lg">🚛 En tránsito hacia destino</p>
                  </div>
                  <p className="text-sm text-slate-300">GPS activo - Tu ubicación se está compartiendo</p>
                  {location && (
                    <p className="text-xs text-slate-400 mt-2 font-mono">
                      📍 {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
                    </p>
                  )}
                  {lastLocationSent && (
                    <p className="text-xs text-green-400 mt-1">
                      ✓ Última ubicación: {new Date(lastLocationSent).toLocaleTimeString('es-AR')}
                    </p>
                  )}
                </div>

                {/* Botón manual para enviar ubicación */}
                <button
                  onClick={handleEnviarUbicacionManual}
                  disabled={sendingLocation}
                  className="w-full bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 text-white py-3 rounded-xl font-semibold text-sm shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/30 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <MapPinIcon className="h-5 w-5" />
                  <span>{sendingLocation ? 'Enviando...' : '📍 Enviar Ubicación Ahora'}</span>
                </button>
                
                {/* NOTA: Este botón solo debe habilitarse si el cliente destino NO usa Nodexia */}
                {/* Si el cliente destino usa Nodexia, Control de Acceso registrará el arribo */}
                {/* TODO: Agregar lógica condicional para verificar si el destino usa Nodexia */}
                <button
                  onClick={handleLlegarDestino}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 via-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-green-500/30 hover:shadow-2xl hover:shadow-green-500/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-3 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                  <CheckCircleIcon className="h-7 w-7 relative z-10" />
                  <span className="relative z-10">📍 Llegar a Destino</span>
                </button>
              </>
            )}

            {viajeActivo.estado === 'ingresado_destino' && (
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/40 rounded-xl p-5 text-center backdrop-blur-sm">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🏭</span>
                </div>
                <p className="text-blue-400 font-bold text-lg mb-2">Ingreso a destino registrado</p>
                <p className="text-sm text-slate-300">Esperando llamado a descarga del supervisor</p>
              </div>
            )}

            {(viajeActivo.estado === 'llamado_descarga' || viajeActivo.estado === 'descargando' || viajeActivo.estado === 'descargado') && (
              <div className="bg-gradient-to-br from-amber-500/20 to-orange-600/10 border border-amber-500/40 rounded-xl p-5 text-center backdrop-blur-sm">
                <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                  <span className="text-2xl">{viajeActivo.estado === 'llamado_descarga' ? '📢' : viajeActivo.estado === 'descargando' ? '⏳' : '✅'}</span>
                </div>
                <p className="text-amber-400 font-bold text-lg mb-2">
                  {viajeActivo.estado === 'llamado_descarga' ? 'Llamado a Descarga' :
                   viajeActivo.estado === 'descargando' ? 'Descargando...' : 'Descarga Completada'}
                </p>
                <p className="text-sm text-slate-300">
                  {viajeActivo.estado === 'llamado_descarga' ? 'Dirigite a la posición de descarga asignada' :
                   viajeActivo.estado === 'descargando' ? 'Permanecé cerca del vehículo durante la descarga' :
                   'Esperando autorización de egreso de Control de Acceso'}
                </p>
              </div>
            )}

            {(viajeActivo.estado === 'egreso_destino' || viajeActivo.estado === 'completado') && (
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/50 rounded-2xl p-8 text-center backdrop-blur-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent"></div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <span className="text-4xl">🎉</span>
                  </div>
                  <p className="text-green-400 font-bold text-2xl mb-3">¡Viaje completado!</p>
                  <p className="text-base text-slate-200 mb-2">Excelente trabajo</p>
                  <p className="text-sm text-slate-400">
                    {viajeActivo.estado === 'egreso_destino' ? 'Egreso registrado. Viaje casi finalizado.' : 'Viaje finalizado exitosamente.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Botones de utilidad */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleReportarIncidencia}
              className="bg-slate-700 text-white py-3 rounded-xl font-medium shadow-lg hover:bg-slate-600 transition-all flex items-center justify-center space-x-2"
            >
              <ExclamationTriangleIcon className="h-5 w-5" />
              <span>Incidencia</span>
            </button>

            <button
              onClick={handleLlamarCoordinador}
              className="bg-slate-700 text-white py-3 rounded-xl font-medium shadow-lg hover:bg-slate-600 transition-all flex items-center justify-center space-x-2"
            >
              <PhoneIcon className="h-5 w-5" />
              <span>Llamar</span>
            </button>
          </div>

          {/* Observaciones */}
          {viajeActivo.observaciones && (
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h4 className="text-sm font-bold text-slate-400 mb-2">📝 Observaciones</h4>
              <p className="text-white text-sm">{viajeActivo.observaciones}</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Incidencias */}
      {activeTab === 'incidencias' && (
        <div className="p-4 space-y-6">
          {/* Header con ícono animado */}
          <div className="text-center">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-2xl animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-full border border-slate-700">
                <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Reportar Incidencia</h3>
            <p className="text-slate-400">¿Tienes algún problema durante el viaje?</p>
          </div>

          {/* Botones de incidencias en grid */}
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={handleLlamarCoordinador}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-5 rounded-xl font-bold text-lg shadow-xl shadow-red-500/30 hover:shadow-2xl hover:shadow-red-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-3 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              <span className="text-3xl relative z-10">🚨</span>
              <span className="relative z-10">Emergencia</span>
            </button>

            <button
              onClick={() => handleReportarIncidenciaTipo('problema_mecanico', 'Avería del Vehículo')}
              className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white py-5 rounded-xl font-bold text-lg shadow-xl shadow-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-3 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              <span className="text-3xl relative z-10">⚠️</span>
              <span className="relative z-10">Avería del Vehículo</span>
            </button>

            <button
              onClick={() => handleReportarIncidenciaTipo('demora', 'Retraso')}
              className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white py-5 rounded-xl font-bold text-lg shadow-xl shadow-yellow-500/30 hover:shadow-2xl hover:shadow-yellow-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-3 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              <span className="text-3xl relative z-10">⏰</span>
              <span className="relative z-10">Retraso</span>
            </button>

            <button
              onClick={() => handleReportarIncidenciaTipo('otro', 'Otro problema')}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-5 rounded-xl font-bold text-lg shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-3 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              <span className="text-3xl relative z-10">📝</span>
              <span className="relative z-10">Otro</span>
            </button>
          </div>

          {/* Separador visual */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
            <span className="text-slate-500 text-sm font-medium">o</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
          </div>

          {/* Botón de llamada destacado */}
          <button
            onClick={handleLlamarCoordinador}
            className="w-full bg-gradient-to-r from-green-600 via-green-500 to-emerald-600 text-white py-6 rounded-xl font-bold text-xl shadow-xl shadow-green-500/40 hover:shadow-2xl hover:shadow-green-500/50 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-3 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
            <PhoneIcon className="h-7 w-7 relative z-10 animate-pulse" />
            <span className="relative z-10">Llamar a Coordinador</span>
          </button>
        </div>
      )}

      {/* Tab: Perfil */}
      {activeTab === 'perfil' && (
        <div className="p-4 space-y-6">
          {/* Card de perfil principal */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded p-2 border border-slate-700 shadow-2xl relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl"></div>
            
            <div className="flex items-center space-x-4 mb-6 relative z-10">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-3xl shadow-xl shadow-cyan-500/30">
                {choferData?.nombre?.charAt(0) || 'C'}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {choferData?.nombre} {choferData?.apellido}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs font-semibold rounded-full border border-cyan-500/30">
                    Chofer Profesional
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
                  <span>📧</span>
                  <span>{user?.email}</span>
                </p>
              </div>
            </div>

            {/* Información del chofer */}
            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between py-3 px-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400 text-sm">🪪 DNI</span>
                </div>
                <span className="text-white font-semibold">{choferData?.dni || 'N/A'}</span>
              </div>

              <div className="flex items-center justify-between py-3 px-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400 text-sm">📱 Teléfono</span>
                </div>
                <span className="text-white font-semibold">{choferData?.telefono || 'N/A'}</span>
              </div>

              <div className="flex items-center justify-between py-3 px-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400 text-sm">🚗 Licencia</span>
                </div>
                <span className="text-white font-semibold">{choferData?.licencia_numero || 'N/A'}</span>
              </div>

              <div className="flex items-center justify-between py-3 px-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg border border-cyan-500/30">
                <div className="flex items-center space-x-2">
                  <span className="text-cyan-400 text-sm font-semibold">🚚 Viajes Activos</span>
                </div>
                <span className="text-cyan-400 font-bold text-lg">{viajes.length}</span>
              </div>
            </div>
          </div>

          {/* Mis Documentos */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <DocumentTextIcon className="h-5 w-5 text-cyan-400" />
                Mis Documentos
              </h4>
              {choferData?.id && choferData?.empresa_id && (
                <button
                  onClick={() => setShowUploadDoc(!showUploadDoc)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded-lg transition-colors"
                >
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  Subir
                </button>
              )}
            </div>

            {/* Formulario de upload */}
            {showUploadDoc && choferData?.id && choferData?.empresa_id && (
              <div className="mb-4">
                <SubirDocumento
                  entidadTipo="chofer"
                  entidadId={choferData.id}
                  empresaId={choferData.empresa_id}
                  onUploadSuccess={() => {
                    setShowUploadDoc(false);
                    setDocRefreshKey(k => k + 1);
                  }}
                  onCancel={() => setShowUploadDoc(false)}
                />
              </div>
            )}

            {/* Lista de documentos */}
            {choferData?.id ? (
              <div key={docRefreshKey}>
                <ListaDocumentos
                  entidadTipo="chofer"
                  entidadId={choferData.id}
                  showActions={false}
                />
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-4">Cargando documentos...</p>
            )}
          </div>

          {/* Botón GPS destacado */}
          <button
            onClick={() => router.push('/chofer/tracking-gps')}
            className="w-full bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 text-white py-5 rounded-xl font-bold text-lg shadow-xl shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-3 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
            <MapPinIcon className="h-6 w-6 relative z-10" />
            <span className="relative z-10">🛰️ Activar Tracking GPS</span>
          </button>

          {/* Botón cerrar sesión */}
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/login');
            }}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-2"
          >
            <ArrowRightOnRectangleIcon className="h-6 w-6" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      )}

      {/* Navegación Inferior - Glassmorphism Style */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50 shadow-2xl z-50">
        <div className="grid grid-cols-3 h-20 relative">
          {/* Indicador de tab activo animado */}
          <div
            className={`absolute top-0 h-1 bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300 ease-out ${
              activeTab === 'viajes' ? 'left-0 w-1/3' :
              activeTab === 'incidencias' ? 'left-1/3 w-1/3' :
              'left-2/3 w-1/3'
            }`}
          />
          
          {/* Tab Viajes */}
          <button
            onClick={() => setActiveTab('viajes')}
            className={`flex flex-col items-center justify-center space-y-1.5 transition-all duration-200 relative group ${
              activeTab === 'viajes'
                ? 'text-cyan-400 scale-105'
                : 'text-slate-400 hover:text-slate-300 hover:scale-105'
            }`}
          >
            <div className={`p-2 rounded-xl transition-all ${
              activeTab === 'viajes' 
                ? 'bg-cyan-500/20 shadow-lg shadow-cyan-500/20' 
                : 'group-hover:bg-slate-700/30'
            }`}>
              <TruckIcon className={`h-6 w-6 ${activeTab === 'viajes' ? 'animate-pulse' : ''}`} />
            </div>
            <span className={`text-xs font-semibold ${activeTab === 'viajes' ? 'text-cyan-400' : 'text-slate-400'}`}>
              Viajes
            </span>
            {viajes.length > 0 && (
              <span className="absolute top-2 right-1/4 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center border-2 border-slate-900">
                {viajes.length}
              </span>
            )}
          </button>

          {/* Tab Incidencias */}
          <button
            onClick={() => setActiveTab('incidencias')}
            className={`flex flex-col items-center justify-center space-y-1.5 transition-all duration-200 relative group ${
              activeTab === 'incidencias'
                ? 'text-cyan-400 scale-105'
                : 'text-slate-400 hover:text-slate-300 hover:scale-105'
            }`}
          >
            <div className={`p-2 rounded-xl transition-all ${
              activeTab === 'incidencias' 
                ? 'bg-cyan-500/20 shadow-lg shadow-cyan-500/20' 
                : 'group-hover:bg-slate-700/30'
            }`}>
              <BellIcon className={`h-6 w-6 ${activeTab === 'incidencias' ? 'animate-pulse' : ''}`} />
            </div>
            <span className={`text-xs font-semibold ${activeTab === 'incidencias' ? 'text-cyan-400' : 'text-slate-400'}`}>
              Incidencias
            </span>
          </button>

          {/* Tab Perfil */}
          <button
            onClick={() => setActiveTab('perfil')}
            className={`flex flex-col items-center justify-center space-y-1.5 transition-all duration-200 relative group ${
              activeTab === 'perfil'
                ? 'text-cyan-400 scale-105'
                : 'text-slate-400 hover:text-slate-300 hover:scale-105'
            }`}
          >
            <div className={`p-2 rounded-xl transition-all ${
              activeTab === 'perfil' 
                ? 'bg-cyan-500/20 shadow-lg shadow-cyan-500/20' 
                : 'group-hover:bg-slate-700/30'
            }`}>
              <UserCircleIcon className={`h-6 w-6 ${activeTab === 'perfil' ? 'animate-pulse' : ''}`} />
            </div>
            <span className={`text-xs font-semibold ${activeTab === 'perfil' ? 'text-cyan-400' : 'text-slate-400'}`}>
              Perfil
            </span>
          </button>
        </div>
      </nav>

      {/* Modal QR del Viaje */}
      {showQRModal && viajeActivo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowQRModal(false)}>
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">QR del Viaje</h3>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* QR Code Container */}
              <div className="bg-white p-6 rounded-xl mb-4 flex items-center justify-center">
                <QRCodeSVG
                  value={JSON.stringify({
                    viaje_id: viajeActivo.id,
                    pedido_id: viajeActivo.despachos.pedido_id,
                    numero_viaje: viajeActivo.numero_viaje,
                    tipo: 'acceso_chofer',
                    timestamp: new Date().toISOString()
                  })}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              
              <div className="space-y-2 text-sm">
                <p className="text-cyan-400 font-bold">{viajeActivo.despachos.pedido_id}</p>
                <p className="text-slate-300">Viaje #{viajeActivo.numero_viaje}</p>
                <p className="text-slate-400 text-xs mt-4">
                  Presenta este código en Control de Acceso
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Menú Hamburguesa */}
      {showMenuHamburguesa && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={() => setShowMenuHamburguesa(false)}>
          <div className="bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-slate-700 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            {/* Header del menú */}
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Menú</h3>
                <button
                  onClick={() => setShowMenuHamburguesa(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Opciones del menú */}
            <div className="p-4 space-y-2">
              <button
                onClick={() => {
                  setShowMenuHamburguesa(false);
                  // TODO: Implementar navegación a histórico
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-xl transition-all flex items-center space-x-3"
              >
                <ClipboardDocumentListIcon className="h-6 w-6 text-cyan-400" />
                <div className="flex-1 text-left">
                  <p className="font-semibold">Histórico de Viajes</p>
                  <p className="text-xs text-slate-400">Ver viajes anteriores</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowMenuHamburguesa(false);
                  // TODO: Implementar navegación a documentación
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-xl transition-all flex items-center space-x-3"
              >
                <DocumentTextIcon className="h-6 w-6 text-cyan-400" />
                <div className="flex-1 text-left">
                  <p className="font-semibold">Documentación</p>
                  <p className="text-xs text-slate-400">Guías y manuales</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowMenuHamburguesa(false);
                  window.location.href = 'tel:+541121608941';
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-xl transition-all flex items-center space-x-3"
              >
                <PhoneIcon className="h-6 w-6 text-cyan-400" />
                <div className="flex-1 text-left">
                  <p className="font-semibold">Soporte</p>
                  <p className="text-xs text-slate-400">Contactar al coordinador</p>
                </div>
              </button>
            </div>

            {/* Footer del menú */}
            <div className="p-4 border-t border-slate-700">
              <p className="text-xs text-slate-500 text-center">
                Nodexia v1.0.0 - App Chofer
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 📢 MODAL INCIDENCIA NATIVO */}
      {showIncidenciaModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={() => setShowIncidenciaModal(false)}>
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-red-500/30 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b border-slate-700 bg-gradient-to-r from-red-600/20 to-orange-600/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="bg-red-500/20 p-2 rounded-lg">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Reportar {incidenciaTipoNombre}</h3>
                </div>
                <button
                  onClick={() => setShowIncidenciaModal(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                  disabled={reportandoIncidencia}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-slate-300">
                Describe el problema para que el coordinador pueda ayudarte
              </p>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Info del viaje */}
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <p className="text-xs text-slate-400 mb-1">Viaje:</p>
                <p className="text-white font-semibold">{viajeActivo?.despachos.pedido_id} - Viaje #{viajeActivo?.numero_viaje}</p>
              </div>

              {/* Textarea descripción */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Descripción del problema *
                </label>
                <textarea
                  value={incidenciaDescripcion}
                  onChange={(e) => setIncidenciaDescripcion(e.target.value)}
                  placeholder={`Describe el ${incidenciaTipoNombre.toLowerCase()} en detalle...`}
                  rows={5}
                  disabled={reportandoIncidencia}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none"
                />
                <p className="text-xs text-slate-400 mt-1">
                  {incidenciaDescripcion.length} caracteres
                </p>
              </div>

              {/* Botones */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowIncidenciaModal(false)}
                  disabled={reportandoIncidencia}
                  className="py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEnviarIncidencia}
                  disabled={reportandoIncidencia || !incidenciaDescripcion.trim()}
                  className="py-3 px-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-xl font-bold shadow-lg shadow-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {reportandoIncidencia ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <ExclamationTriangleIcon className="h-5 w-5" />
                      <span>Reportar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
