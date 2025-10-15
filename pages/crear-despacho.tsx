import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import AssignTransportModal from '../components/Modals/AssignTransportModal';

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
  destino: string;
  fecha_despacho: string;
  hora_despacho: string;
  tipo_carga: string;
  prioridad: string;
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
  transporte_data?: { 
    nombre: string;
    contacto?: any;
  };
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
      prioridad: 'Media',
      unidad_type: '',
      observaciones: '',
    },
  ]);

  const [generatedDispatches, setGeneratedDispatches] = useState<GeneratedDispatch[]>([]);
  const [loadingGenerated, setLoadingGenerated] = useState(true);
  const [tableRenderKey, setTableRenderKey] = useState(0);

  // Estados para modal de asignación de transporte
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedDispatchForAssign, setSelectedDispatchForAssign] = useState<GeneratedDispatch | null>(null);

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
      
      // Cargar despachos del usuario
      fetchGeneratedDispatches(currentUserData.id);
    }
  };

  const fetchGeneratedDispatches = async (userId: string) => {
    console.log('🔄 fetchGeneratedDispatches llamado con userId:', userId);
    console.log('🔄 Iniciando proceso de carga...');
    setLoadingGenerated(true);

    if (!userId) {
      console.error('❌ No userId proporcionado para fetchGeneratedDispatches');
      setLoadingGenerated(false);
      return;
    }

    // Usar tabla despachos original para el flujo de generación -> asignación con JOIN a transportes
    console.log('🔍 Ejecutando query con filtros:');
    console.log('   - Usuario:', userId);
    console.log('   - Estados permitidos: [pendiente_transporte, transporte_asignado]');
    
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
        created_by,
        transportes:transport_id (
          id,
          nombre,
          contacto
        )
      `)
      .eq('created_by', userId)
      .in('estado', ['pendiente_transporte', 'transporte_asignado'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error al cargar despachos generados:', error.message);
      console.error('❌ Error completo:', error);
    } else {
      console.log('📦 Query ejecutado exitosamente');
      console.log('📦 Despachos encontrados:', data?.length || 0);
      
      if (data && data.length > 0) {
        console.log('📦 Datos recibidos de la BD:');
        data.forEach((d, index) => {
          console.log(`   ${index + 1}. ${d.pedido_id}`);
          console.log(`      - Estado: ${d.estado}`);
          console.log(`      - Transport ID: ${d.transport_id || 'null'}`);
          console.log(`      - Transportes data:`, d.transportes);
          
          if (d.transportes) {
            const transporteNombre = Array.isArray(d.transportes) ? d.transportes[0]?.nombre : d.transportes?.nombre;
            console.log(`      └─ Transporte nombre: ${transporteNombre || 'Sin nombre'}`);
          } else if (d.transport_id) {
            console.warn(`      ⚠️ Tiene transport_id pero no datos de transporte`);
          }
        });
      } else {
        console.log('⚠️ No se encontraron despachos para el usuario:', userId);
        // Hacer una query de debug para ver todos los despachos del usuario
        console.log('🔍 DEBUG: Verificando todos los despachos del usuario...');
        const { data: allUserDispatches } = await supabase
          .from('despachos')
          .select('id, pedido_id, estado, created_by')
          .eq('created_by', userId);
        console.log('🔍 Todos los despachos del usuario:', allUserDispatches);
      }
      
      // Verificar que todos los despachos son del usuario correcto
      data?.forEach(d => {
        console.log(`📋 Despacho ${d.pedido_id}:`);
        console.log(`   - Owner: ${d.created_by}`);
        console.log(`   - Expected: ${userId}`);
        console.log(`   - Estado: ${d.estado}`);
        console.log(`   - Transport: ${d.transport_id || 'null'}`);
        
        if (d.created_by !== userId) {
          console.error('⚠️ PROBLEMA: Despacho no pertenece al usuario actual!');
        }
      });
      
      const mappedData: GeneratedDispatch[] = (data || []).map(d => {
        // Obtener información del transporte desde el JOIN
        let transporteAsignado: { nombre: string; contacto?: any; } | undefined = undefined;
        if (d.transport_id && d.transportes) {
          // d.transportes es un objeto único, no un array
          const transporte = Array.isArray(d.transportes) ? d.transportes[0] : d.transportes;
          transporteAsignado = {
            nombre: transporte?.nombre || 'Transporte sin nombre',
            contacto: transporte?.contacto
          };
        }
        
        // Log simplificado para debugging si es necesario
        if (d.transport_id && !d.transportes) {
          console.warn(`⚠️ Despacho ${d.pedido_id} tiene transport_id pero falta información del transporte`);
        }
        
        return {
          id: d.id,
          pedido_id: d.pedido_id,
          origen: d.origen,
          destino: d.destino,
          estado: d.estado,
          fecha_despacho: d.scheduled_local_date || 'Sin fecha',
          tipo_carga: d.type || 'N/A',
          prioridad: d.prioridad,
          unidad_type: d.unidad_type || 'N/A',
          observaciones: d.comentarios || '',
          transporte_data: transporteAsignado,
        };
      });
      
      console.log('✅ Despachos finales para mostrar:', mappedData.length);
      
      // DEBUG: Mostrar estructura completa de los datos
      mappedData.forEach((dispatch, index) => {
        console.log(`📋 Despacho ${index + 1}:`, {
          id: dispatch.id,
          pedido_id: dispatch.pedido_id,
          estado: dispatch.estado,
          transporte_data: dispatch.transporte_data
        });
      });
      
      console.log('🔄 Aplicando setGeneratedDispatches...');
      setGeneratedDispatches(mappedData);
      setTableRenderKey(prev => prev + 1); // Forzar re-render
      console.log('✅ setGeneratedDispatches completado');
    }
    
    console.log('🏁 fetchGeneratedDispatches terminando, setLoadingGenerated(false)');
    setLoadingGenerated(false);
    console.log('✅ fetchGeneratedDispatches completamente finalizado');
  };

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

  const handleRowChange = (tempId: number, field: keyof FormDispatchRow, value: string) => {
    setFormRows(formRows.map(row =>
      row.tempId === tempId ? { ...row, [field]: value } : row
    ));
  };

  // Función para iniciar asignación de transporte
  const handleAssignTransport = (dispatch: GeneratedDispatch) => {
    console.log('Iniciando asignación de transporte para:', dispatch);
    setSelectedDispatchForAssign(dispatch);
    setIsAssignModalOpen(true);
  };

  // Función para manejar el éxito de la asignación
  const handleAssignSuccess = async (transporteInfo?: { id: string; nombre: string }) => {
    console.log('🎉 handleAssignSuccess ejecutado');
    console.log('👤 User ID para recarga:', user?.id);
    console.log('🚛 Despacho asignado:', selectedDispatchForAssign?.pedido_id);
    console.log('🚚 Transporte info recibido:', transporteInfo);
    
    if (!selectedDispatchForAssign) {
      console.error('❌ No hay despacho seleccionado para asignar');
      return;
    }
    
    if (!transporteInfo) {
      console.error('❌ No se recibió información del transporte');
      console.error('❌ Usando nombre por defecto...');
      transporteInfo = { id: 'unknown', nombre: 'Transporte Asignado' };
    }
    
    const despachoId = selectedDispatchForAssign.id;
    
    try {
      // 1. Actualizar el estado local inmediatamente para feedback visual
      console.log('📝 Actualizando estado local inmediatamente...');
      setGeneratedDispatches(prev => 
        prev.map(d => 
          d.id === despachoId 
            ? { 
                ...d, 
                estado: 'transporte_asignado',
                transporte_data: { nombre: transporteInfo.nombre }
              }
            : d
        )
      );
      
      // 2. Verificar que la actualización en BD fue exitosa consultando directamente
      console.log('🔍 Esperando un momento para verificar actualización en BD...');
      
      // Esperar un poco para asegurar que la BD se actualice
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('🔍 Verificando actualización en base de datos...');
      const { data: verificarDespacho, error: verificarError } = await supabase
        .from('despachos')
        .select(`
          id,
          pedido_id, 
          estado,
          transport_id,
          transportes:transport_id (
            id,
            nombre,
            contacto
          )
        `)
        .eq('id', despachoId)
        .single();
      
      if (verificarError) {
        console.error('❌ Error verificando despacho actualizado:', verificarError);
        throw verificarError;
      }
      
      if (verificarDespacho) {
        console.log('✅ Verificación exitosa del despacho actualizado:');
        console.log('   - ID:', verificarDespacho.id);
        console.log('   - Estado:', verificarDespacho.estado);
        console.log('   - Transport ID:', verificarDespacho.transport_id);
        console.log('   - Transporte:', verificarDespacho.transportes);
        
        // Si no hay transporte en la BD, usar la información que tenemos
        let transporteData = { nombre: transporteInfo.nombre };
        
        if (verificarDespacho.transportes) {
          const transporte = Array.isArray(verificarDespacho.transportes) 
            ? verificarDespacho.transportes[0] 
            : verificarDespacho.transportes;
          
          if (transporte && transporte.nombre) {
            transporteData = {
              nombre: transporte.nombre,
              contacto: transporte.contacto
            };
          }
        }
        
        console.log('🚚 Datos de transporte finales:', transporteData);
        
        // 3. Actualizar el estado local con los datos reales de la BD
        setGeneratedDispatches(prev => 
          prev.map(d => 
            d.id === despachoId 
              ? { 
                  ...d, 
                  estado: verificarDespacho.estado,
                  transporte_data: transporteData
                }
              : d
          )
        );
        
        console.log('✅ Estado actualizado correctamente con datos de BD');
        
        // 4. FORZAR RECARGA COMPLETA DE DESPACHOS - ENFOQUE SIMPLE
        console.log('🔄 Forzando recarga completa de despachos...');
        if (user?.id) {
          console.log('🔄 Llamando fetchGeneratedDispatches directamente...');
          await fetchGeneratedDispatches(user.id);
          console.log('✅ Recarga completa finalizada');
        }
        
      } else {
        console.warn('⚠️ No se pudo verificar el despacho actualizado');
        // Recargar despachos de todas formas
        if (user?.id) {
          await fetchGeneratedDispatches(user.id);
        }
      }
      
    } catch (error) {
      console.error('💥 Error en handleAssignSuccess:', error);
      // En caso de error, recargar despachos para sincronizar
      if (user?.id) {
        await fetchGeneratedDispatches(user.id);
      }
    } finally {
      // 5. Limpiar estado del modal
      setSelectedDispatchForAssign(null);
      setIsAssignModalOpen(false);
    }
    
    setSuccessMsg(`✅ Transporte asignado exitosamente al despacho ${selectedDispatchForAssign?.pedido_id}`);
  };

  // Función para cerrar el modal
  const handleCloseAssignModal = () => {
    setIsAssignModalOpen(false);
    setSelectedDispatchForAssign(null);
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
    
    if (!rowToSave.origen || !rowToSave.destino || !rowToSave.fecha_despacho || !rowToSave.hora_despacho) {
      setErrorMsg('Por favor, completa los campos obligatorios (Origen, Destino, Fecha, Hora).');
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
        prioridad: rowToSave.prioridad || 'Normal',
        unidad_type: rowToSave.unidad_type || 'semi',
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

          <form onSubmit={(e) => e.preventDefault()}>
            <div className="w-full overflow-x-auto bg-[#1b273b] p-4 rounded-lg shadow-lg mb-6">
              <table className="w-full table-auto divide-y divide-gray-700">
                <thead className="bg-[#0e1a2d]">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">#</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Código Despacho
                      <span className="block text-xs text-gray-400 normal-case">(Auto)</span>
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Origen</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Destino</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Tipo Carga</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Fecha</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Hora</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Prioridad</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Tipo Unidad</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Observaciones</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700 text-slate-200">
                  {formRows.map((row, index) => (
                    <tr key={row.tempId}>
                      <td className="px-2 py-3 whitespace-nowrap text-sm">{index + 1}</td>
                      
                      {/* Pedido ID - Generado Automáticamente */}
                      <td className="px-2 py-3">
                        <input
                          type="text"
                          value={row.pedido_id}
                          readOnly
                          className="w-28 bg-gray-700 border border-gray-500 rounded-md px-1 py-1 text-sm text-gray-300 cursor-not-allowed"
                          placeholder="Auto-generado"
                          title="Código generado automáticamente"
                        />
                      </td>

                      {/* Origen */}
                      <td className="px-2 py-3">
                        <AutocompleteField
                          value={row.origen}
                          onChange={(value) => handleRowChange(row.tempId, 'origen', value)}
                          options={plantas}
                          placeholder="Buscar planta..."
                          className="w-32"
                          loading={loadingOptions}
                        />
                      </td>

                      {/* Destino */}
                      <td className="px-2 py-3">
                        <AutocompleteField
                          value={row.destino}
                          onChange={(value) => handleRowChange(row.tempId, 'destino', value)}
                          options={clientes}
                          placeholder="Buscar cliente..."
                          className="w-32"
                          loading={loadingOptions}
                        />
                      </td>

                      {/* Tipo Carga */}
                      <td className="px-2 py-3">
                        <select
                          value={row.tipo_carga}
                          onChange={(e) => handleRowChange(row.tempId, 'tipo_carga', e.target.value)}
                          className="w-24 bg-[#0e1a2d] border border-gray-600 rounded-md px-2 py-1 text-sm focus:ring-cyan-500 focus:border-cyan-500"
                        >
                          <option value="">Sel.</option>
                          <option value="despacho">Despacho</option>
                          <option value="paletizada">Paletizada</option>
                          <option value="granel">Granel</option>
                          <option value="contenedor">Contenedor</option>
                        </select>
                      </td>

                      {/* Fecha */}
                      <td className="px-2 py-3">
                        <input
                          type="date"
                          value={row.fecha_despacho}
                          onChange={(e) => handleRowChange(row.tempId, 'fecha_despacho', e.target.value)}
                          min={today}
                          className="w-28 bg-[#0e1a2d] border border-gray-600 rounded-md px-1 py-1 text-sm focus:ring-cyan-500 focus:border-cyan-500"
                        />
                      </td>

                      {/* Hora */}
                      <td className="px-2 py-3">
                        <input
                          type="time"
                          value={row.hora_despacho}
                          onChange={(e) => handleRowChange(row.tempId, 'hora_despacho', e.target.value)}
                          className="w-20 bg-[#0e1a2d] border border-gray-600 rounded-md px-1 py-1 text-sm focus:ring-cyan-500 focus:border-cyan-500"
                        />
                      </td>

                      {/* Prioridad */}
                      <td className="px-2 py-3">
                        <select
                          value={row.prioridad}
                          onChange={(e) => handleRowChange(row.tempId, 'prioridad', e.target.value)}
                          className="w-24 bg-[#0e1a2d] border border-gray-600 rounded-md px-1 py-1 text-sm focus:ring-cyan-500 focus:border-cyan-500"
                        >
                          <option value="Baja">Baja</option>
                          <option value="Media">Media</option>
                          <option value="Alta">Alta</option>
                          <option value="Urgente">Urgente</option>
                        </select>
                      </td>

                      {/* Tipo Unidad */}
                      <td className="px-2 py-3">
                        <select
                          value={row.unidad_type}
                          onChange={(e) => handleRowChange(row.tempId, 'unidad_type', e.target.value)}
                          className="w-24 bg-[#0e1a2d] border border-gray-600 rounded-md px-1 py-1 text-sm focus:ring-cyan-500 focus:border-cyan-500"
                        >
                          <option value="">Sel.</option>
                          <option value="chasis">Chasis</option>
                          <option value="semi">Semi</option>
                          <option value="batea">Batea</option>
                          <option value="furgon">Furgón</option>
                        </select>
                      </td>

                      {/* Observaciones */}
                      <td className="px-2 py-3">
                        <input
                          type="text"
                          value={row.observaciones}
                          onChange={(e) => handleRowChange(row.tempId, 'observaciones', e.target.value)}
                          className="w-32 bg-[#0e1a2d] border border-gray-600 rounded-md px-1 py-1 text-sm focus:ring-cyan-500 focus:border-cyan-500"
                          placeholder="Observaciones..."
                        />
                      </td>

                      {/* Acción */}
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-center">
                        <button
                          type="button"
                          onClick={() => handleSaveRow(row, index)}
                          disabled={loading}
                          className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs disabled:opacity-60 transition-colors duration-200"
                        >
                          {loading ? 'Guardando...' : 'Guardar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            <h3 className="text-xl font-semibold text-cyan-400">Despachos Generados - Para Asignación de Transporte</h3>
            <button
              onClick={() => {
                console.log('🔄 Forzando recarga manual...');
                if (user?.id) {
                  fetchGeneratedDispatches(user.id);
                } else {
                  console.error('❌ No hay usuario para recargar');
                }
              }}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
            >
              🔄 Refrescar
            </button>
          </div>
          <div className="w-full overflow-x-auto bg-[#1b273b] p-3 rounded-lg shadow-lg max-w-full">
            <table className="w-full table-auto divide-y divide-gray-700">
              <thead className="bg-[#0e1a2d]">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-32">Pedido ID</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-20">Fecha</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-40">Origen</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-40">Destino</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-24">Tipo<br/>Carga</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-20">Prioridad</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-16">Unidad</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-28">Transporte</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-20">Estado</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-32">Acción</th>
                </tr>
              </thead>
              <tbody key={tableRenderKey} className="divide-y divide-gray-700 text-slate-200">
                {(() => {
                  console.log('🎯 RENDER TABLE - generatedDispatches.length:', generatedDispatches.length);
                  console.log('🎯 RENDER TABLE - loadingGenerated:', loadingGenerated);
                  if (generatedDispatches.length > 0) {
                    console.log('🎯 RENDER TABLE - Primeros 2 despachos:', generatedDispatches.slice(0, 2).map(d => ({
                      id: d.id,
                      pedido_id: d.pedido_id,
                      estado: d.estado,
                      transporte: d.transporte_data?.nombre || 'Sin transporte'
                    })));
                  }
                  return null;
                })()}
                
                {generatedDispatches.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-2 py-8 text-center text-slate-400">
                      {loadingGenerated ? "Cargando despachos generados..." : "No hay despachos generados para mostrar."}
                    </td>
                  </tr>
                ) : (
                  generatedDispatches.map(dispatch => (
                    <tr key={dispatch.id}>
                      <td className="px-2 py-3 text-sm font-medium w-32 truncate">{dispatch.pedido_id}</td>
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
                          <div className="text-green-400" title={`Transporte: ${dispatch.transporte_data.nombre}`}>
                            {dispatch.transporte_data.nombre}
                          </div>
                        ) : (
                          <span className="text-orange-400">Sin asignar</span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-sm w-20">
                        <span className={`px-1 py-0.5 rounded text-xs whitespace-nowrap ${
                          (dispatch.estado === 'Generado' || dispatch.estado === 'planificado' || dispatch.estado === 'pendiente_transporte') ? 'bg-orange-600 text-orange-100' :
                          dispatch.estado === 'transporte_asignado' ? 'bg-green-600 text-green-100' :
                          dispatch.estado === 'Ofrecido' ? 'bg-blue-600 text-blue-100' :
                          dispatch.estado === 'Asignado' ? 'bg-green-600 text-green-100' :
                          'bg-gray-600 text-gray-100'
                        }`}>
                          {dispatch.estado === 'planificado' ? 'Generado' : 
                           dispatch.estado === 'pendiente_transporte' ? 'Pendiente Transporte' : 
                           dispatch.estado === 'transporte_asignado' ? 'Transporte Asignado' :
                           dispatch.estado}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-sm text-center w-32">
                        {(dispatch.estado === 'Generado' || dispatch.estado === 'planificado' || dispatch.estado === 'pendiente_transporte') && !dispatch.transporte_data ? (
                          <button
                            type="button"
                            onClick={() => handleAssignTransport(dispatch)}
                            className="px-2 py-1 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs transition-all duration-200 hover:shadow-lg hover:scale-105"
                            title={`Asignar transporte a ${dispatch.pedido_id} - ${dispatch.origen} → ${dispatch.destino}`}
                          >
                            🚛 Asignar Transporte
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => router.push(`/despachos/${dispatch.id}`)}
                            className="px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-white text-xs"
                          >
                            Ver Detalle
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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