import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import AssignTransportModal from '../components/Modals/AssignTransportModal';
import UbicacionAutocompleteInput from '../components/forms/UbicacionAutocompleteInput';
import type { UbicacionAutocomplete } from '../types/ubicaciones';

interface EmpresaOption {
  id: string;
  nombre: string;
  cuit: string;
  direccion?: string;
}

interface AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  options: EmpresaOption[];
  placeholder: string;
  className?: string;
  loading?: boolean;
}

const AutocompleteField: React.FC<AutocompleteProps> = ({ 
  value, 
  onChange, 
  options, 
  placeholder, 
  className = "",
  loading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [filteredOptions, setFilteredOptions] = useState<EmpresaOption[]>([]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = options.filter(option =>
        option.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        option.cuit.includes(searchTerm)
      );
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(options);
    }
  }, [searchTerm, options]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    onChange(val);
    setIsOpen(true);
  };

  const handleSelectOption = (option: EmpresaOption) => {
    setSearchTerm(option.nombre);
    onChange(option.nombre);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        placeholder={loading ? "Cargando..." : placeholder}
        disabled={loading}
        className={`bg-[#0e1a2d] border border-gray-600 rounded-md px-2 py-1 text-sm focus:ring-cyan-500 focus:border-cyan-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      />
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-[#1b273b] border border-gray-600 rounded-md shadow-lg max-h-40 overflow-y-auto">
          {filteredOptions.map(option => (
            <div
              key={option.id}
              onClick={() => handleSelectOption(option)}
              className="px-3 py-2 hover:bg-[#0e1a2d] cursor-pointer text-sm"
            >
              <div className="font-medium">{option.nombre}</div>
              <div className="text-xs text-gray-400">CUIT: {option.cuit}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface FormDispatchRow {
  tempId: number;
  pedido_id: string;
  origen: string;
  origen_id?: string; // ID de la ubicación seleccionada
  destino: string;
  destino_id?: string; // ID de la ubicación seleccionada
  fecha_despacho: string;
  hora_despacho: string;
  tipo_carga: string;
  prioridad: string;
  cantidad_viajes_solicitados: number; // NUEVO - Sistema múltiples camiones
  unidad_type: string;
  observaciones: string;
}

interface GeneratedDispatch {
  id: string;
  pedido_id: string;
  origen: string;
  destino: string;
  estado: string;
  fecha_despacho: string;
  tipo_carga: string;
  prioridad: string;
  unidad_type: string;
  observaciones: string;
  cantidad_viajes_solicitados?: number;
  viajes_generados?: number; // 🔥 NUEVO
  viajes_sin_asignar?: number; // 🔥 NUEVO
  transporte_data?: { 
    nombre: string;
    cuit?: string;
    tipo?: string;
    contacto?: any;
  } | undefined;
}

const CrearDespacho = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Estados para empresas disponibles
  const [plantas, setPlantas] = useState<EmpresaOption[]>([]);
  const [clientes, setClientes] = useState<EmpresaOption[]>([]);
  const [transportes, setTransportes] = useState<EmpresaOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

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

  // Estados para tabs de despachos
  const [activeTab, setActiveTab] = useState<'pendientes' | 'en_proceso' | 'asignados'>('pendientes');

  // Estados para selección múltiple de despachos
  const [selectedDespachos, setSelectedDespachos] = useState<Set<string>>(new Set());
  const [expandedDespachos, setExpandedDespachos] = useState<Set<string>>(new Set()); // 🔥 NUEVO: Control de filas expandidas
  const [viajesDespacho, setViajesDespacho] = useState<Record<string, any[]>>({}); // 🔥 NUEVO: Cache de viajes por despacho
  const [selectAll, setSelectAll] = useState(false);
  const [deletingDespachos, setDeletingDespachos] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(0); // Para forzar re-renders

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
      
      // Debug del usuario actual
      console.log('👤 Usuario autenticado:', {
        id: currentUserData.id,
        email: currentUserData.email,
        expected: '07df7dc0-f24f-4b39-9abf-82930154a94c'
      });

      console.log('🔍 USUARIO DEBUG COMPLETO:');
      console.log('   - ID:', currentUserData.id);
      console.log('   - ID length:', currentUserData.id.length);
      console.log('   - Expected:', '74d71b4a-81db-459d-93f6-b52e82c3e4bc');
      console.log('   - Match?:', currentUserData.id === '74d71b4a-81db-459d-93f6-b52e82c3e4bc');
      
      // Cargar despachos del usuario (primera carga con loading)
      fetchGeneratedDispatches(currentUserData.id, true);
    }
  };

  const fetchGeneratedDispatches = useCallback(async (userId: string, forceLoading = false) => {
    console.log('🔄 fetchGeneratedDispatches llamado con userId:', userId);
    
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
      console.log('🔍 Ejecutando query para usuario:', userId);
      
      // Primero, hacer query sin filtro de estado para ver todos los despachos del usuario
      const { data: allData, error: debugError } = await supabase
        .from('despachos')
        .select('id, pedido_id, estado, transport_id')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      console.log('🐛 DEBUG - Últimos 5 despachos del usuario:', allData);
      
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
          created_by
        `)
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      console.log('📊 Query response:', { data, error });

      if (error) {
        console.error('❌ Error al cargar despachos generados:', error.message);
        console.error('❌ Error completo:', error);
        throw error;
      }

      console.log('📦 Query ejecutado exitosamente');
      console.log('📦 Despachos encontrados:', data?.length || 0);
      
      // Mapear los datos y obtener información del transporte si existe
      const mappedData: GeneratedDispatch[] = await Promise.all((data || []).map(async (d) => {
        console.log(`🔍 Procesando despacho ${d.pedido_id}:`, {
          transport_id: d.transport_id,
          estado: d.estado
        });
        
        // 🔥 NUEVO: Obtener conteo de viajes desde viajes_despacho
        let viajesGenerados = 0;
        let viajesSinAsignar = 0;
        
        const { data: viajesData, error: viajesError } = await supabase
          .from('viajes_despacho')
          .select('id, estado')
          .eq('despacho_id', d.id);
        
        if (!viajesError && viajesData) {
          viajesGenerados = viajesData.length;
          viajesSinAsignar = viajesData.filter(v => v.estado !== 'transporte_asignado').length;
        }
        
        // Si hay transport_id, buscar información del transporte por separado
        let transporteAsignado: { nombre: string; contacto?: any; cuit?: string; tipo?: string; } | undefined = undefined;
        if (d.transport_id) {
          try {
            console.log(`🚛 Buscando transporte con ID: ${d.transport_id}`);
            
            // Query más simple sin filtros adicionales
            const { data: transporteList, error: transporteError } = await supabase
              .from('empresas')
              .select('nombre, cuit, telefono, tipo_empresa')
              .eq('id', d.transport_id);
            
            console.log(`📊 Usuario info: empresaId=${d.transport_id}, rows=${transporteList?.length}`, transporteList);
            
            if (transporteError) {
              console.warn(`⚠️ Error buscando transporte ${d.transport_id}:`, transporteError);
            } else if (transporteList && transporteList.length > 0 && transporteList[0]) {
              const transporteData = transporteList[0];
              transporteAsignado = {
                nombre: transporteData.nombre || 'Transporte sin nombre',
                cuit: transporteData.cuit || '',
                tipo: transporteData.tipo_empresa || 'transporte',
                contacto: transporteData.telefono || transporteData.cuit || 'Sin contacto'
              };
              console.log(`✅ Transporte encontrado para ${d.pedido_id}:`, transporteAsignado);
            } else {
              console.warn(`⚠️ No se encontró transporte con ID: ${d.transport_id}`);
              // Asignar nombre por defecto basado en el ID para debugging
              transporteAsignado = {
                nombre: 'Transporte Asignado',
                cuit: d.transport_id.substring(0, 8),
                tipo: 'transporte',
                contacto: 'Ver detalles'
              };
            }
          } catch (error) {
            console.error(`❌ Error consultando transporte para ${d.pedido_id}:`, error);
          }
        }
        
        return {
          id: d.id,
          pedido_id: d.pedido_id,
          origen: d.origen,
          destino: d.destino,
          estado: d.estado,
          fecha_despacho: d.scheduled_local_date || 'Sin fecha',
          tipo_carga: d.type || 'N/A',
          prioridad: (['Baja', 'Media', 'Alta', 'Urgente'].includes(d.prioridad)) ? d.prioridad : 'Media',
          unidad_type: d.unidad_type || 'N/A',
          observaciones: d.comentarios || '',
          cantidad_viajes_solicitados: d.cantidad_viajes_solicitados,
          viajes_generados: viajesGenerados, // 🔥 NUEVO
          viajes_sin_asignar: viajesSinAsignar, // 🔥 NUEVO
          transporte_data: transporteAsignado,
        };
      }));
      
      // NO filtrar aquí - guardar TODOS los despachos
      // El filtrado se hará en el render según el tab activo
      console.log('✅ Total despachos cargados:', mappedData.length);
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
      const { data: userEmpresas } = await supabase
        .from('usuarios_empresa')
        .select(`
          empresa_id,
          rol_empresa_id,
          empresas(id, nombre, tipo_empresa, configuracion_empresa),
          roles_empresa(id, nombre, permisos)
        `)
        .eq('user_id', user.id)
        .eq('activo', true);

      if (!userEmpresas || userEmpresas.length === 0) {
        console.log('No hay empresas asociadas al usuario');
        setLoadingOptions(false);
        return;
      }

      const empresaIds = userEmpresas.map(rel => rel.empresa_id);
      const tiposEmpresa = userEmpresas.map(rel => rel.empresas?.tipo_empresa);
      const roles = userEmpresas.map(rel => rel.roles_empresa?.nombre);
      
      // Determinar si es coordinador por tipo de empresa o rol
      const esCoordinador = tiposEmpresa.includes('coordinador') || 
                           roles.some(rol => rol?.toLowerCase().includes('coordinador'));
      
      console.log('Usuario info:', { empresaIds, tiposEmpresa, roles, esCoordinador });

      let plantasFiltradas: any[] = [];
      let clientesFiltrados: any[] = [];

      if (esCoordinador) {
        // COORDINADORES: Lógica específica según el flujo de negocio
        console.log('Usuario coordinador - cargando plantas y clientes vinculados');
        
        // ORIGEN: Planta propia + plantas adicionales de la suscripción
        // Por ahora, la planta propia (donde trabaja el coordinador)
        const plantaPropia = userEmpresas.filter(rel => 
          rel.empresas?.configuracion_empresa?.tipo_instalacion === 'planta'
        ).map(rel => rel.empresas);
        
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
        
        console.log('Coordinador - Origen (plantas):', plantasFiltradas.length, 'Destino (clientes vinculados):', clientesFiltrados.length);
        
      } else {
        // TRANSPORTISTAS: Solo empresas asociadas via relaciones_empresas
        console.log('Usuario transportista - cargando empresas asociadas');
        
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
        plantasFiltradas = plantasData?.filter(rel => 
          rel.empresa_cliente?.configuracion_empresa?.tipo_instalacion === 'planta'
        ).map(rel => rel.empresa_cliente) || [];
        
        clientesFiltrados = plantasData?.filter(rel => 
          rel.empresa_cliente?.configuracion_empresa?.tipo_instalacion === 'cliente'
        ).map(rel => rel.empresa_cliente) || [];
      }
      
      setPlantas(plantasFiltradas);
      setClientes(clientesFiltrados);

      // Cargar transportes
      let transportesFiltrados: any[] = [];
      
      if (esCoordinador) {
        // COORDINADORES: Transportes vinculados + opción red Nodexia
        console.log('Cargando transportes para coordinador...');
        
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
        
        const transportesDirectos = transportesVinculados?.filter(rel => 
          rel.empresa_transporte?.tipo_empresa === 'transporte'
        ).map(rel => ({
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
        
        console.log(`Coordinador - Transportes vinculados: ${transportesDirectos.length}, Red Nodexia: ${transportesRed.length}`);
        
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

        transportesFiltrados = transportesData?.filter(rel => 
          rel.empresa_transporte?.tipo_empresa === 'transporte'
        ).map(rel => rel.empresa_transporte) || [];
      }
      
      setTransportes(transportesFiltrados);
      
      console.log(`Cargado para ${esCoordinador ? 'coordinador' : 'transportista'}:`, {
        plantas: plantasFiltradas.length,
        clientes: clientesFiltrados.length,
        transportes: transportesFiltrados.length
      });

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
      const lastCode = lastDespacho[0].pedido_id;
      const lastNumber = parseInt(lastCode.split('-')[2]) || 0;
      nextNumber = lastNumber + 1;
    }
    
    return `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
  };

  // Funciones para manejo dinámico de filas
  const handleAddRow = async () => {
    const newCode = await generateDespachoCode();
    setFormRows([
      ...formRows,
      {
        tempId: formRows.length > 0 ? Math.max(...formRows.map(row => row.tempId)) + 1 : 1,
        pedido_id: newCode, // Código generado automáticamente
        origen: '',
        destino: '',
        fecha_despacho: '',
        hora_despacho: '',
        tipo_carga: '',
        prioridad: 'Media',
        cantidad_viajes_solicitados: 1, // NUEVO - Default 1 viaje
        unidad_type: '',
        observaciones: '',
      },
    ]);
  };

  const handleRemoveRows = () => {
    const rowsToDelete = prompt('Ingresa los números de fila a eliminar (separados por coma, ej: 1,3,5):');
    if (rowsToDelete) {
      const rowNumbers = rowsToDelete.split(',').map(num => parseInt(num.trim())).filter(num => !isNaN(num));
      const updatedRows = formRows.filter(row => !rowNumbers.includes(row.tempId));
      setFormRows(updatedRows);
    }
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
    console.log('🚀 Iniciando asignación de transporte para:', dispatch.pedido_id);
    
    // Limpiar cualquier estado previo del modal
    setSelectedDispatchForAssign(null);
    setIsAssignModalOpen(false);
    
    // Pequeña pausa para asegurar que el modal se cierre completamente
    setTimeout(() => {
      console.log('🎯 Abriendo modal para:', dispatch.pedido_id);
      setSelectedDispatchForAssign(dispatch);
      setIsAssignModalOpen(true);
    }, 100);
  };

  // Función para manejar el éxito de la asignación
  const handleAssignSuccess = async () => {
    console.log('🎉 handleAssignSuccess ejecutado');
    console.log('👤 User ID para recarga:', user?.id);
    console.log('🚛 Despacho asignado:', selectedDispatchForAssign?.pedido_id);
    
    // GUARDAR referencia ANTES de limpiar el estado
    const despachoAsignado = selectedDispatchForAssign?.pedido_id;
    const despachoId = selectedDispatchForAssign?.id;
    
    console.log('🔍 Datos para actualización:', { despachoAsignado, despachoId });
    
    try {
      // 1. Cerrar modal inmediatamente para mejor UX
      setIsAssignModalOpen(false);
      
      // 2. Mostrar mensaje de éxito inmediato
      setSuccessMsg(`✅ Transporte asignado exitosamente al despacho ${despachoAsignado}`);
      
      // 3. Pausa para que la BD termine de procesar el update (importante para consistencia)
      console.log('⏳ Esperando confirmación de BD...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // 4. Recarga completa desde BD para obtener datos actualizados
      if (user?.id) {
        console.log('🔄 Recargando lista completa desde BD...');
        await fetchGeneratedDispatches(user.id);
        console.log('✅ Recarga desde BD completada');
      }
      
      console.log('🏁 handleAssignSuccess completado exitosamente');
      
    } catch (error) {
      console.error('❌ Error en handleAssignSuccess:', error);
      setErrorMsg('Error al actualizar la lista de despachos');
    } finally {
      // 5. Limpiar estado del modal SIEMPRE al final
      console.log('🧹 Limpiando estado del modal...');
      setSelectedDispatchForAssign(null);
    }
  };

  // Función para limpiar datos demo
  const handleCleanupDemo = async () => {
    const confirmed = window.confirm(
      '¿Estás seguro de que deseas eliminar TODOS los datos demo?\n\n' +
      'Esto incluye:\n' +
      '• Despachos con ID que contenga "DEMO_"\n' +
      '• Transportes con nombre "DEMO_"\n' +
      '• Otros datos de prueba\n\n' +
      'Esta acción NO se puede deshacer.'
    );

    if (!confirmed) return;

    try {
      console.log('🧹 Iniciando limpieza de datos demo...');
      setSuccessMsg(''); // Limpiar mensajes anteriores
      setErrorMsg('');

      // Eliminar despachos demo
      const { data: despachosDeleted, error: errorDespachos } = await supabase
        .from('despachos')
        .delete()
        .or('pedido_id.like.DEMO_%,pedido_id.like.DSP-%,pedido_id.like.TEST-%,pedido_id.like.PROD-%');

      if (errorDespachos) {
        console.error('❌ Error eliminando despachos:', errorDespachos);
        throw errorDespachos;
      }

      console.log('✅ Despachos demo eliminados');

      // Recargar la lista
      if (user?.id) {
        fetchGeneratedDispatches(user.id);
      }

      setSuccessMsg('🎉 Datos demo eliminados exitosamente. Base de datos limpia para testing.');

    } catch (error: any) {
      console.error('💥 Error en limpieza:', error);
      setErrorMsg(`Error al limpiar datos demo: ${error?.message || 'Error desconocido'}`);
    }
  };

  // Función para cerrar el modal
  const handleCloseAssignModal = () => {
    console.log('🚪 Cerrando modal de asignación...');
    setIsAssignModalOpen(false);
    setSelectedDispatchForAssign(null);
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
      // Expandir y cargar viajes si no están en cache
      newExpanded.add(despachoId);
      setExpandedDespachos(newExpanded);
      
      if (!viajesDespacho[despachoId]) {
        console.log('📦 Cargando viajes para despacho:', despachoId);
        try {
          const { data: viajes, error } = await supabase
            .from('viajes_despacho')
            .select(`
              id,
              numero_viaje,
              estado,
              id_transporte,
              observaciones,
              created_at
            `)
            .eq('despacho_id', despachoId)
            .order('numero_viaje', { ascending: true });

          if (error) {
            console.error('❌ Error cargando viajes:', error);
            return;
          }

          // Obtener información de transportes para los viajes asignados
          const transporteIds = viajes
            ?.filter(v => v.id_transporte)
            .map(v => v.id_transporte)
            .filter((id, index, self) => self.indexOf(id) === index) || [];

          let transportesData: Record<string, any> = {};
          
          if (transporteIds.length > 0) {
            const { data: transportes, error: transportesError } = await supabase
              .from('empresas')
              .select('id, nombre, cuit')
              .in('id', transporteIds);

            if (!transportesError && transportes) {
              transportesData = transportes.reduce((acc, t) => {
                acc[t.id] = t;
                return acc;
              }, {} as Record<string, any>);
            }
          }

          // Agregar info de transporte a cada viaje
          const viajesConTransporte = viajes?.map(v => ({
            ...v,
            transporte: v.id_transporte ? transportesData[v.id_transporte] : null
          })) || [];

          setViajesDespacho(prev => ({
            ...prev,
            [despachoId]: viajesConTransporte
          }));

          console.log('✅ Viajes cargados:', viajesConTransporte.length);
        } catch (error) {
          console.error('💥 Error cargando viajes:', error);
        }
      }
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

  const handleDeleteSelected = async () => {
    console.log('🚀 handleDeleteSelected iniciado');
    console.log('📊 Despachos seleccionados:', selectedDespachos.size);
    console.log('📋 IDs seleccionados:', Array.from(selectedDespachos));

    if (selectedDespachos.size === 0) {
      console.log('⚠️ No hay despachos seleccionados');
      return;
    }

    const confirmed = window.confirm(
      `¿Estás seguro de que deseas eliminar ${selectedDespachos.size} despacho(s)?\n\nEsta acción NO se puede deshacer.`
    );

    console.log('✅ Usuario confirmó eliminación:', confirmed);

    if (!confirmed) {
      console.log('❌ Usuario canceló eliminación');
      return;
    }

    console.log('🔄 Iniciando proceso de eliminación...');
    setDeletingDespachos(true); // Iniciar loading
    setErrorMsg(''); // Limpiar errores previos

    // GUARDAR referencias ANTES de cualquier operación
    const idsToDelete = Array.from(selectedDespachos);
    const countToDelete = selectedDespachos.size;

    try {
      console.log('🗑️ Eliminando despachos seleccionados:', idsToDelete);
      console.log('🎯 Total a eliminar:', countToDelete);

      const { data, error } = await supabase
        .from('despachos')
        .delete()
        .in('id', idsToDelete)
        .select();

      console.log('📤 Respuesta de eliminación:', { data, error });

      if (error) {
        console.error('❌ Error eliminando despachos:', error);
        throw error;
      }

      console.log('✅ Eliminación exitosa en BD, data:', data);

      // Contar cuántos se eliminaron realmente
      const deletedCount = data?.length || countToDelete;
      console.log('📊 Despachos eliminados:', deletedCount);

      // Limpiar selecciones ANTES de actualizar la lista
      console.log('🧹 Limpiando selecciones...');
      setSelectedDespachos(new Set());
      setSelectAll(false);

      // Recargar INMEDIATAMENTE desde la base de datos
      if (user?.id) {
        console.log('🔄 Recargando inmediatamente desde BD...');
        try {
          await fetchGeneratedDispatches(user.id);
          console.log('✅ Recarga completada exitosamente');
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
      
      console.log('🏁 Eliminación completada - UI actualizada');

    } catch (error: any) {
      console.error('💥 Error eliminando despachos:', error);
      console.error('💥 Error details:', JSON.stringify(error, null, 2));
      setErrorMsg(`Error al eliminar despachos: ${error?.message || 'Error desconocido'}`);
    } finally {
      console.log('🔄 Finalizando loading...');
      setDeletingDespachos(false); // Terminar loading SIEMPRE
    }
  };

  const handleSaveRow = async (rowToSave: FormDispatchRow, originalIndex: number) => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (!user) {
      setErrorMsg('Usuario no autenticado.');
      setLoading(false);
      return;
    }
    
    // Debug: ver qué datos tenemos
    console.log('📦 Datos de la fila a guardar:', {
      origen: rowToSave.origen,
      origen_id: rowToSave.origen_id,
      destino: rowToSave.destino,
      destino_id: rowToSave.destino_id,
      fecha: rowToSave.fecha_despacho,
      hora: rowToSave.hora_despacho,
      cantidad_viajes: rowToSave.cantidad_viajes_solicitados
    });
    
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
        console.log('⚠️ Código vacío, regenerando...');
        finalPedidoId = await generateDespachoCode();
      }
      
      console.log('📝 Guardando despacho con código:', finalPedidoId);

      // Construir la fecha/hora local y guardarla como ISO UTC
      const localScheduled = new Date(`${rowToSave.fecha_despacho}T${rowToSave.hora_despacho}:00`);
      const scheduledAtISO = localScheduled.toISOString();

      const despachoData = {
        pedido_id: finalPedidoId,
        origen: rowToSave.origen,
        destino: rowToSave.destino,
        estado: 'pendiente_transporte',
        scheduled_at: scheduledAtISO,
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
        setErrorMsg('Error al guardar despacho: ' + error.message);
      } else {
        console.log('✅ Despacho guardado exitosamente:', data[0]);
        setSuccessMsg(`Despacho "${data[0]?.pedido_id || finalPedidoId}" generado exitosamente.`);
        
        console.log('🔄 Recargando lista con user.id:', user.id);
        await fetchGeneratedDispatches(user.id); 

        // Remover la fila guardada del formulario
        setFormRows(prevRows => prevRows.filter(row => row.tempId !== rowToSave.tempId));
        if (formRows.length === 1 && formRows[0].tempId === rowToSave.tempId) { 
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
      setErrorMsg('Ocurrió un error inesperado: ' + err.message);
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
        <Header userEmail={user.email} userName={userName} pageTitle="Crear Despachos" />
        <main className="flex-1 p-4 max-w-full overflow-hidden">
          <h3 className="text-xl font-semibold mb-4 text-cyan-400">Cargar nuevos despachos</h3>

          {errorMsg && <p className="text-red-400 mb-4">{errorMsg}</p>}
          {successMsg && <p className="text-green-400 mb-4">{successMsg}</p>}

          <form onSubmit={(e) => e.preventDefault()} autoComplete="off">
            <div className="w-full overflow-x-auto bg-[#1b273b] p-4 rounded-lg shadow-lg mb-6">
              <div className="space-y-4">
                {formRows.map((row, index) => (
                  <div key={row.tempId} className="bg-[#0e1a2d] rounded-lg p-4 border border-gray-700">
                    {/* Header: Número y Código */}
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-700">
                      <div className="flex items-center gap-4">
                        <span className="text-cyan-400 font-bold text-lg">#{index + 1}</span>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Código de Despacho</label>
                          <input
                            type="text"
                            value={row.pedido_id}
                            readOnly
                            className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-300 cursor-not-allowed w-40"
                            placeholder="Auto-generado"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSaveRow(row, index)}
                        disabled={loading}
                        className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm disabled:opacity-60 transition-colors"
                      >
                        {loading ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>

                    {/* Fila 1: Origen, Destino, Tipo Carga */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {/* Origen */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          Origen <span className="text-red-400">*</span>
                        </label>
                        <UbicacionAutocompleteInput
                          tipo="origen"
                          value={row.origen}
                          onSelect={(ubicacion) => {
                            handleRowChange(row.tempId, 'origen', ubicacion.alias || ubicacion.nombre);
                            setFormRows(prevRows =>
                              prevRows.map(r =>
                                r.tempId === row.tempId
                                  ? { ...r, origen_id: ubicacion.id }
                                  : r
                              )
                            );
                          }}
                          placeholder="Buscar origen..."
                          required
                        />
                      </div>

                      {/* Destino */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          Destino <span className="text-red-400">*</span>
                        </label>
                        <UbicacionAutocompleteInput
                          tipo="destino"
                          value={row.destino}
                          onSelect={(ubicacion) => {
                            handleRowChange(row.tempId, 'destino', ubicacion.alias || ubicacion.nombre);
                            setFormRows(prevRows =>
                              prevRows.map(r =>
                                r.tempId === row.tempId
                                  ? { ...r, destino_id: ubicacion.id }
                                  : r
                              )
                            );
                          }}
                          placeholder="Buscar destino..."
                          required
                        />
                      </div>

                      {/* Tipo Carga */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">Tipo de Carga</label>
                        <select
                          value={row.tipo_carga}
                          onChange={(e) => handleRowChange(row.tempId, 'tipo_carga', e.target.value)}
                          className="w-full bg-[#1b273b] border border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                        >
                          <option value="">Seleccionar...</option>
                          <option value="despacho">Despacho</option>
                          <option value="paletizada">Paletizada</option>
                          <option value="granel">Granel</option>
                          <option value="contenedor">Contenedor</option>
                        </select>
                      </div>
                    </div>

                    {/* Fila 2: Fecha, Hora, Prioridad, Cant. Viajes, Tipo Unidad, Observaciones */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                      {/* Fecha */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">Fecha</label>
                        <input
                          type="date"
                          value={row.fecha_despacho}
                          onChange={(e) => handleRowChange(row.tempId, 'fecha_despacho', e.target.value)}
                          min={today}
                          className="w-full bg-[#1b273b] border border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                        />
                      </div>

                      {/* Hora */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">Hora</label>
                        <input
                          type="time"
                          value={row.hora_despacho}
                          onChange={(e) => handleRowChange(row.tempId, 'hora_despacho', e.target.value)}
                          className="w-full bg-[#1b273b] border border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                        />
                      </div>

                      {/* Prioridad */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">Prioridad</label>
                        <select
                          value={row.prioridad === 'Medios de comunicación' ? 'Media' : (row.prioridad === 'Medios' ? 'Media' : (row.prioridad || 'Media'))}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Validar que solo sean valores permitidos
                            if (['Baja', 'Media', 'Alta', 'Urgente'].includes(value)) {
                              handleRowChange(row.tempId, 'prioridad', value);
                            }
                          }}
                          autoComplete="new-password"
                          data-form-type="other"
                          name={`prioridad-unique-${row.tempId}-${Date.now()}`}
                          className="w-full bg-[#1b273b] border border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                        >
                          <option value="Baja">Baja</option>
                          <option value="Media">Media</option>
                          <option value="Alta">Alta</option>
                          <option value="Urgente">Urgente</option>
                        </select>
                      </div>

                      {/* Cantidad de Viajes - NUEVO */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          Cant. Viajes 🚛
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={row.cantidad_viajes_solicitados || 1}
                          onChange={(e) => handleRowChange(row.tempId, 'cantidad_viajes_solicitados', parseInt(e.target.value) || 1)}
                          className="w-full bg-[#1b273b] border border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                          title="Cantidad de camiones/viajes necesarios para este despacho"
                        />
                      </div>

                      {/* Tipo Unidad */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">Tipo Unidad</label>
                        <select
                          value={row.unidad_type}
                          onChange={(e) => handleRowChange(row.tempId, 'unidad_type', e.target.value)}
                          className="w-full bg-[#1b273b] border border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                        >
                          <option value="">Seleccionar...</option>
                          <option value="chasis">Chasis</option>
                          <option value="semi">Semi</option>
                          <option value="batea">Batea</option>
                          <option value="furgon">Furgón</option>
                        </select>
                      </div>

                      {/* Observaciones */}
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">Observaciones</label>
                        <input
                          type="text"
                          value={row.observaciones}
                          onChange={(e) => handleRowChange(row.tempId, 'observaciones', e.target.value)}
                          className="w-full bg-[#1b273b] border border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                          placeholder="Notas adicionales..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4 mb-6">
              <button
                type="button"
                onClick={handleAddRow}
                className="flex-1 px-6 py-3 rounded-md bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors duration-200"
              >
                + Agregar fila
              </button>
              <button
                type="button"
                onClick={handleRemoveRows}
                className="flex-1 px-6 py-3 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors duration-200"
              >
                - Eliminar filas
              </button>
            </div>
          </form>

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
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('pendientes')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === 'pendientes'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              📋 Pendientes
              <span className="ml-2 px-2 py-0.5 bg-orange-700 rounded text-xs">
                {generatedDispatches.filter(d => (d.cantidad_viajes_solicitados || 0) > 0 && !d.transporte_data).length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('en_proceso')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === 'en_proceso'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              🚛 En Proceso
              <span className="ml-2 px-2 py-0.5 bg-blue-700 rounded text-xs">
                {generatedDispatches.filter(d => (d.cantidad_viajes_solicitados || 0) > 0 && d.transporte_data).length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('asignados')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === 'asignados'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              ✅ Asignados
              <span className="ml-2 px-2 py-0.5 bg-green-700 rounded text-xs">
                {generatedDispatches.filter(d => (d.cantidad_viajes_solicitados || 0) === 0).length}
              </span>
            </button>
          </div>
          
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
                  <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-40">Origen</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-40">Destino</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-24">Tipo<br/>Carga</th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-20">Prioridad</th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-16">Unidad</th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-32">Transporte</th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-24">Estado</th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-32">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700 text-slate-200">
                {(() => {
                  // Filtrar despachos según el tab activo
                  const filteredDispatches = generatedDispatches.filter(d => {
                    const viajesPendientes = (d.cantidad_viajes_solicitados || 0) > 0;
                    const tieneTransporte = !!d.transporte_data;
                    
                    if (activeTab === 'pendientes') {
                      // Pendientes: tienen viajes por asignar Y NO tienen transporte
                      return viajesPendientes && !tieneTransporte;
                    } else if (activeTab === 'en_proceso') {
                      // En proceso: tienen viajes pendientes PERO YA tienen algún transporte asignado
                      return viajesPendientes && tieneTransporte;
                    } else {
                      // Asignados: NO tienen viajes pendientes (todos asignados)
                      return !viajesPendientes;
                    }
                  });

                  if (filteredDispatches.length === 0) {
                    return (
                      <tr>
                        <td colSpan={11} className="px-2 py-6 text-center text-slate-400">
                          {loadingGenerated 
                            ? "Cargando despachos..." 
                            : activeTab === 'pendientes'
                              ? "No hay despachos pendientes de asignación"
                              : activeTab === 'en_proceso'
                                ? "No hay despachos en proceso"
                                : "No hay despachos con todos los viajes asignados"}
                        </td>
                      </tr>
                    );
                  }

                  return filteredDispatches.map(dispatch => (
                    <React.Fragment key={dispatch.id}>
                    <tr className={selectedDespachos.has(dispatch.id) ? "bg-cyan-900/20" : ""}>
                      <td className="px-2 py-3 text-center w-8">
                        <input
                          type="checkbox"
                          checked={selectedDespachos.has(dispatch.id)}
                          onChange={() => handleSelectDespacho(dispatch.id)}
                          className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500 focus:ring-2"
                        />
                      </td>
                      <td className="px-2 py-3 text-sm font-medium w-32">
                        <div className="flex flex-col gap-1">
                          <span className="truncate">{dispatch.pedido_id}</span>
                          {/* 🔥 CONTADOR DE VIAJES */}
                          {dispatch.viajes_generados !== undefined && dispatch.viajes_generados > 0 && (
                            <div className="flex flex-col gap-0.5">
                              <span className="px-1.5 py-0.5 bg-blue-600 text-blue-100 rounded text-xs font-bold inline-block">
                                📋 {dispatch.viajes_generados} generado{dispatch.viajes_generados > 1 ? 's' : ''}
                              </span>
                              {dispatch.viajes_sin_asignar !== undefined && dispatch.viajes_sin_asignar > 0 && (
                                <span className="px-1.5 py-0.5 bg-orange-600 text-orange-100 rounded text-xs font-bold inline-block">
                                  ⚠️ {dispatch.viajes_sin_asignar} sin asignar
                                </span>
                              )}
                            </div>
                          )}
                          {/* Fallback al antiguo formato si no hay datos de viajes */}
                          {(dispatch.viajes_generados === undefined || dispatch.viajes_generados === 0) && dispatch.cantidad_viajes_solicitados && dispatch.cantidad_viajes_solicitados > 0 && (
                            <span 
                              className="px-1.5 py-0.5 bg-blue-600 text-blue-100 rounded text-xs font-bold cursor-help inline-block"
                              title={`${dispatch.cantidad_viajes_solicitados} viajes pendientes de asignar. Haz clic en "Asignar Transporte" para gestionarlos.`}
                            >
                              📋 {dispatch.cantidad_viajes_solicitados} pendiente{dispatch.cantidad_viajes_solicitados > 1 ? 's' : ''}
                            </span>
                          )}
                          {dispatch.transporte_data && activeTab === 'asignados' && (
                            <span className="text-xs text-green-400">
                              ✅ Todos asignados
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-sm w-20 truncate">{dispatch.fecha_despacho}</td>
                      <td className="px-2 py-3 text-sm w-40 truncate" title={dispatch.origen}>{dispatch.origen}</td>
                      <td className="px-2 py-3 text-sm w-40 truncate" title={dispatch.destino}>{dispatch.destino}</td>
                      <td className="px-2 py-3 text-sm w-24 truncate">{dispatch.tipo_carga}</td>
                      <td className="px-2 py-3 text-sm w-20">
                        <span className={`px-1 py-0.5 rounded text-xs whitespace-nowrap ${
                          dispatch.prioridad === 'Urgente' ? 'bg-red-600 text-red-100' :
                          dispatch.prioridad === 'Alta' ? 'bg-orange-600 text-orange-100' :
                          dispatch.prioridad === 'Media' ? 'bg-yellow-600 text-yellow-100' :
                          'bg-gray-600 text-gray-100'
                        }`}>
                          {dispatch.prioridad}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-sm w-16 truncate">{dispatch.unidad_type}</td>
                      <td className="px-2 py-3 text-sm w-28 truncate">
                        {dispatch.transporte_data ? (
                          <div className="text-green-400" title={`CUIT: ${dispatch.transporte_data.cuit || 'N/A'} - Tipo: ${dispatch.transporte_data.tipo || 'N/A'}`}>
                            {dispatch.transporte_data.nombre}
                          </div>
                        ) : (
                          <span className="text-orange-400">Sin asignar</span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-sm w-20">
                        <span className={`px-1 py-0.5 rounded text-xs whitespace-nowrap ${
                          (dispatch.estado === 'Generado' || dispatch.estado === 'planificado' || dispatch.estado === 'pendiente_transporte') ? 'bg-orange-600 text-orange-100' :
                          dispatch.estado === 'Ofrecido' ? 'bg-blue-600 text-blue-100' :
                          (dispatch.estado === 'Asignado' || dispatch.estado === 'transporte_asignado') ? 'bg-green-600 text-green-100' :
                          'bg-gray-600 text-gray-100'
                        }`}>
                          {dispatch.estado === 'planificado' ? 'Generado' : 
                           dispatch.estado === 'pendiente_transporte' ? 'Pendiente Transporte' : 
                           dispatch.estado === 'transporte_asignado' ? 'Transporte Asignado' :
                           dispatch.estado}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-sm text-center w-40">
                        <div className="flex gap-1 justify-center items-center">
                          {/* 🔥 NUEVO: Botón expandir/contraer */}
                          {dispatch.viajes_generados && dispatch.viajes_generados > 0 && (
                            <button
                              type="button"
                              onClick={() => handleToggleExpandDespacho(dispatch.id)}
                              className="px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-white text-xs transition-colors"
                              title={expandedDespachos.has(dispatch.id) ? "Contraer viajes" : "Ver viajes"}
                            >
                              {expandedDespachos.has(dispatch.id) ? '▼' : '▶'} Viajes
                            </button>
                          )}
                          {(!dispatch.transporte_data || (dispatch.cantidad_viajes_solicitados && dispatch.cantidad_viajes_solicitados > 0)) ? (
                            <button
                              type="button"
                              onClick={() => handleAssignTransport(dispatch)}
                              className="px-2 py-1 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs transition-all duration-200 hover:shadow-lg hover:scale-105"
                              title={`Asignar transporte a ${dispatch.pedido_id}`}
                            >
                              🚛 Asignar
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    {/* 🔥 NUEVO: Fila expandida con lista de viajes */}
                    {expandedDespachos.has(dispatch.id) && (
                      <tr className="bg-[#0a0e1a]">
                        <td colSpan={11} className="px-4 py-3">
                          <div className="ml-8">
                            <h4 className="text-sm font-semibold text-cyan-400 mb-2">
                              📦 Viajes del Despacho {dispatch.pedido_id}
                            </h4>
                            {viajesDespacho[dispatch.id] ? (
                              viajesDespacho[dispatch.id]?.length > 0 ? (
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-gray-400 border-b border-gray-700">
                                      <th className="py-2 px-2 w-20"># Viaje</th>
                                      <th className="py-2 px-2 w-48">Transporte</th>
                                      <th className="py-2 px-2 w-32">Estado</th>
                                      <th className="py-2 px-2">Observaciones</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {viajesDespacho[dispatch.id]?.map((viaje: any) => (
                                      <tr key={viaje.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                                        <td className="py-2 px-2 font-mono">
                                          <span className="px-2 py-1 bg-blue-900 text-blue-200 rounded">
                                            #{viaje.numero_viaje}
                                          </span>
                                        </td>
                                        <td className="py-2 px-2">
                                          {viaje.transporte ? (
                                            <div>
                                              <div className="text-green-400 font-medium">{viaje.transporte.nombre}</div>
                                              <div className="text-gray-500 text-xs">CUIT: {viaje.transporte.cuit}</div>
                                            </div>
                                          ) : (
                                            <span className="text-orange-400">Sin asignar</span>
                                          )}
                                        </td>
                                        <td className="py-2 px-2">
                                          <span className={`px-2 py-1 rounded text-xs ${
                                            viaje.estado === 'transporte_asignado' 
                                              ? 'bg-green-900 text-green-200' 
                                              : 'bg-orange-900 text-orange-200'
                                          }`}>
                                            {viaje.estado === 'transporte_asignado' ? '✅ Asignado' : '⏳ Pendiente'}
                                          </span>
                                        </td>
                                        <td className="py-2 px-2 text-gray-400">
                                          {viaje.observaciones || '-'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="text-gray-400 text-sm py-2">
                                  No hay viajes registrados para este despacho
                                </div>
                              )
                            ) : (
                              <div className="text-gray-400 text-sm py-2">
                                Cargando viajes...
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ));
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
    </div>
  );
};

export default CrearDespacho;