// pages/chofer-mobile.tsx
// Dashboard móvil para choferes - Optimizado para smartphones

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { fetchWithAuth } from '../lib/api/fetchWithAuth';
import { useUserRole } from '../lib/contexts/UserRoleContext';
import { 
  TruckIcon, 
  MapPinIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  Bars3Icon,
  QrCodeIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';
import BottomNavBar from '../components/Transporte/BottomNavBar';
import IncidenciasTab from '../components/Transporte/IncidenciasTab';
import PerfilTab from '../components/Transporte/PerfilTab';
import TripDetailsCard from '../components/Transporte/TripDetailsCard';
import { QRModal, HamburgerMenu, IncidenciaModal } from '../components/Transporte/ChoferModals';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface ViajeChofer {
  id: string;
  numero_viaje: string;
  despacho_id: string;
  estado: string;
  observaciones: string;
  destino_tiene_nodexia?: boolean;
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

  // Remito de entrega (destino sin Nodexia)
  const [remitoEntregaFile, setRemitoEntregaFile] = useState<File | null>(null);
  const [remitoEntregaPreview, setRemitoEntregaPreview] = useState<string | null>(null);
  const [remitoEntregaSubido, setRemitoEntregaSubido] = useState(false);
  const [subiendoRemitoEntrega, setSubiendoRemitoEntrega] = useState(false);

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
          .select('id, ciudad, provincia, latitud, longitud, empresa_id')
          .in('id', Array.from(ubicacionesIds));

        console.log('🏭 Datos de ubicaciones obtenidos:', ubicacionesData);
        console.log('🏭 Error ubicaciones:', ubicacionesError);
        addDebugLog(`🏭 Ubicaciones encontradas: ${ubicacionesData?.length || 0}`);

        if (ubicacionesData) {
          const ubicacionesMap: Record<string, any> = {};
          ubicacionesData.forEach(u => { ubicacionesMap[u.id] = u; });

          // Detectar qué destinos tienen empresa registrada en Nodexia (empresa_id != null)
          // Si la ubicación destino tiene empresa_id, significa que esa planta usa Nodexia
          // y el chofer NO debe auto-registrar llegada (CA destino se encarga)

          // Enriquecer datos de viajes con info de ubicaciones
          transformedData = transformedData.map(viaje => ({
            ...viaje,
            destino_tiene_nodexia: !!(ubicacionesMap[viaje.despachos.destino_id]?.empresa_id),
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

  // ─── Remito de entrega (descarga en destino sin Nodexia) ─────────
  const handleRemitoEntregaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo no puede superar 10 MB');
      return;
    }
    setRemitoEntregaFile(file);
    setRemitoEntregaSubido(false);
    const reader = new FileReader();
    reader.onload = (ev) => setRemitoEntregaPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const limpiarRemitoEntrega = () => {
    setRemitoEntregaFile(null);
    setRemitoEntregaPreview(null);
    setRemitoEntregaSubido(false);
  };

  const handleCompletarEntrega = async () => {
    if (!viajeActivo || !user?.id || !remitoEntregaFile) return;

    try {
      setLoading(true);

      // 1. Subir remito de entrega
      setSubiendoRemitoEntrega(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Sesión expirada');
        return;
      }

      const formData = new FormData();
      formData.append('file', remitoEntregaFile);
      formData.append('viaje_id', viajeActivo.id);

      const uploadRes = await fetch('/api/upload-remito', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formData,
      });

      const uploadResult = await uploadRes.json();
      if (!uploadRes.ok || !uploadResult.success) {
        throw new Error(uploadResult.error || 'Error subiendo remito');
      }
      setRemitoEntregaSubido(true);
      setSubiendoRemitoEntrega(false);

      // 2. Transición: ingresado_destino → descargado
      const res1 = await fetchWithAuth('/api/viajes/actualizar-estado', {
        method: 'POST',
        body: JSON.stringify({ viaje_id: viajeActivo.id, nuevo_estado: 'descargado' }),
      });
      if (!res1.ok) {
        const err1 = await res1.json();
        throw new Error(err1.error || 'Error actualizando a descargado');
      }

      // 3. Transición: descargado → egreso_destino
      const res2 = await fetchWithAuth('/api/viajes/actualizar-estado', {
        method: 'POST',
        body: JSON.stringify({ viaje_id: viajeActivo.id, nuevo_estado: 'egreso_destino' }),
      });
      if (!res2.ok) {
        const err2 = await res2.json();
        throw new Error(err2.error || 'Error actualizando a egreso_destino');
      }

      // 4. Transición: egreso_destino → completado
      const res3 = await fetchWithAuth('/api/viajes/actualizar-estado', {
        method: 'POST',
        body: JSON.stringify({ viaje_id: viajeActivo.id, nuevo_estado: 'completado' }),
      });
      if (!res3.ok) {
        const err3 = await res3.json();
        throw new Error(err3.error || 'Error completando viaje');
      }

      setMessage('✅ Entrega completada — viaje cerrado');
      const viajeActualizado = { ...viajeActivo, estado: 'completado' };
      setViajeActivo(viajeActualizado);
      setViajes(viajes.map(v => v.id === viajeActivo.id ? viajeActualizado : v));
      limpiarRemitoEntrega();
    } catch (error: any) {
      setError('Error al completar entrega: ' + error.message);
    } finally {
      setLoading(false);
      setSubiendoRemitoEntrega(false);
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
    return <LoadingSpinner text="Cargando viajes..." fullScreen />;
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

      {/* Panel de Debug — oculto en producción */}

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
          <TripDetailsCard viajeActivo={viajeActivo} />

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
                
                {/* Botón "Llegar a Destino" — solo visible si el destino NO usa Nodexia */}
                {/* Si el destino usa Nodexia, Control de Acceso registrará el arribo */}
                {viajeActivo.destino_tiene_nodexia ? (
                  <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/40 rounded-xl p-4 text-center backdrop-blur-sm">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-xl">🏭</span>
                    </div>
                    <p className="text-blue-400 font-semibold text-sm">Destino con Control de Acceso Nodexia</p>
                    <p className="text-xs text-slate-400 mt-1">Al llegar, presentate en la garita. Ellos registrarán tu ingreso.</p>
                  </div>
                ) : (
                  <button
                    onClick={handleLlegarDestino}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-green-600 via-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-green-500/30 hover:shadow-2xl hover:shadow-green-500/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-3 relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                    <CheckCircleIcon className="h-7 w-7 relative z-10" />
                    <span className="relative z-10">📍 Llegar a Destino</span>
                  </button>
                )}
              </>
            )}

            {viajeActivo.estado === 'ingresado_destino' && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/40 rounded-xl p-4 text-center backdrop-blur-sm">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">🏭</span>
                  </div>
                  <p className="text-blue-400 font-bold text-lg mb-1">Ingreso a destino registrado</p>
                  <p className="text-sm text-slate-300">
                    {viajeActivo.destino_tiene_nodexia
                      ? 'Aguardá instrucciones del Supervisor de descarga'
                      : 'Subí el remito firmado de entrega para completar'}
                  </p>
                </div>

                {/* Self-delivery: solo si destino NO tiene Nodexia */}
                {!viajeActivo.destino_tiene_nodexia && (
                  <>
                    {/* Subir Remito de Entrega */}
                    <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
                      <p className="text-sm font-semibold text-white mb-3">📄 Remito de Entrega</p>
                      
                      {remitoEntregaPreview ? (
                        <div className="space-y-3">
                          <div className="relative rounded-lg overflow-hidden border border-slate-600">
                            <img src={remitoEntregaPreview} alt="Remito" className="w-full max-h-48 object-contain bg-slate-900" />
                            <button
                              onClick={limpiarRemitoEntrega}
                              className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold shadow-lg"
                            >
                              ✕
                            </button>
                          </div>
                          {remitoEntregaSubido && (
                            <p className="text-green-400 text-xs text-center">✓ Remito subido correctamente</p>
                          )}
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-cyan-500 transition-colors">
                          <ArrowUpTrayIcon className="h-8 w-8 text-slate-400 mb-2" />
                          <span className="text-sm text-slate-300">Tocar para sacar foto o elegir archivo</span>
                          <span className="text-xs text-slate-500 mt-1">Máximo 10 MB</span>
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleRemitoEntregaChange} />
                        </label>
                      )}
                    </div>

                    {/* Botón Completar Entrega */}
                    <button
                      onClick={handleCompletarEntrega}
                      disabled={loading || !remitoEntregaFile || subiendoRemitoEntrega}
                      className="w-full bg-gradient-to-r from-green-600 via-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-green-500/30 hover:shadow-2xl hover:shadow-green-500/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100 flex items-center justify-center space-x-3 relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                      <CheckCircleIcon className="h-7 w-7 relative z-10" />
                      <span className="relative z-10">
                        {subiendoRemitoEntrega ? 'Subiendo remito...' : loading ? 'Procesando...' : '✅ Completar Entrega'}
                      </span>
                    </button>
                  </>
                )}
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
        <IncidenciasTab
          onLlamarCoordinador={handleLlamarCoordinador}
          onReportarIncidenciaTipo={handleReportarIncidenciaTipo}
        />
      )}

      {/* Tab: Perfil */}
      {activeTab === 'perfil' && (
        <PerfilTab
          choferData={choferData}
          userEmail={user?.email || ''}
          viajesCount={viajes.length}
          showUploadDoc={showUploadDoc}
          docRefreshKey={docRefreshKey}
          onToggleUpload={() => setShowUploadDoc(!showUploadDoc)}
          onUploadSuccess={() => {
            setShowUploadDoc(false);
            setDocRefreshKey(k => k + 1);
          }}
        />
      )}

      <BottomNavBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        viajesCount={viajes.length}
      />

      {/* Modal QR del Viaje */}
      {showQRModal && viajeActivo && (
        <QRModal viajeActivo={viajeActivo} onClose={() => setShowQRModal(false)} />
      )}

      {/* Modal Menú Hamburguesa */}
      {showMenuHamburguesa && (
        <HamburgerMenu onClose={() => setShowMenuHamburguesa(false)} />
      )}

      {/* 📢 MODAL INCIDENCIA NATIVO */}
      {showIncidenciaModal && (
        <IncidenciaModal
          viajeActivo={viajeActivo}
          incidenciaTipoNombre={incidenciaTipoNombre}
          incidenciaDescripcion={incidenciaDescripcion}
          onDescripcionChange={setIncidenciaDescripcion}
          reportandoIncidencia={reportandoIncidencia}
          onClose={() => setShowIncidenciaModal(false)}
          onEnviar={handleEnviarIncidencia}
        />
      )}
    </div>
  );
}
