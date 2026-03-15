import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../supabaseClient';
import { fetchWithAuth } from '../api/fetchWithAuth';
import { useUserRole } from '../contexts/UserRoleContext';

// ─── Types ──────────────────────────────────────────────────────────────

export interface ViajeChofer {
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

export interface UbicacionGPS {
  lat: number;
  lon: number;
  precision?: number;
  velocidad?: number;
}

// ─── Hook ───────────────────────────────────────────────────────────────

export default function useChoferMobile() {
  const router = useRouter();
  const { user, primaryRole } = useUserRole();

  // Core data
  const [loading, setLoading] = useState(true);
  const [viajes, setViajes] = useState<ViajeChofer[]>([]);
  const [viajeActivo, setViajeActivo] = useState<ViajeChofer | null>(null);
  const [choferData, setChoferData] = useState<any>(null);

  // Feedback
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // Connectivity / GPS
  const [isOnline, setIsOnline] = useState(true);
  const [location, setLocation] = useState<UbicacionGPS | null>(null);
  const [lastLocationSent, setLastLocationSent] = useState<Date | null>(null);
  const [sendingLocation, setSendingLocation] = useState(false);

  // Navigation
  const [activeTab, setActiveTab] = useState<'viajes' | 'incidencias' | 'perfil'>('viajes');

  // UI modals
  const [showMenuHamburguesa, setShowMenuHamburguesa] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showUploadDoc, setShowUploadDoc] = useState(false);
  const [docRefreshKey, setDocRefreshKey] = useState(0);

  // Incidencia modal
  const [showIncidenciaModal, setShowIncidenciaModal] = useState(false);
  const [incidenciaTipo, setIncidenciaTipo] = useState<string>('');
  const [incidenciaTipoNombre, setIncidenciaTipoNombre] = useState<string>('');
  const [incidenciaDescripcion, setIncidenciaDescripcion] = useState<string>('');
  const [reportandoIncidencia, setReportandoIncidencia] = useState(false);

  // Remito entrega
  const [remitoEntregaFile, setRemitoEntregaFile] = useState<File | null>(null);
  const [remitoEntregaPreview, setRemitoEntregaPreview] = useState<string | null>(null);
  const [remitoEntregaSubido, setRemitoEntregaSubido] = useState(false);
  const [subiendoRemitoEntrega, setSubiendoRemitoEntrega] = useState(false);

  // ─── Helpers ──────────────────────────────────────────────────────────

  const addDebugLog = (msg: string) => {
    console.log(msg);
    setDebugLogs(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  // ─── Effects ──────────────────────────────────────────────────────────

  // Sync activeTab from query param
  useEffect(() => {
    const tab = router.query.tab as string;
    if (tab === 'perfil' || tab === 'incidencias' || tab === 'viajes') {
      setActiveTab(tab);
    }
  }, [router.query.tab]);

  // Redirect non-chofer
  useEffect(() => {
    if (user && primaryRole !== 'chofer') {
      router.push('/dashboard');
    }
  }, [user, primaryRole, router]);

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchChoferData();
      fetchViajes();
    }
  }, [user]);

  // Auto-clear messages
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

  // Reload viajes on tab switch (throttled)
  useEffect(() => {
    if (activeTab === 'viajes' && user) {
      const ahora = Date.now();
      const ultimaCarga = localStorage.getItem('ultima_carga_viajes');
      if (!ultimaCarga || ahora - parseInt(ultimaCarga) > 5000) {
        fetchViajes();
        localStorage.setItem('ultima_carga_viajes', ahora.toString());
      }
    }
  }, [activeTab]);

  // Online/offline detection
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

  // GPS tracking
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

          if (result.estado_detectado) {
            setMessage(`📍 ${result.estado_detectado === 'ingresado_origen' ? 'Arribaste al origen' : 'Arribaste al destino'}`);
            fetchViajes();
          }
        } else {
          const err = await response.json();
          console.error('❌ Error enviando ubicación:', err);
        }
      } catch (err) {
        console.error('❌ Error al enviar ubicación:', err);
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
        enviarUbicacion(position);
      },
      (gpsError) => {
        console.error('❌ Error obteniendo ubicación:', gpsError);
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

  // Realtime subscription
  useEffect(() => {
    if (!choferData?.id) return;

    console.log('🔔 Chofer Móvil - Suscripción realtime activada');

    const channel = supabase
      .channel('chofer-viajes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'viajes_despacho',
          filter: `chofer_id=eq.${choferData.id}`
        },
        (payload) => {
          console.log('🔔 Chofer Móvil - Cambio detectado en viaje:', payload);

          if (payload.eventType === 'UPDATE') {
            const oldData = payload.old as any;
            const newData = payload.new as any;

            if (oldData?.scheduled_at !== newData?.scheduled_at) {
              setMessage('🔄 Viaje reprogramado - Revisa la nueva fecha');
              addDebugLog('🔄 Viaje reprogramado');
            }

            if (oldData?.estado !== newData?.estado) {
              setMessage(`📋 Estado actualizado a: ${newData.estado}`);
              addDebugLog(`📋 Estado: ${newData.estado}`);
            }
          }

          fetchViajes();
        }
      )
      .subscribe();

    return () => {
      console.log('🔕 Chofer Móvil - Desuscribiendo');
      supabase.removeChannel(channel);
    };
  }, [choferData]);

  // ─── Data Loading ─────────────────────────────────────────────────────

  const fetchChoferData = async () => {
    if (!user?.id) return;
    try {
      const { data, error: fetchError } = await supabase
        .from('choferes')
        .select('*')
        .eq('usuario_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setChoferData(data);
    } catch (err) {
      console.error('Error cargando datos del chofer:', err);
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
        .maybeSingle();

      if (choferError || !chofer) {
        console.error('❌ Chofer no encontrado:', choferError);
        setError('No se encontró el perfil de chofer');
        return;
      }

      console.log('✅ Chofer encontrado:', chofer.id);

      const { data, error: viajesError } = await supabase
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
        .in('estado', [
          'transporte_asignado', 'camion_asignado', 'confirmado_chofer',
          'en_transito_origen', 'ingresado_origen', 'llamado_carga', 'cargando', 'cargado',
          'egreso_origen', 'en_transito_destino', 'ingresado_destino',
          'llamado_descarga', 'descargando', 'descargado', 'egreso_destino', 'completado'
        ])
        .order('created_at', { ascending: false });

      if (viajesError) throw viajesError;

      // Transform data to match interface
      let transformedData = (data || []).map(item => ({
        ...item,
        despachos: Array.isArray(item.despachos) ? item.despachos[0] : item.despachos,
        camiones: Array.isArray(item.camiones) ? item.camiones[0] : item.camiones
      })) as ViajeChofer[];

      // Enrich with ubicaciones data
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
          addDebugLog('✅ Datos enriquecidos OK');
        }
      }

      setViajes(transformedData);

      if (transformedData.length > 0 && !viajeActivo) {
        setViajeActivo(transformedData[0] || null);
      }
    } catch (err: any) {
      console.error('Error cargando viajes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Handlers ─────────────────────────────────────────────────────────

  /** Helper: transition viaje to new state via API + update local state */
  const transitionEstado = async (nuevoEstado: string, successMsg: string) => {
    if (!viajeActivo || !user?.id) return;
    try {
      setLoading(true);
      addDebugLog(`🔵 Cambiando estado a ${nuevoEstado}...`);

      const response = await fetchWithAuth('/api/viajes/actualizar-estado', {
        method: 'POST',
        body: JSON.stringify({ viaje_id: viajeActivo.id, nuevo_estado: nuevoEstado })
      });

      const result = await response.json();
      if (!response.ok) {
        addDebugLog(`❌ Error: ${result.error}`);
        throw new Error(result.error || `Error al cambiar a ${nuevoEstado}`);
      }

      addDebugLog(`✅ Estado actualizado a ${nuevoEstado}`);
      setMessage(successMsg);

      const viajeActualizado = { ...viajeActivo, estado: nuevoEstado };
      setViajeActivo(viajeActualizado);
      setViajes(prev => prev.map(v => v.id === viajeActivo.id ? viajeActualizado : v));
    } catch (err: any) {
      console.error(`Error al cambiar a ${nuevoEstado}:`, err);
      addDebugLog(`❌ ${err.message}`);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarViaje = () => transitionEstado('confirmado_chofer', '✅ Viaje confirmado exitosamente');
  const handleIniciarViaje = () => transitionEstado('en_transito_origen', '✅ Viaje iniciado - GPS activado');
  const handleIniciarTransitoDestino = () => transitionEstado('en_transito_destino', '✅ Viaje iniciado hacia destino');
  const handleLlegarDestino = () => transitionEstado('ingresado_destino', '✅ Llegada a destino registrada');

  // Remito de entrega
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

      // 1. Upload remito
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

      // 2. Transition: ingresado_destino → descargado
      const res1 = await fetchWithAuth('/api/viajes/actualizar-estado', {
        method: 'POST',
        body: JSON.stringify({ viaje_id: viajeActivo.id, nuevo_estado: 'descargado' }),
      });
      if (!res1.ok) {
        const err1 = await res1.json();
        throw new Error(err1.error || 'Error actualizando a descargado');
      }

      // 3. Transition: descargado → egreso_destino
      const res2 = await fetchWithAuth('/api/viajes/actualizar-estado', {
        method: 'POST',
        body: JSON.stringify({ viaje_id: viajeActivo.id, nuevo_estado: 'egreso_destino' }),
      });
      if (!res2.ok) {
        const err2 = await res2.json();
        throw new Error(err2.error || 'Error actualizando a egreso_destino');
      }

      // 4. Transition: egreso_destino → completado
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
      setViajes(prev => prev.map(v => v.id === viajeActivo.id ? viajeActualizado : v));
      limpiarRemitoEntrega();
    } catch (err: any) {
      setError('Error al completar entrega: ' + err.message);
    } finally {
      setLoading(false);
      setSubiendoRemitoEntrega(false);
    }
  };

  // Incidencias
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
      const { error: insertError } = await supabase.from('incidencias_viaje').insert({
        viaje_id: viajeActivo.id,
        tipo_incidencia: tipo,
        descripcion: descripcion,
        reportado_por: user?.id,
        fecha_reporte: new Date().toISOString(),
        estado_resolucion: 'pendiente'
      });

      if (insertError) throw insertError;

      alert('✅ Incidencia reportada correctamente');
      addDebugLog('📢 Incidencia reportada');
    } catch (err: any) {
      console.error('Error reportando incidencia:', err);
      alert('❌ Error al reportar incidencia: ' + err.message);
    }
  };

  const handleReportarIncidenciaTipo = async (tipo: string, tipoNombre: string) => {
    if (!viajeActivo) {
      setError('No hay viaje activo seleccionado');
      return;
    }

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

      const { error: incidenciaError } = await supabase.from('incidencias_viaje').insert({
        viaje_id: viajeActivo.id,
        tipo_incidencia: incidenciaTipo,
        descripcion: incidenciaDescripcion,
        reportado_por: user?.id,
        fecha_reporte: new Date().toISOString(),
        estado_resolucion: 'pendiente'
      });

      if (incidenciaError) throw incidenciaError;

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
        }

        setMessage(`⚠️ ${incidenciaTipoNombre} reportado - Viaje pausado`);
        addDebugLog(`📢 ${incidenciaTipoNombre} - Viaje PAUSADO`);
      } else {
        setMessage(`✅ ${incidenciaTipoNombre} reportado correctamente`);
        addDebugLog(`📢 ${incidenciaTipoNombre} reportado (viaje continúa)`);
      }

      await fetchViajes();

      setShowIncidenciaModal(false);
      setActiveTab('viajes');
    } catch (err: any) {
      console.error('Error reportando incidencia:', err);
      setError('Error al reportar incidencia: ' + err.message);
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

      // Attempt real GPS
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
        // Fallback: simulated coordinates for testing
        addDebugLog(`⚠️ GPS falló: ${gpsError.message}`);
        addDebugLog('🎭 Usando coordenadas simuladas para testing...');

        const baseLatOrigen = -34.603684;
        const baseLonOrigen = -58.381559;
        const baseLatDestino = -32.941668;
        const baseLonDestino = -60.693645;

        const progress = (Date.now() % 10000) / 10000;
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
            speed: 80
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
        const err = await response.json();
        addDebugLog(`❌ Error del servidor: ${err.error}`);
        throw new Error(err.error || 'Error al enviar ubicación');
      }
    } catch (err: any) {
      console.error('❌ Error enviando ubicación manual:', err);
      addDebugLog(`❌ Error: ${err.message}`);
      setError(err.message || 'No se pudo obtener tu ubicación GPS');
    } finally {
      setSendingLocation(false);
      addDebugLog('🏁 Proceso de ubicación finalizado');
    }
  };

  const handleLlamarCoordinador = () => {
    window.location.href = 'tel:+541121608941';
  };

  // ─── Return ───────────────────────────────────────────────────────────

  return {
    // Core data
    loading,
    viajes,
    viajeActivo,
    choferData,
    user,

    // Feedback
    message,
    error,
    debugLogs,

    // Connectivity / GPS
    isOnline,
    location,
    lastLocationSent,
    sendingLocation,

    // Navigation
    activeTab,
    setActiveTab,

    // UI modals
    showQRModal,
    setShowQRModal,
    showMenuHamburguesa,
    setShowMenuHamburguesa,
    showUploadDoc,
    setShowUploadDoc,
    docRefreshKey,
    setDocRefreshKey,

    // Incidencia modal
    showIncidenciaModal,
    setShowIncidenciaModal,
    incidenciaTipoNombre,
    incidenciaDescripcion,
    setIncidenciaDescripcion,
    reportandoIncidencia,

    // Remito entrega
    remitoEntregaFile,
    remitoEntregaPreview,
    remitoEntregaSubido,
    subiendoRemitoEntrega,

    // Actions
    handleConfirmarViaje,
    handleIniciarViaje,
    handleIniciarTransitoDestino,
    handleLlegarDestino,
    handleRemitoEntregaChange,
    limpiarRemitoEntrega,
    handleCompletarEntrega,
    handleReportarIncidencia,
    handleReportarIncidenciaTipo,
    handleEnviarIncidencia,
    handleEnviarUbicacionManual,
    handleLlamarCoordinador,
  };
}
