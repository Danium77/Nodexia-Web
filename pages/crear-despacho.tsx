import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { fetchWithAuth } from '../lib/api/fetchWithAuth';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import AssignTransportModal from '../components/Modals/AssignTransportModal';
import ConfirmDeleteModal from '../components/Modals/ConfirmDeleteModal';
import CancelarDespachoModal from '../components/Modals/CancelarDespachoModal';
import ReprogramarModal from '../components/Modals/ReprogramarModal';
import AbrirRedNodexiaModal from '../components/Transporte/AbrirRedNodexiaModal';
import VerEstadoRedNodexiaModal from '../components/Transporte/VerEstadoRedNodexiaModal';
import ViajesSubTable from '../components/Despachos/ViajesSubTable';
import DespachoForm from '../components/Despachos/DespachoForm';
import DespachoTableRow from '../components/Despachos/DespachoTableRow';
import DespachoTabs, { filterDespachosByTab } from '../components/Despachos/DespachoTabs';
import type { FormDispatchRow } from '../components/Despachos/DespachoForm';
import type { DespachoTab } from '../components/Despachos/DespachoTabs';
import { calcularEstadoOperativo, esEstadoEnMovimiento as estaEnMovimiento, esEstadoFinal as esFinal } from '../lib/estados';
import { getEstadoDisplay } from '../lib/helpers/estados-helpers';
import TimelineDespachoModal from '../components/Despachos/TimelineDespachoModal';

interface EmpresaOption {
  id: string;
  nombre: string;
  cuit: string;
  direccion?: string;
}

interface GeneratedDispatch {
  id: string;
  pedido_id: string;
  origen: string;
  destino: string;
  estado: string;
  fecha_despacho: string;
  hora_despacho?: string; // 🔥 NUEVO
  tipo_carga: string;
  prioridad: string;
  unidad_type: string;
  observaciones: string;
  cantidad_viajes_solicitados?: number;
  viajes_generados?: number; // Total de viajes creados
  viajes_asignados?: number; // 🔥 NUEVO: Solo viajes con transporte asignado
  viajes_sin_asignar?: number; // 🔥 NUEVO
  viajes_cancelados_por_transporte?: number; // 🔥 NUEVO
  origen_asignacion?: 'directo' | 'red_nodexia'; // 🔥 NUEVO: Origen de la asignación
  transporte_data?: { 
    nombre: string;
    cuit?: string;
    tipo?: string;
    contacto?: any;
    esMultiple?: boolean; // 🔥 NUEVO: Indica si hay múltiples transportes
  } | undefined;
}

const CrearDespacho = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [userEmpresas, setUserEmpresas] = useState<any[]>([]);

  // Derivar empresaPlanta de userEmpresas
  const empresaPlanta = userEmpresas?.find(
    (rel: any) => rel.empresas?.tipo_empresa !== 'transporte'
  );

  // Estados para empresas disponibles
  const [_plantas, setPlantas] = useState<EmpresaOption[]>([]);
  const [_clientes, setClientes] = useState<EmpresaOption[]>([]);
  const [_transportes, setTransportes] = useState<EmpresaOption[]>([]);
  const [_loadingOptions, setLoadingOptions] = useState(true);

  // Estados para formulario dinámico
  const [formRows, setFormRows] = useState<FormDispatchRow[]>([
    {
      tempId: 1,
      pedido_id: '',
      origen: '',
      destino: '',
      fecha_despacho: '',
      hora_despacho: '',
      tipo_carga: '',
      prioridad: 'Media' as const,
      cantidad_viajes_solicitados: 1, // NUEVO - Default 1 viaje
      unidad_type: '',
      observaciones: '',
    },
  ]);

  const [generatedDispatches, setGeneratedDispatches] = useState<GeneratedDispatch[]>([]);
  const [loadingGenerated, setLoadingGenerated] = useState(true);

  // Estados para modal de asignación de transporte
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedDispatchForAssign, setSelectedDispatchForAssign] = useState<GeneratedDispatch | null>(null);

  // Estados para modal de Red Nodexia
  const [isRedNodexiaModalOpen, setIsRedNodexiaModalOpen] = useState(false);
  const [selectedDispatchForRed, setSelectedDispatchForRed] = useState<GeneratedDispatch | null>(null);
  const [selectedViajeForRed, setSelectedViajeForRed] = useState<any>(null);

  // Estado para modal Ver Estado Red Nodexia
  const [isVerEstadoModalOpen, setIsVerEstadoModalOpen] = useState(false);
  const [selectedViajeRedId, setSelectedViajeRedId] = useState<string>('');
  const [selectedViajeNumero, setSelectedViajeNumero] = useState<string>('');

  // Estados para tabs de despachos
  const [activeTab, setActiveTab] = useState<DespachoTab>('pendientes');

  // Estados para modal de Reprogramar
  const [isReprogramarModalOpen, setIsReprogramarModalOpen] = useState(false);
  const [selectedDispatchForReprogram, setSelectedDispatchForReprogram] = useState<GeneratedDispatch | null>(null);

  // Estados para modal de Cancelar despacho
  const [isCancelarModalOpen, setIsCancelarModalOpen] = useState(false);
  const [selectedDispatchForCancel, setSelectedDispatchForCancel] = useState<GeneratedDispatch | null>(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');

  // Estados para selección múltiple de despachos
  const [selectedDespachos, setSelectedDespachos] = useState<Set<string>>(new Set());
  const [expandedDespachos, setExpandedDespachos] = useState<Set<string>>(new Set()); // 🔥 NUEVO: Control de filas expandidas
  const [viajesDespacho, setViajesDespacho] = useState<Record<string, any[]>>({}); // 🔥 NUEVO: Cache de viajes por despacho
  const [selectAll, setSelectAll] = useState(false);
  const [deletingDespachos, setDeletingDespachos] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [despachosPendingDelete, setDespachosPendingDelete] = useState<Set<string>>(new Set());
  const [forceRefresh, setForceRefresh] = useState(0); // Para forzar re-renders

  // Estado para Timeline
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [timelineDespachoId, setTimelineDespachoId] = useState('');
  const [timelinePedidoId, setTimelinePedidoId] = useState('');

  // Cargar datos del usuario
  useEffect(() => {
    checkUser();
  }, []);

  // Cargar empresas asociadas cuando el usuario esté disponible
  useEffect(() => {
    if (user?.id) {
      cargarEmpresasAsociadas();
    }
  }, [user]);

  const checkUser = async () => {
    const { data: { user: currentUserData }, error } = await supabase.auth.getUser();
    
    if (error || !currentUserData || !currentUserData.id) {
      router.push('/login');
    } else {
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('nombre_completo')
        .eq('id', currentUserData.id)
        .single();

      if (userError || !userData || !userData.nombre_completo) {
        setUserName(currentUserData.email?.split('@')[0] || 'Usuario');
      } else {
        setUserName(userData.nombre_completo);
      }
      setUser(currentUserData);
      
      // Cargar despachos del usuario (primera carga con loading)
      fetchGeneratedDispatches(currentUserData.id, true);
    }
  };

  const fetchGeneratedDispatches = useCallback(async (userId: string, forceLoading = false) => {
    
    if (!userId) {
      console.error('❌ No userId proporcionado para fetchGeneratedDispatches');
      return;
    }

    // Mostrar loading si se fuerza o si es primera carga
    if (forceLoading) {
      setLoadingGenerated(true);
    }

    try {
      // Usar tabla despachos original para el flujo de generación -> asignación con LEFT JOIN a empresas
      
      // Primero, hacer query sin filtro de estado para ver todos los despachos del usuario
      const { data: allData } = await supabase
        .from('despachos')
        .select('id, pedido_id, estado, transport_id')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      
      const { data, error } = await supabase
        .from('despachos')
        .select(`
          id,
          pedido_id,
          origen,
          destino,
          estado,
          scheduled_local_date,
          scheduled_local_time,
          type,
          prioridad,
          unidad_type,
          comentarios,
          transport_id,
          cantidad_viajes_solicitados,
          origen_asignacion,
          created_by
        `)
        .eq('created_by', userId)
        .order('scheduled_local_date', { ascending: false })
        .order('scheduled_local_time', { ascending: false });


      if (error) {
        console.error('❌ Error al cargar despachos generados:', error.message);
        console.error('❌ Error completo:', error);
        throw error;
      }

      
      // Mapear los datos y obtener información del transporte si existe
      const mappedData: GeneratedDispatch[] = await Promise.all((data || []).map(async (d) => {
        
        // 🔥 NUEVO: Obtener conteo de viajes desde viajes_despacho
        let viajesGenerados = 0;
        let viajesAsignados = 0; // 🔥 NUEVO: Solo viajes realmente asignados
        let viajesSinAsignar = 0;
        let viajesCanceladosPorTransporte = 0;
        let hasViajesExpirados = false; // 🆕 Para detectar si tiene viajes expirados
        let transportesUnicos: string[] = []; // 🔥 NUEVO: Para detectar múltiples transportes
        let viajesConEstadoOperativo: any[] = []; // 🔥 Declarar aquí para scope global
        
        // 🔥 CONSTRUIR scheduled_at a partir de fecha y hora local
        const scheduledAtFinal = d.scheduled_local_date 
          ? `${d.scheduled_local_date}T${d.scheduled_local_time || '00:00:00'}`
          : null;
        
        const { data: viajesData, error: viajesError } = await supabase
          .from('viajes_despacho')
          .select('id, estado, estado_carga, id_transporte, chofer_id, camion_id')
          .eq('despacho_id', d.id);
        
        if (!viajesError && viajesData) {
          viajesGenerados = viajesData.length;
          
          // 🔥 DEBUG: Mostrar estados de todos los viajes
          
          // 🔥 MOSTRAR TODOS LOS ESTADOS ÚNICOS ENCONTRADOS
          const estadosUnicos = [...new Set(viajesData.map(v => v.estado))];
          
          // 🔥 NUEVO: Contar solo viajes con id_transporte (sin importar el estado por ahora)
          const viajesConTransporte = viajesData.filter(v => v.id_transporte).length;
          
          // 🔥 NUEVO: Contar solo viajes con estado asignado o estados superiores
          // IMPORTANTE: Incluir TODOS los estados desde transporte_asignado en adelante
          // Estados según lib/estados/config.ts (17 estados válidos + cancelado)
          viajesAsignados = viajesData.filter(v => 
            v.estado !== 'pendiente' && v.estado !== 'cancelado'
          ).length;
          
          
          // Viajes sin asignar: pendientes + cancelados por transporte (que necesitan reasignación)
          viajesSinAsignar = viajesData.filter(v => 
            v.estado === 'pendiente' || v.estado === 'cancelado_por_transporte'
          ).length;
          viajesCanceladosPorTransporte = viajesData.filter(v => 
            v.estado === 'cancelado_por_transporte'
          ).length;
          
          // 🆕 Detectar si hay viajes expirados
          hasViajesExpirados = viajesData.some(v => v.estado_carga === 'expirado');
          
          // 🔥 NUEVO: Calcular estado operativo de cada viaje para categorización correcta
          const esRedNodexia = d.origen_asignacion === 'red_nodexia';
          viajesConEstadoOperativo = viajesData.map(v => {
            // Red Nodexia: Si el viaje aún no está en movimiento físico (Fases 2-6),
            // los chofer_id/camion_id son datos stale → forzar como pendiente sin recursos.
            // 🔥 FIX: Solo considerar "en Red pendiente" si NO tiene chofer asignado.
            // Después de aceptar oferta + asignar unidad, chofer_id existe → no nullificar.
            const enRedPendiente = esRedNodexia && !v.chofer_id && !estaEnMovimiento(v.estado) && !esFinal(v.estado);
            const estadoOp = calcularEstadoOperativo({
              estado_carga: enRedPendiente ? 'pendiente' : (v.estado || 'pendiente'),
              estado_unidad: v.estado,
              chofer_id: enRedPendiente ? null : v.chofer_id,
              camion_id: enRedPendiente ? null : v.camion_id,
              scheduled_local_date: d.scheduled_local_date,
              scheduled_local_time: d.scheduled_local_time,
              scheduled_at: scheduledAtFinal
            });
            return { ...v, estado_operativo: estadoOp };
          });
          
          // Detectar si TODOS los viajes están realmente expirados (sin recursos)
          hasViajesExpirados = viajesConEstadoOperativo.some(v => 
            v.estado_operativo.estadoOperativo === 'expirado'
          );
          
          
          // 🔥 NUEVO: Obtener transportes únicos de los viajes
          transportesUnicos = [...new Set(
            viajesData
              .filter(v => v.id_transporte) // Solo viajes con transporte asignado
              .map(v => v.id_transporte)
          )];
          
        }
        
        // Si hay transport_id, buscar información del transporte por separado
        let transporteAsignado: { nombre: string; contacto?: any; cuit?: string; tipo?: string; esMultiple?: boolean; } | undefined = undefined;
        
        // 🔥 NUEVO: Si hay múltiples transportes únicos, mostrar "Varios"
        if (transportesUnicos.length > 1) {
          transporteAsignado = {
            nombre: 'Múltiples',
            cuit: `${transportesUnicos.length} transportes`,
            tipo: 'multiple',
            contacto: 'Ver viajes expandidos',
            esMultiple: true
          };
        } else if (transportesUnicos.length === 1 || d.transport_id) {
          // Si solo hay un transporte en los viajes O hay transport_id en el despacho
          const transportId = transportesUnicos[0] || d.transport_id;
          try {
            
            // Query más simple sin filtros adicionales
            const { data: transporteList, error: transporteError } = await supabase
              .from('empresas')
              .select('nombre, cuit, telefono, tipo_empresa')
              .eq('id', transportId);
            
            
            if (transporteError) {
            } else if (transporteList && transporteList.length > 0 && transporteList[0]) {
              const transporteData = transporteList[0];
              transporteAsignado = {
                nombre: transporteData.nombre || 'Transporte sin nombre',
                cuit: transporteData.cuit || '',
                tipo: transporteData.tipo_empresa || 'transporte',
                contacto: transporteData.telefono || transporteData.cuit || 'Sin contacto',
                esMultiple: false
              };
            } else {
              // Asignar nombre por defecto basado en el ID para debugging
              transporteAsignado = {
                nombre: 'Transporte Asignado',
                cuit: transportId.substring(0, 8),
                tipo: 'transporte',
                contacto: 'Ver detalles',
                esMultiple: false
              };
            }
          } catch (error) {
            console.error(`❌ Error consultando transporte para ${d.pedido_id}:`, error);
          }
        }
        
        // 🔥 Calcular estado operativo del despacho basado en los viajes
        let estadoOperativoDespacho: 'activo' | 'demorado' | 'expirado' = 'activo';
        let tieneViajesDemorados = false;
        let tieneViajesExpirados = false;
        
        if (viajesConEstadoOperativo && viajesConEstadoOperativo.length > 0) {
          tieneViajesDemorados = viajesConEstadoOperativo.some(v => v.estado_operativo.estadoOperativo === 'demorado');
          tieneViajesExpirados = viajesConEstadoOperativo.some(v => v.estado_operativo.estadoOperativo === 'expirado');
          
          // Prioridad: expirado > demorado > activo
          if (tieneViajesExpirados) {
            estadoOperativoDespacho = 'expirado';
          } else if (tieneViajesDemorados) {
            estadoOperativoDespacho = 'demorado';
          }
        }

        return {
          id: d.id,
          pedido_id: d.pedido_id,
          origen: d.origen,
          destino: d.destino,
          estado: hasViajesExpirados ? 'expirado' : d.estado, // 🆕 Campo BD (legacy)
          estado_operativo: estadoOperativoDespacho, // 🔥 Estado operativo calculado
          tiene_viajes_demorados: tieneViajesDemorados, // 🔥 Flag para filtrado
          tiene_viajes_expirados: tieneViajesExpirados, // 🔥 Flag para filtrado
          fecha_despacho: d.scheduled_local_date || 'Sin fecha',
          hora_despacho: d.scheduled_local_time || '', // 🔥 NUEVO: hora
          scheduled_at: scheduledAtFinal, // 🔥 NUEVO: timestamp combinado para cálculo de estado operativo
          tipo_carga: d.type || 'N/A',
          prioridad: (['Baja', 'Media', 'Alta', 'Urgente'].includes(d.prioridad)) ? d.prioridad : 'Media',
          unidad_type: d.unidad_type || 'N/A',
          observaciones: d.comentarios || '',
          cantidad_viajes_solicitados: d.cantidad_viajes_solicitados,
          viajes_generados: viajesGenerados, // 🔥 Total de viajes creados
          viajes_asignados: viajesAsignados, // 🔥 NUEVO: Solo viajes con transporte asignado
          viajes_sin_asignar: viajesSinAsignar, // 🔥 NUEVO
          viajes_cancelados_por_transporte: viajesCanceladosPorTransporte, // 🔥 NUEVO
          origen_asignacion: d.origen_asignacion, // 🌐 RED NODEXIA
          transporte_data: transporteAsignado,
        };
      }));
      
      // NO filtrar aquí - guardar TODOS los despachos
      // El filtrado se hará en el render según el tab activo
      setGeneratedDispatches(mappedData);
      
    } catch (error) {
      console.error('💥 Error en fetchGeneratedDispatches:', error);
    } finally {
      setLoadingGenerated(false);
    }
  }, []); // Sin dependencias para evitar problemas de actualización

  const cargarEmpresasAsociadas = async () => {
    try {
      setLoadingOptions(true);
      if (!user?.id) return;

      // Obtener las empresas asociadas al usuario actual con rol y permisos
      const { data: userEmpresasData } = await supabase
        .from('usuarios_empresa')
        .select(`
          empresa_id,
          rol_empresa_id,
          empresas(id, nombre, tipo_empresa, configuracion_empresa),
          roles_empresa(id, nombre, permisos)
        `)
        .eq('user_id', user.id)
        .eq('activo', true);

      if (!userEmpresasData || userEmpresasData.length === 0) {
        setLoadingOptions(false);
        return;
      }

      // Guardar en el estado para usar en Red Nodexia
      setUserEmpresas(userEmpresasData);

      const userEmpresas = userEmpresasData;

      const empresaIds = userEmpresas.map(rel => rel.empresa_id);
      const tiposEmpresa = userEmpresas.map(rel => (rel.empresas as any)?.tipo_empresa);
      const roles = userEmpresas.map(rel => (rel.roles_empresa as any)?.nombre);
      
      // Determinar si es coordinador por tipo de empresa o rol
      const esCoordinador = tiposEmpresa.includes('coordinador') || 
                           roles.some(rol => rol?.toLowerCase().includes('coordinador'));
      

      let plantasFiltradas: any[] = [];
      let clientesFiltrados: any[] = [];

      if (esCoordinador) {
        // COORDINADORES: Lógica específica según el flujo de negocio
        
        // ORIGEN: Planta propia + plantas adicionales de la suscripción
        // Por ahora, la planta propia (donde trabaja el coordinador)
        const plantaPropia = userEmpresas.filter((rel: any) => 
          rel.empresas?.configuracion_empresa?.tipo_instalacion === 'planta'
        ).map((rel: any) => rel.empresas);
        
        // Agregar plantas adicionales de la suscripción (futuro)
        plantasFiltradas = plantaPropia || [];
        
        // DESTINO: Clientes vinculados + todos los clientes disponibles
        // Para coordinadores, mostrar todos los clientes del sistema (pueden expandir su red)
        const { data: todosClientes } = await supabase
          .from('empresas')
          .select('id, nombre, cuit, configuracion_empresa')
          .eq('configuracion_empresa->>tipo_instalacion', 'cliente');
        
        clientesFiltrados = todosClientes || [];
        
        // TODO: En el futuro, implementar lógica de clientes vinculados específicamente
        // basado en contratos o relaciones comerciales configuradas
        
        
      } else {
        // TRANSPORTISTAS: Solo empresas asociadas via relaciones_empresas
        
        const { data: plantasData } = await supabase
          .from('relaciones_empresas')
          .select(`
            empresa_cliente:empresas!relaciones_empresas_empresa_cliente_id_fkey(
              id, nombre, cuit, configuracion_empresa
            )
          `)
          .eq('estado', 'activa')
          .in('empresa_transporte_id', empresaIds);

        // Filtrar plantas y clientes
        plantasFiltradas = plantasData?.filter((rel: any) => 
          rel.empresa_cliente?.configuracion_empresa?.tipo_instalacion === 'planta'
        ).map((rel: any) => rel.empresa_cliente) || [];
        
        clientesFiltrados = plantasData?.filter((rel: any) => 
          rel.empresa_cliente?.configuracion_empresa?.tipo_instalacion === 'cliente'
        ).map((rel: any) => rel.empresa_cliente) || [];
      }
      
      setPlantas(plantasFiltradas);
      setClientes(clientesFiltrados);

      // Cargar transportes
      let transportesFiltrados: any[] = [];
      
      if (esCoordinador) {
        // COORDINADORES: Transportes vinculados + opción red Nodexia
        
        // 1. Transportes vinculados directamente a la planta
        const { data: transportesVinculados } = await supabase
          .from('relaciones_empresas')
          .select(`
            empresa_transporte:empresas!relaciones_empresas_empresa_transporte_id_fkey(
              id, nombre, cuit, tipo_empresa
            )
          `)
          .eq('estado', 'activa')
          .in('empresa_cliente_id', empresaIds);
        
        const transportesDirectos = transportesVinculados?.filter((rel: any) => 
          rel.empresa_transporte?.tipo_empresa === 'transporte'
        ).map((rel: any) => ({
          ...rel.empresa_transporte,
          categoria: 'vinculado' // Marcar como vinculados
        })) || [];
        
        // 2. Toda la red de transportes Nodexia (para opción futura)
        const { data: redCompleta } = await supabase
          .from('empresas')
          .select('id, nombre, cuit, tipo_empresa')
          .eq('tipo_empresa', 'transporte');
        
        const transportesRed = redCompleta?.filter(t => 
          !transportesDirectos.some(td => td.id === t.id)
        ).map(t => ({
          ...t,
          categoria: 'red_nodexia' // Marcar como red Nodexia
        })) || [];
        
        // Combinar: Primero vinculados, luego red
        transportesFiltrados = [...transportesDirectos, ...transportesRed];
        
        
      } else {
        // TRANSPORTISTAS: Solo transportes asociados via relaciones
        const { data: transportesData } = await supabase
          .from('relaciones_empresas')
          .select(`
            empresa_transporte:empresas!relaciones_empresas_empresa_transporte_id_fkey(
              id, nombre, cuit
            )
          `)
          .eq('estado', 'activa')
          .in('empresa_cliente_id', empresaIds);


        transportesFiltrados = transportesData?.filter((rel: any) =>
          rel.empresa_transporte?.tipo_empresa === 'transporte'
        ).map((rel: any) => rel.empresa_transporte) || [];
      }      setTransportes(transportesFiltrados);
      

    } catch (error) {
      console.error('Error cargando empresas asociadas:', error);
      setErrorMsg('Error cargando empresas asociadas');
    } finally {
      setLoadingOptions(false);
    }
  };

  // Función para generar código único de despacho
  const generateDespachoCode = async () => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const prefix = `DSP-${dateStr}`;
    
    // Buscar el último número del día
    const { data: lastDespacho } = await supabase
      .from('despachos')
      .select('pedido_id')
      .ilike('pedido_id', `${prefix}-%`)
      .order('created_at', { ascending: false })
      .limit(1);
    
    let nextNumber = 1;
    if (lastDespacho && lastDespacho.length > 0) {
      const lastCode = lastDespacho[0]?.pedido_id;
      const lastNumber = lastCode ? parseInt(lastCode.split('-')[2]) || 0 : 0;
      nextNumber = lastNumber + 1;
    }
    
    return `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
  };

  const handleRowChange = (tempId: number, field: keyof FormDispatchRow, value: string | number) => {
    setFormRows(formRows.map(row =>
      row.tempId === tempId 
        ? { 
            ...row, 
            [field]: field === 'prioridad' && typeof value === 'string' && !['Baja', 'Media', 'Alta', 'Urgente'].includes(value) 
              ? 'Media' 
              : value 
          }
        : row
    ));
  };

  // Función para iniciar asignación de transporte
  const handleAssignTransport = (dispatch: GeneratedDispatch) => {
    
    // Limpiar cualquier estado previo del modal
    setSelectedDispatchForAssign(null);
    setIsAssignModalOpen(false);
    
    // Pequeña pausa para asegurar que el modal se cierre completamente
    setTimeout(() => {
      setSelectedDispatchForAssign(dispatch);
      setIsAssignModalOpen(true);
    }, 100);
  };

  // Función para abrir modal de Red Nodexia
  const handleOpenRedNodexia = async (dispatch: GeneratedDispatch) => {
    
    try {
      // Cargar los viajes de este despacho
      
      const { data: viajes, error } = await supabase
        .from('viajes_despacho')
        .select('id, numero_viaje, estado, despacho_id')
        .eq('despacho_id', dispatch.id)
        .order('numero_viaje', { ascending: true });


      if (error) {
        console.error('❌ Error cargando viajes:', error);
        alert('Error al cargar los viajes. Intente nuevamente.');
        return;
      }

      if (!viajes || viajes.length === 0) {
        alert(`Este despacho no tiene viajes generados aún.\n\nDespacho ID: ${dispatch.id}\nPedido: ${dispatch.pedido_id}\n\nIntenta expandir el despacho primero para ver si existen viajes.`);
        return;
      }

      // Seleccionar el primer viaje pendiente o el primero disponible
      const primerViaje = viajes.find(v => !v.estado || v.estado === 'pendiente') || viajes[0];
      
      
      setSelectedDispatchForRed(dispatch);
      setSelectedViajeForRed(primerViaje);
      setIsRedNodexiaModalOpen(true);
    } catch (err) {
      console.error('❌ Error:', err);
      alert('Error al abrir Red Nodexia');
    }
  };

  // Función para cerrar modal de Red Nodexia
  const handleCloseRedNodexia = () => {
    setIsRedNodexiaModalOpen(false);
    setSelectedDispatchForRed(null);
    setSelectedViajeForRed(null);
  };

  // Función para abrir modal Ver Estado Red Nodexia
  const handleVerEstadoRed = async (viaje: any) => {
    
    // Buscar el viaje_red_id en la tabla viajes_red_nodexia
    try {
      const { data: viajeRed, error } = await supabase
        .from('viajes_red_nodexia')
        .select('id, estado_red, viaje_id')
        .eq('viaje_id', viaje.id)
        .single();

      if (error || !viajeRed) {
        console.error('❌ [crear-despacho] Error buscando viaje en red:', error);
        alert('No se encontró el viaje en la Red Nodexia');
        return;
      }


      setSelectedViajeRedId(viajeRed.id);
      setSelectedViajeNumero(viaje.numero_viaje?.toString() || 'N/A');
      setIsVerEstadoModalOpen(true);
    } catch (err) {
      console.error('❌ [crear-despacho] Error:', err);
      alert('Error al abrir estado de Red Nodexia');
    }
  };

  // Función para cerrar modal Ver Estado
  const handleCloseVerEstado = () => {
    setIsVerEstadoModalOpen(false);
    setSelectedViajeRedId('');
    setSelectedViajeNumero('');
  };

  // Función para aceptar oferta desde modal Ver Estado
  const handleAceptarOfertaDesdeModal = async (ofertaId: string, transporteId: string) => {
    try {
      
      if (!selectedViajeRedId) {
        console.error('❌ selectedViajeRedId está vacío!');
        alert('Error: No se pudo identificar el viaje en Red Nodexia');
        return;
      }

      console.log('🎯 [crear-despacho] Llamando API aceptar-oferta:', { ofertaId, transporteId, viajeRedId: selectedViajeRedId });

      // Llamar API server-side que usa service role (evita problemas de RLS)
      const response = await fetchWithAuth('/api/red-nodexia/aceptar-oferta', {
        method: 'POST',
        body: JSON.stringify({
          ofertaId,
          viajeRedId: selectedViajeRedId,
          transporteId
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al aceptar oferta');
      }

      console.log('✅ [crear-despacho] API aceptar-oferta OK:', result);

      const despachoId = result.despachoId;

      // Cerrar modal PRIMERO
      handleCloseVerEstado();
      
      // Mostrar éxito inmediato
      setSuccessMsg(`✅ ${result.transporteNombre} asignado correctamente desde Red Nodexia. Actualizando vista...`);
      
      // Esperar a que Supabase propague los cambios
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Recargar despachos
      if (user?.id) {
        await fetchGeneratedDispatches(user.id);
        
        // Cambiar tab a "asignados"
        const despachoActualizado = generatedDispatches.find(d => d.id === despachoId);
        if (despachoActualizado) {
          const cantidadTotal = despachoActualizado.cantidad_viajes_solicitados || 1;
          const cantidadAsignados = despachoActualizado.viajes_asignados || 0;
          if (cantidadAsignados >= cantidadTotal) {
            setActiveTab('asignados');
          } else {
            setActiveTab('en_proceso');
          }
        }
        
        // Si el despacho estaba expandido, limpiar cache para forzar recarga
        if (despachoId && expandedDespachos.has(despachoId)) {
          setViajesDespacho(prev => {
            const newCache = { ...prev };
            delete newCache[despachoId];
            return newCache;
          });
          await handleToggleExpandDespacho(despachoId);
          await handleToggleExpandDespacho(despachoId);
        }
      }
      
      // Actualizar mensaje final
      setSuccessMsg('✅ Transporte asignado correctamente. El despacho ahora muestra el transporte de Red Nodexia 🌐');
      setTimeout(() => setSuccessMsg(''), 8000);

    } catch (err: any) {
      console.error('❌ Error al aceptar oferta:', err);
      setErrorMsg('Error al aceptar oferta. Intente nuevamente.');
      setTimeout(() => setErrorMsg(''), 5000);
    }
  };

  // Función para manejar el éxito de la asignación
  const handleAssignSuccess = async () => {
    
    // GUARDAR referencia ANTES de limpiar el estado
    const despachoAsignado = selectedDispatchForAssign?.pedido_id;
    const despachoId = selectedDispatchForAssign?.id;
    
    
    try {
      // 1. Cerrar modal inmediatamente para mejor UX
      setIsAssignModalOpen(false);
      
      // 2. Mostrar mensaje de éxito inmediato
      setSuccessMsg(`✅ Transporte asignado exitosamente al despacho ${despachoAsignado}`);
      
      // 3. 🔥 LIMPIAR CACHE DE VIAJES para forzar recarga cuando se expanda de nuevo
      if (despachoId) {
        setViajesDespacho(prev => {
          const newCache = { ...prev };
          delete newCache[despachoId];
          return newCache;
        });
      }
      
      // 4. Pausa para que la BD termine de procesar el update (importante para consistencia)
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // 5. Recarga completa desde BD para obtener datos actualizados
      if (user?.id) {
        await fetchGeneratedDispatches(user.id);
        
        // 🔥 Si el despacho estaba expandido, recargar sus viajes inmediatamente
        if (despachoId && expandedDespachos.has(despachoId)) {
          try {
            const { data: viajes, error } = await supabase
              .from('viajes_despacho')
              .select(`
                id,
                numero_viaje,
                estado,
                id_transporte,
                camion_id,
                chofer_id,
                observaciones,
                created_at,
                camiones (
                  patente,
                  marca,
                  modelo
                ),
                choferes (
                  nombre,
                  apellido,
                  dni
                ),
                estado_carga_viaje (
                  estado_carga,
                  fecha_planificacion,
                  fecha_documentacion_preparada,
                  fecha_cargando,
                  fecha_carga_completada,
                  peso_real_kg,
                  cantidad_bultos
                )
              `)
              .eq('despacho_id', despachoId)
              .order('numero_viaje', { ascending: true });

            if (!error && viajes) {
              // Obtener información de transportes
              const transporteIds = viajes
                .filter(v => v.id_transporte)
                .map(v => v.id_transporte)
                .filter((id, index, self) => self.indexOf(id) === index);

              let transportesData: Record<string, any> = {};
              
              if (transporteIds.length > 0) {
                const { data: transportes } = await supabase
                  .from('empresas')
                  .select('id, nombre, cuit')
                  .in('id', transporteIds);

                if (transportes) {
                  transportesData = transportes.reduce((acc, t) => {
                    acc[t.id] = t;
                    return acc;
                  }, {} as Record<string, any>);
                }
              }

              // Actualizar cache con nuevos viajes
              const viajesConTransporte = viajes.map(v => {
                
                return {
                  ...v,
                  transporte: v.id_transporte ? transportesData[v.id_transporte] : null,
                  camion: v.camiones || null, // 🔥 NUEVO: datos de camión
                  chofer: v.choferes || null,  // 🔥 NUEVO: datos de chofer
                  estado_carga_viaje: v.estado_carga_viaje || null // 🔥 NUEVO: Estado dual de carga
                };
              });

              setViajesDespacho(prev => ({
                ...prev,
                [despachoId]: viajesConTransporte
              }));

            }
          } catch (error) {
            console.error('⚠️ Error recargando viajes:', error);
          }
        }
      }
      
      
    } catch (error) {
      console.error('❌ Error en handleAssignSuccess:', error);
      setErrorMsg('Error al actualizar la lista de despachos');
    } finally {
      // 6. Limpiar estado del modal SIEMPRE al final
      setSelectedDispatchForAssign(null);
    }
  };

  // Función para cerrar el modal
  const handleCloseAssignModal = () => {
    setIsAssignModalOpen(false);
    setSelectedDispatchForAssign(null);
  };

  // Función para abrir modal de cancelación
  const handleOpenCancelarModal = (dispatch: GeneratedDispatch) => {
    setSelectedDispatchForCancel(dispatch);
    setMotivoCancelacion('');
    setIsCancelarModalOpen(true);
  };

  // Función para confirmar cancelación con motivo
  const handleConfirmarCancelacion = async () => {
    if (!selectedDispatchForCancel) return;

    if (!motivoCancelacion.trim()) {
      setErrorMsg('Debe ingresar un motivo para la cancelación');
      return;
    }

    try {
      setDeletingDespachos(true);

      // 1️⃣ GUARDAR EN TABLA DE AUDITORÍA antes de eliminar
      const { data: viajesData } = await supabase
        .from('viajes_despacho')
        .select('chofer_id, camion_id, acoplado_id, cantidad_reprogramaciones')
        .eq('despacho_id', selectedDispatchForCancel.id);

      const tieneChofer = viajesData?.some(v => v.chofer_id) || false;
      const tieneCamion = viajesData?.some(v => v.camion_id) || false;
      const tieneAcoplado = viajesData?.some(v => v.acoplado_id) || false;
      const cantidadReprog = viajesData?.[0]?.cantidad_reprogramaciones || 0;

      const { error: auditError } = await supabase
        .from('cancelaciones_despachos')
        .insert({
          despacho_id: selectedDispatchForCancel.id,
          empresa_id: empresaPlanta?.empresa_id,
          cancelado_por_user_id: user.id,
          pedido_id: selectedDispatchForCancel.pedido_id,
          origen_nombre: selectedDispatchForCancel.origen,
          destino_nombre: selectedDispatchForCancel.destino,
          scheduled_date: selectedDispatchForCancel.fecha_despacho,
          scheduled_time: selectedDispatchForCancel.hora_despacho,
          estado_al_cancelar: selectedDispatchForCancel.estado,
          motivo_cancelacion: motivoCancelacion.trim(),
          tenia_chofer_asignado: tieneChofer,
          tenia_camion_asignado: tieneCamion,
          tenia_acoplado_asignado: tieneAcoplado,
          fue_reprogramado_previamente: cantidadReprog > 0,
          cantidad_reprogramaciones_previas: cantidadReprog
        });

      if (auditError) {
        console.error('⚠️ Error guardando auditoría:', auditError);
        // Continuar con la cancelación aunque falle la auditoría
      }

      // 2️⃣ ELIMINAR EL DESPACHO
      const { error } = await supabase
        .from('despachos')
        .delete()
        .eq('id', selectedDispatchForCancel.id);

      if (error) throw error;

      setSuccessMsg(`✅ Despacho ${selectedDispatchForCancel.pedido_id} cancelado. Motivo registrado: "${motivoCancelacion}"`);
      
      // Cerrar modal
      setIsCancelarModalOpen(false);
      setSelectedDispatchForCancel(null);
      setMotivoCancelacion('');
      
      // Recargar lista
      if (user?.id) {
        await fetchGeneratedDispatches(user.id);
      }
    } catch (error: any) {
      console.error('Error cancelando despacho:', error);
      setErrorMsg('Error al cancelar despacho. Intente nuevamente.');
    } finally {
      setDeletingDespachos(false);
    }
  };

  // Funciones para selección múltiple
  const handleSelectDespacho = (despachoId: string) => {
    const newSelected = new Set(selectedDespachos);
    if (newSelected.has(despachoId)) {
      newSelected.delete(despachoId);
    } else {
      newSelected.add(despachoId);
    }
    setSelectedDespachos(newSelected);
    setSelectAll(newSelected.size === generatedDispatches.length && generatedDispatches.length > 0);
  };

  // 🔥 NUEVO: Toggle expandir viajes de un despacho
  const handleToggleExpandDespacho = async (despachoId: string) => {
    
    const newExpanded = new Set(expandedDespachos);
    
    if (newExpanded.has(despachoId)) {
      // Contraer
      newExpanded.delete(despachoId);
      setExpandedDespachos(newExpanded);
    } else {
      // Expandir y SIEMPRE cargar viajes (sin cache para evitar datos desactualizados)
      newExpanded.add(despachoId);
      setExpandedDespachos(newExpanded);
      
      // 🔥 SIEMPRE recargar viajes para obtener datos actualizados
        try {
          // Primero obtener el origen_asignacion del despacho padre
          const { data: despachoData, error: despachoError } = await supabase
            .from('despachos')
            .select('origen_asignacion')
            .eq('id', despachoId)
            .single();
          
          if (despachoError) {
            console.error('❌ Error obteniendo despacho:', despachoError);
          }
          
          const origenAsignacion = despachoData?.origen_asignacion;
          
          const { data: viajes, error } = await supabase
            .from('viajes_despacho')
            .select('*')
            .eq('despacho_id', despachoId)
            .order('numero_viaje', { ascending: true });


          if (error) {
            console.error('Error cargando viajes:', error);
            setViajesDespacho(prev => ({ ...prev, [despachoId]: [] }));
            return;
          }

          if (!viajes || viajes.length === 0) {
            setViajesDespacho(prev => ({ ...prev, [despachoId]: [] }));
            return;
          }

          // 🔥 Verificar cuáles viajes están en Red Nodexia y su estado
          const viajesIds = viajes.map(v => v.id);
          
          const { data: viajesEnRed, error: redError } = await supabase
            .from('viajes_red_nodexia')
            .select('viaje_id, estado_red')
            .in('viaje_id', viajesIds);
          
          if (redError) {
            console.error('❌ [crear-despacho] Error consultando viajes_red_nodexia:', redError);
          } else {
          }
          
          // Crear mapa de viajes en red con su estado
          const viajesEnRedMap = new Map(
            viajesEnRed?.map(v => [v.viaje_id, v.estado_red]) || []
          );
          
          // Agregar flags en_red_nodexia y estado_red a cada viaje
          viajes.forEach(viaje => {
            const estadoRed = viajesEnRedMap.get(viaje.id);
            (viaje as any).en_red_nodexia = !!estadoRed || origenAsignacion === 'red_nodexia';
            (viaje as any).estado_red = estadoRed || (origenAsignacion === 'red_nodexia' ? 'asignado' : null);
            (viaje as any).origen_asignacion = origenAsignacion; // Agregar origen del despacho padre
            
          });

          // Obtener IDs únicos de transportes, choferes y camiones
          const transporteIds = viajes
            ?.filter(v => v.id_transporte || v.id_transporte_cancelado)
            .map(v => v.id_transporte || v.id_transporte_cancelado)
            .filter((id, index, self) => id && self.indexOf(id) === index) || [];

          const choferIds = viajes
            ?.filter(v => v.chofer_id)
            .map(v => v.chofer_id)
            .filter((id, index, self) => id && self.indexOf(id) === index) || [];

          const camionIds = viajes
            ?.filter(v => v.camion_id)
            .map(v => v.camion_id)
            .filter((id, index, self) => id && self.indexOf(id) === index) || [];

          const acopladoIds = viajes
            ?.filter(v => v.acoplado_id)
            .map(v => v.acoplado_id)
            .filter((id, index, self) => id && self.indexOf(id) === index) || [];

          // Cargar datos en paralelo
          const [transportesResult, choferesResult, camionesResult, acopladosResult] = await Promise.all([
            transporteIds.length > 0
              ? supabase.from('empresas').select('id, nombre, cuit').in('id', transporteIds)
              : Promise.resolve({ data: [], error: null }),
            choferIds.length > 0
              ? supabase.from('choferes').select('id, nombre, apellido, telefono, dni').in('id', choferIds)
              : Promise.resolve({ data: [], error: null }),
            camionIds.length > 0
              ? supabase.from('camiones').select('id, patente, marca, modelo, anio').in('id', camionIds)
              : Promise.resolve({ data: [], error: null }),
            acopladoIds.length > 0
              ? supabase.from('acoplados').select('id, patente, marca, modelo, anio').in('id', acopladoIds)
              : Promise.resolve({ data: [], error: null })
          ]);

          // Crear mapas para acceso rápido
          const transportesData: Record<string, any> = {};
          const choferesData: Record<string, any> = {};
          const camionesData: Record<string, any> = {};
          const acopladosData: Record<string, any> = {};


          transportesResult.data?.forEach(t => { transportesData[t.id] = t; });
          choferesResult.data?.forEach(c => { choferesData[c.id] = c; });
          camionesResult.data?.forEach(c => { camionesData[c.id] = c; });
          acopladosResult.data?.forEach(a => { acopladosData[a.id] = a; });


          // Agregar info completa a cada viaje
          const viajesConDatos = viajes?.map(v => {
            
            return {
              ...v,
              transporte: v.id_transporte ? transportesData[v.id_transporte] : null,
              transporte_cancelado: v.id_transporte_cancelado ? transportesData[v.id_transporte_cancelado] : null,
              chofer: v.chofer_id ? choferesData[v.chofer_id] : null,
              camion: v.camion_id ? camionesData[v.camion_id] : null,
              acoplado: v.acoplado_id ? acopladosData[v.acoplado_id] : null,
            };
          }) || [];


          setViajesDespacho(prev => {
            const newState = {
              ...prev,
              [despachoId]: viajesConDatos
            };
            return newState;
          });
        } catch (error) {
          console.error('💥 Error cargando viajes:', error);
        }
    }
  };

  // 🔥 NUEVO: Cancelar viaje por coordinador de planta
  const handleCancelarViajeCoordinador = async (viajeId: string, despachoId: string, motivo: string) => {
    try {

      // Obtener datos del usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      
      // Obtener datos del viaje actual
      const { data: viajeActual, error: viajeError } = await supabase
        .from('viajes_despacho')
        .select('*, despachos(pedido_id)')
        .eq('id', viajeId)
        .single();

      if (viajeError) throw viajeError;

      // Validar si se puede cancelar
      const horasHastaViaje = viajeActual.despachos?.scheduled_local_date 
        ? (new Date(viajeActual.despachos.scheduled_local_date).getTime() - Date.now()) / (1000 * 60 * 60)
        : 999;

      if (['en_transito_origen', 'en_transito_destino'].includes(viajeActual.estado)) {
        throw new Error('No se puede cancelar un viaje en tránsito');
      }

      if (viajeActual.estado === 'completado') {
        throw new Error('No se puede cancelar un viaje ya completado');
      }

      let advertencia = '';
      if (viajeActual.estado === 'camion_asignado' && horasHastaViaje < 24) {
        advertencia = ' ⚠️ CANCELACIÓN TARDÍA';
      }

      // Actualizar viaje a estado 'cancelado' (definitivo)
      const { error } = await supabase
        .from('viajes_despacho')
        .update({ 
          estado: 'cancelado',
          id_transporte: null,
          chofer_id: null,
          camion_id: null,
          fecha_cancelacion: new Date().toISOString(),
          cancelado_por: user?.id,
          motivo_cancelacion: motivo,
          observaciones: `CANCELADO POR COORDINADOR: ${motivo}${advertencia} (${new Date().toLocaleString('es-AR')})`
        })
        .eq('id', viajeId);

      if (error) throw error;


      // Limpiar cache de viajes del despacho para forzar recarga
      setViajesDespacho(prev => {
        const newCache = { ...prev };
        delete newCache[despachoId];
        return newCache;
      });

      // Recargar lista de despachos
      if (user?.id) {
        await fetchGeneratedDispatches(user.id);
      }

      // Si el despacho estaba expandido, recargar sus viajes
      if (expandedDespachos.has(despachoId)) {
        const newExpanded = new Set(expandedDespachos);
        newExpanded.delete(despachoId);
        setExpandedDespachos(newExpanded);
        // Volver a expandir para recargar
        setTimeout(() => {
          handleToggleExpandDespacho(despachoId);
        }, 500);
      }

      setSuccessMsg(`✅ Viaje cancelado exitosamente`);

    } catch (err: any) {
      console.error('Error cancelando viaje:', err);
      setErrorMsg('Error al cancelar el viaje. Intente nuevamente.');
    }
  };

  // 🔥 NUEVO: Reasignar viaje cancelado por transporte
  const handleReasignarViaje = async (despacho: any, viaje: any) => {
    try {
      
      // Verificar que el viaje esté en estado cancelado_por_transporte
      if (viaje.estado !== 'cancelado_por_transporte') {
        throw new Error('Solo se pueden reasignar viajes cancelados por el transporte');
      }

      // Abrir modal de asignación con el despacho correspondiente
      // El modal manejará la reasignación del viaje específico
      handleAssignTransport(despacho);

      setSuccessMsg(`💡 Reasignando viaje cancelado por ${viaje.transporte_cancelado?.nombre || 'transporte'}. Seleccione el nuevo transporte.`);

    } catch (err: any) {
      console.error('Error preparando reasignación:', err);
      setErrorMsg('Error al preparar la reasignación. Intente nuevamente.');
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedDespachos(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(generatedDispatches.map(d => d.id));
      setSelectedDespachos(allIds);
      setSelectAll(true);
    }
  };

  const handleDeleteSelected = () => {

    if (selectedDespachos.size === 0) {
      return;
    }

    // Guardar los IDs a eliminar y mostrar modal
    setDespachosPendingDelete(new Set(selectedDespachos));
    setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
    setDeletingDespachos(true);
    setErrorMsg('');

    const idsToDelete = Array.from(despachosPendingDelete);
    const countToDelete = despachosPendingDelete.size;

    try {

      const { data, error } = await supabase
        .from('despachos')
        .delete()
        .in('id', idsToDelete)
        .select();


      if (error) {
        console.error('❌ Error eliminando despachos:', error);
        throw error;
      }


      // Contar cuántos se eliminaron realmente
      const deletedCount = data?.length || countToDelete;

      // Limpiar selecciones ANTES de actualizar la lista
      setSelectedDespachos(new Set());
      setSelectAll(false);

      // Recargar INMEDIATAMENTE desde la base de datos
      if (user?.id) {
        try {
          await fetchGeneratedDispatches(user.id);
        } catch (fetchError) {
          console.error('❌ Error en recarga:', fetchError);
          // Continuar aunque falle la recarga
        }
      }

      // Pequeña pausa para asegurar que React procese todos los updates
      await new Promise(resolve => setTimeout(resolve, 100));

      // Forzar re-render para asegurar que React detecte cambios
      setForceRefresh(prev => prev + 1);

      setSuccessMsg(`✅ ${deletedCount} despacho(s) eliminado(s) exitosamente`);
      

    } catch (error: any) {
      console.error('💥 Error eliminando despachos:', error);
      console.error('💥 Error details:', JSON.stringify(error, null, 2));
      setErrorMsg('Error al eliminar despachos. Intente nuevamente.');
    } finally {
      setDeletingDespachos(false); // Terminar loading SIEMPRE
    }
  };

  const handleSaveRow = async (rowToSave: FormDispatchRow, _originalIndex: number) => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (!user) {
      setErrorMsg('Usuario no autenticado.');
      setLoading(false);
      return;
    }
    
    // Debug: ver qué datos tenemos
    
    if (!rowToSave.origen || !rowToSave.destino || !rowToSave.fecha_despacho || !rowToSave.hora_despacho) {
      const camposFaltantes = [];
      if (!rowToSave.origen) camposFaltantes.push('Origen');
      if (!rowToSave.destino) camposFaltantes.push('Destino');
      if (!rowToSave.fecha_despacho) camposFaltantes.push('Fecha');
      if (!rowToSave.hora_despacho) camposFaltantes.push('Hora');
      
      setErrorMsg(`Por favor, completa los campos obligatorios: ${camposFaltantes.join(', ')}.`);
      setLoading(false);
      return;
    }

    try {
      // Verificar y regenerar código si está vacío
      let finalPedidoId = rowToSave.pedido_id;
      if (!finalPedidoId || finalPedidoId.trim() === '') {
        finalPedidoId = await generateDespachoCode();
      }
      

      const despachoData = {
        pedido_id: finalPedidoId,
        origen: rowToSave.origen,
        origen_id: rowToSave.origen_id || null, // ID de ubicación origen
        destino: rowToSave.destino,
        destino_id: rowToSave.destino_id || null, // ID de ubicación destino
        estado: 'pendiente_transporte',
        scheduled_local_date: rowToSave.fecha_despacho,
        scheduled_local_time: `${rowToSave.hora_despacho}:00`,
        created_by: user.id,
        transport_id: null,
        driver_id: null,
        type: rowToSave.tipo_carga || 'despacho',
        comentarios: rowToSave.observaciones || '',
        prioridad: (['Baja', 'Media', 'Alta', 'Urgente'].includes(rowToSave.prioridad)) ? rowToSave.prioridad : 'Media', // Validación estricta
        unidad_type: rowToSave.unidad_type || 'semi',
        cantidad_viajes_solicitados: rowToSave.cantidad_viajes_solicitados || 1, // NUEVO
      };


      const { data, error } = await supabase
        .from('despachos')
        .insert([despachoData])
        .select(`
          id,
          pedido_id,
          origen,
          destino,
          estado,
          scheduled_local_date,
          scheduled_local_time,
          type,
          comentarios,
          prioridad,
          unidad_type,
          created_at
        `);

      if (error) {
        console.error('Error al guardar despacho:', error);
        setErrorMsg('Error al guardar despacho. Intente nuevamente.');
      } else {
        
        // 🔥 CREAR VIAJES AUTOMÁTICAMENTE basados en cantidad_viajes_solicitados
        const despachoCreado = data[0];
        
        if (!despachoCreado) {
          console.error('❌ Error: despachoCreado es undefined');
          setErrorMsg('Error al crear despacho');
          setLoading(false);
          return;
        }
        
        const cantidadViajes = rowToSave.cantidad_viajes_solicitados || 1;
        
        let viajesCreados = 0;
        if (cantidadViajes > 0) {
          
          // 🔥 Calcular scheduled_at si tenemos fecha y hora
          let scheduledAt = null;
          if (despachoCreado.scheduled_local_date && despachoCreado.scheduled_local_time) {
            const fechaHora = `${despachoCreado.scheduled_local_date}T${despachoCreado.scheduled_local_time}`;
            scheduledAt = new Date(fechaHora).toISOString();
          }
          
          const viajesData = [];
          for (let i = 0; i < cantidadViajes; i++) {
            viajesData.push({
              despacho_id: despachoCreado.id,
              numero_viaje: i + 1, // Simple integer: 1, 2, 3...
              estado: 'pendiente', // Legacy
              estado_carga: 'pendiente_asignacion', // 🔥 Sistema dual v2 - esperando asignación
              estado_unidad: null, // 🔥 NULL cuando no hay camión/chofer asignado
              scheduled_at: scheduledAt, // 🔥 Fecha/hora programada para expiración
              fecha_creacion: new Date().toISOString()
            });
          }
          
          
          const { data: viajesInsertados, error: viajesError } = await supabase
            .from('viajes_despacho')
            .insert(viajesData)
            .select('id, numero_viaje, despacho_id');
          
          if (viajesError) {
            console.error('❌ Error al crear viajes:', viajesError);
            setErrorMsg('Despacho creado pero hubo un error al generar viajes. Revise el despacho.');
          } else {
            viajesCreados = viajesInsertados?.length || 0;
          }
        }
        
        if (viajesCreados > 0) {
          setSuccessMsg(`Despacho "${despachoCreado?.pedido_id || finalPedidoId}" generado exitosamente con ${viajesCreados} viaje(s).`);
        } else {
          setSuccessMsg(`Despacho "${despachoCreado?.pedido_id || finalPedidoId}" generado (sin viajes creados - revisar consola).`);
        }
        
        await fetchGeneratedDispatches(user.id); 

        // Remover la fila guardada del formulario
        setFormRows(prevRows => prevRows.filter(row => row.tempId !== rowToSave.tempId));
        if (formRows.length === 1 && formRows[0]?.tempId === rowToSave.tempId) { 
          setFormRows([
            { 
              tempId: 1, 
              pedido_id: '',
              origen: '', 
              destino: '', 
              fecha_despacho: '', 
              hora_despacho: '',
              tipo_carga: '',
              prioridad: 'Media',
              cantidad_viajes_solicitados: 1, // NUEVO
              unidad_type: '',
              observaciones: '' 
            },
          ]);
        }
      }
    } catch (err: any) {
      console.error('Error inesperado en handleSaveRow:', err);
      setErrorMsg('Ocurrió un error inesperado. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Obtener fecha mínima (hoy)
  const today = new Date().toISOString().split('T')[0];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0e1a2d] text-slate-100">
        Cargando...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0e1a2d]">
      <Sidebar userEmail={user.email} userName={userName} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          userEmail={user.email} 
          userName={userName} 
          pageTitle="Crear Despachos"
          empresaNombre={empresaPlanta?.empresas?.nombre}
        />
        <main className="flex-1 p-2 max-w-full overflow-hidden">
          <h3 className="text-xl font-semibold mb-4 text-cyan-400">Crear nuevo despacho</h3>

          {errorMsg && <p className="text-red-400 mb-4">{errorMsg}</p>}
          {successMsg && <p className="text-green-400 mb-4">{successMsg}</p>}

          <DespachoForm
            formRows={formRows}
            onRowChange={handleRowChange}
            onSaveRow={handleSaveRow}
            onFormRowsChange={setFormRows}
            loading={loading}
            today={today}
          />

          <div className="flex justify-between items-center mt-8 mb-4">
            <h3 className="text-xl font-semibold text-cyan-400">Despachos Generados</h3>
            <div className="flex gap-2 items-center">
              {selectedDespachos.size > 0 && (
                <span className="text-sm text-cyan-400 mr-2">
                  {selectedDespachos.size} seleccionado(s)
                </span>
              )}
              {selectedDespachos.size > 0 && (
                <>
                  <button
                    onClick={handleDeleteSelected}
                    disabled={deletingDespachos}
                    className={`px-3 py-1 text-white text-sm rounded-md transition-colors ${
                      deletingDespachos 
                        ? 'bg-gray-500 cursor-not-allowed' 
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                    title="Eliminar despachos seleccionados"
                  >
                    {deletingDespachos ? '⏳ Eliminando...' : '🗑️ Eliminar'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Tabs para filtrar despachos */}
          <DespachoTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            dispatches={generatedDispatches}
          />
          
          {/* Wrapper con scroll horizontal para la tabla */}
          <div className="w-full overflow-x-auto">
            <div className="min-w-max bg-[#1b273b] p-3 rounded-lg shadow-lg" key={forceRefresh}>
              <table className="w-full table-auto divide-y divide-gray-700">
                <thead className="bg-[#0e1a2d]">
                  <tr>
                    <th className="px-2 py-2 text-center w-8">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500 focus:ring-2"
                      title="Seleccionar todos"
                    />
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-32">Pedido ID</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-20">Fecha</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-16">Hora</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-40">Origen</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-40">Destino</th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-20">Prioridad</th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-32">Transporte</th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-24">Estado</th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-32">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700 text-slate-200">
                {(() => {
                  // Filtrar despachos usando lógica centralizada de DespachoTabs
                  const filteredDispatches = filterDespachosByTab(generatedDispatches, activeTab);


                  if (filteredDispatches.length === 0) {
                    return (
                      <tr>
                        <td colSpan={9} className="px-2 py-6 text-center text-slate-400">
                          {loadingGenerated 
                            ? "Cargando despachos..." 
                            : activeTab === 'pendientes'
                              ? "No hay despachos pendientes de asignación"
                              : activeTab === 'en_proceso'
                                ? "No hay despachos en proceso"
                                : activeTab === 'demorados'
                                  ? "No hay viajes demorados (con recursos pero fuera de horario)"
                                  : activeTab === 'expirados'
                                    ? "No hay despachos expirados"
                                    : "No hay despachos con todos los viajes asignados"}
                        </td>
                      </tr>
                    )
                  }

                  return filteredDispatches.map(dispatch => (
                    <DespachoTableRow
                      key={dispatch.id}
                      dispatch={dispatch}
                      activeTab={activeTab}
                      isSelected={selectedDespachos.has(dispatch.id)}
                      isExpanded={expandedDespachos.has(dispatch.id)}
                      viajes={viajesDespacho[dispatch.id] || []}
                      onSelect={handleSelectDespacho}
                      onToggleExpand={handleToggleExpandDespacho}
                      onAssignTransport={handleAssignTransport}
                      onOpenRedNodexia={handleOpenRedNodexia}
                      onOpenCancelar={handleOpenCancelarModal}
                      onOpenTimeline={(despachoId, pedidoId) => {
                        setTimelineDespachoId(despachoId);
                        setTimelinePedidoId(pedidoId);
                        setIsTimelineModalOpen(true);
                      }}
                      onOpenReprogram={(d) => {
                        setSelectedDispatchForReprogram(d);
                        setIsReprogramarModalOpen(true);
                      }}
                      onVerEstadoRed={handleVerEstadoRed}
                      onReasignarViaje={handleReasignarViaje}
                      onCancelarViaje={handleCancelarViajeCoordinador}
                    />
                  ))
              })()}
              </tbody>
            </table>
            </div>
          </div>
        </main>
      </div>

      {/* Modal de Asignación de Transporte */}
      {selectedDispatchForAssign && (
        <AssignTransportModal
          isOpen={isAssignModalOpen}
          onClose={handleCloseAssignModal}
          dispatch={selectedDispatchForAssign}
          onAssignSuccess={handleAssignSuccess}
        />
      )}

      {/* Modal de Red Nodexia */}
      {selectedDispatchForRed && selectedViajeForRed && empresaPlanta && user && (
        <AbrirRedNodexiaModal
          isOpen={isRedNodexiaModalOpen}
          onClose={handleCloseRedNodexia}
          viajeId={selectedViajeForRed.id}
          numeroViaje={selectedViajeForRed.numero_viaje}
          origen={selectedDispatchForRed.origen}
          destino={selectedDispatchForRed.destino}
          empresaId={empresaPlanta.empresa_id}
          usuarioId={user.id}
        />
      )}

      {/* Modal Ver Estado Red Nodexia */}
      {isVerEstadoModalOpen && selectedViajeRedId && (
        <VerEstadoRedNodexiaModal
          viajeRedId={selectedViajeRedId}
          viajeNumero={selectedViajeNumero}
          onClose={handleCloseVerEstado}
          onAceptarOferta={handleAceptarOfertaDesdeModal}
        />
      )}

      {/* Modal de Confirmación de Eliminación */}
      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDespachosPendingDelete(new Set());
        }}
        onConfirm={executeDelete}
        message={`¿Estás seguro de que deseas eliminar ${despachosPendingDelete.size} despacho(s)?`}
        itemCount={despachosPendingDelete.size}
      />

      {/* Modal Reprogramar */}
      <ReprogramarModal
        isOpen={isReprogramarModalOpen}
        onClose={() => {
          setIsReprogramarModalOpen(false);
          setSelectedDispatchForReprogram(null);
        }}
        despacho={selectedDispatchForReprogram ? {
          id: selectedDispatchForReprogram.id,
          pedido_id: selectedDispatchForReprogram.pedido_id,
          origen: selectedDispatchForReprogram.origen,
          destino: selectedDispatchForReprogram.destino,
          fecha_despacho: selectedDispatchForReprogram.fecha_despacho,
          hora_despacho: selectedDispatchForReprogram.hora_despacho
        } : null}
        onSuccess={() => {
          fetchGeneratedDispatches(user.id, true);
        }}
      />

      {/* Modal Cancelar Despacho */}
      <CancelarDespachoModal
        isOpen={isCancelarModalOpen}
        dispatch={selectedDispatchForCancel}
        motivoCancelacion={motivoCancelacion}
        onMotivoCancelacionChange={setMotivoCancelacion}
        onConfirmar={handleConfirmarCancelacion}
        onClose={() => {
          setIsCancelarModalOpen(false);
          setSelectedDispatchForCancel(null);
          setMotivoCancelacion('');
        }}
        loading={deletingDespachos}
      />

      {/* Modal Timeline/Historial */}
      <TimelineDespachoModal
        isOpen={isTimelineModalOpen}
        onClose={() => setIsTimelineModalOpen(false)}
        despachoId={timelineDespachoId}
        pedidoId={timelinePedidoId}
      />
    </div>
  );
};

export default CrearDespacho;