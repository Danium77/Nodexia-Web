import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient'; // Ruta relativa

import Header from '../components/layout/Header'; // Ruta relativa
import Sidebar from '../components/layout/Sidebar'; // Ruta relativa
import OfferDispatchModal from '../components/Modals/OfferDispatchModal'; // Ruta relativa
import ConfirmModal from '../components/Modals/ConfirmModal';

interface FormDispatchRow {
  tempId: number;
  pedido_id: string;
  origen: string;
  destino: string;
  carga_type: string;
  fecha: string;
  hora: string;
  prioridad: string;
  unidad_type: string;
  comentarios: string;
}

interface GeneratedDispatch {
  id: string;
  pedido_id: string;
  origen: string;
  destino: string;
  carga_type: string;
  fecha: string; 
  hora: string; 
  prioridad: string;
  unidad_type: string; 
  comentarios: string;
  transporte_data?: { nombre: string };
  estado: string;
}

interface Transport {
  id: string;
  nombre: string;
}

const CrearDespacho = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState<string>(''); 
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formRows, setFormRows] = useState<FormDispatchRow[]>([
    {
      tempId: 1,
      pedido_id: '',
      origen: '',
      destino: '',
      carga_type: '',
      fecha: '',
      hora: '',
      prioridad: 'Media',
      unidad_type: '',
      comentarios: '',
    },
  ]);

  const [generatedDispatches, setGeneratedDispatches] = useState<GeneratedDispatch[]>([]);
  const [loadingGenerated, setLoadingGenerated] = useState(true);

  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [selectedDispatchIdToOffer, setSelectedDispatchIdToOffer] = useState<string | null>(null);
  const [availableTransports, setAvailableTransports] = useState<Transport[]>([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState<{ type: 'delete'; id: string } | null>(null);


  const fetchGeneratedDispatches = useCallback(async (userId: string) => { 
        console.log('DEBUG [CrearDespacho]: fetchGeneratedDispatches iniciado para userId:', userId);
        setLoadingGenerated(true);

        if (!userId) { 
            console.log('DEBUG [CrearDespacho]: fetchGeneratedDispatches - userId no válido, saltando fetch.');
            setLoadingGenerated(false);
            return;
        }

        console.log('DEBUG [CrearDespacho]: user.id para fetch:', userId);

        const { data, error } = await supabase
            .from('despachos')
            .select(`
                id,
                pedido_id,
                origen,
                destino,
                estado,
                scheduled_at,
                comentarios,
                type, 
                prioridad,
                unidad_type, 
                transporte_data:transportes!despachos_transporte_id_fkey(nombre)
            `)
            .eq('created_by', userId)
            .order('scheduled_at', { ascending: false });

        if (error) {
            console.error('DEBUG [CrearDespacho]: Error al cargar despachos generados:', error.message);
        } else {
            console.log('DEBUG [CrearDespacho]: Despachos generados cargados:', data);
  const mappedData: GeneratedDispatch[] = data.map(d => {
        // Prefer explicitly stored local values if available (backfilled by migration)
        const dd: any = d;
        const fechaLocal = dd.scheduled_local_date || (dd.scheduled_at ? (() => { const s=new Date(dd.scheduled_at); return `${s.getFullYear()}-${String(s.getMonth()+1).padStart(2,'0')}-${String(s.getDate()).padStart(2,'0')}` })() : 'N/A');
        const horaLocal = dd.scheduled_local_time || (dd.scheduled_at ? (() => { const s=new Date(dd.scheduled_at); return s.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}); })() : 'N/A');
        return {
          id: d.id,
          pedido_id: d.pedido_id,
          origen: d.origen,
          destino: d.destino,
          carga_type: d.type || 'N/A',
          fecha: fechaLocal,
          hora: horaLocal,
          prioridad: d.prioridad,
          unidad_type: (dd).unidad_type || 'N/A', 
          comentarios: dd.comentarios,
          transporte_data: Array.isArray(dd.transporte_data) ? dd.transporte_data[0] : dd.transporte_data,
          estado: dd.estado,
        };
      });
            setGeneratedDispatches(mappedData);
        }
        setLoadingGenerated(false);
    }, []);

  const fetchAvailableTransports = useCallback(async () => {
    const { data, error } = await supabase
      .from('transportes')
      .select('id, nombre')
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error al cargar transportes:', error.message);
    } else {
      setAvailableTransports(data as Transport[]);
      console.log('Transportes disponibles cargados:', data);
    }
  }, []);

  // Helper: verify ownership of a dispatch row
  const checkOwnership = useCallback(async (dispatchId: string) => {
    try {
      const { data, error } = await supabase.from('despachos').select('created_by').eq('id', dispatchId).single();
      if (error) return { ok: false, error };
      return { ok: true, ownerId: data?.created_by };
    } catch (err: any) {
      return { ok: false, error: err };
    }
  }, []);

  useEffect(() => {
    console.log('DEBUG [CrearDespacho]: useEffect principal iniciado.');
    const checkUser = async () => {
      console.log('DEBUG [CrearDespacho]: checkUser iniciado.');
      const { data: { user: currentUserData }, error } = await supabase.auth.getUser();
      console.log('DEBUG [CrearDespacho]: supabase.auth.getUser() resultado:', { user: currentUserData, error });
      
      if (error || !currentUserData || !currentUserData.id) {
        console.log('DEBUG [CrearDespacho]: Usuario no autenticado o ID no válido, redirigiendo a login.');
        router.push('/login');
      } else {
        console.log('DEBUG [CrearDespacho]: Usuario autenticado con ID:', currentUserData.id);
        
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('nombre_completo')
          .eq('id', currentUserData.id)
          .single();

        if (userError || !userData || !userData.nombre_completo) {
          console.error("DEBUG [CrearDespacho]: Error o nombre completo no encontrado para el usuario:", userError?.message || "Nombre no definido en DB.");
          setUserName(currentUserData.email?.split('@')[0] || 'Usuario');
        } else {
          setUserName(userData.nombre_completo);
        }
        setUser(currentUserData); 
        console.log('DEBUG [CrearDespacho]: Usuario seteado y nombre obtenido:', currentUserData.email);
        
        fetchGeneratedDispatches(currentUserData.id);
        fetchAvailableTransports();
      }
    };

    checkUser();

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('DEBUG [CrearDespacho]: onAuthStateChange event:', event, 'session:', session);
        if (event === 'SIGNED_OUT') {
          router.push('/login');
        } else if (session && session.user && session.user.id) {
          const currentUserName = session.user.user_metadata?.nombre_completo || session.user.email?.split('@')[0] || 'Usuario';
          setUserName(currentUserName);
          setUser(session.user);
          fetchGeneratedDispatches(session.user.id);
          fetchAvailableTransports();
        }
      }
    );

    return () => {
      authListener?.unsubscribe();
    };
  }, [router, fetchGeneratedDispatches, fetchAvailableTransports]);


  const handleAddRow = () => {
    setFormRows([
      ...formRows,
      {
        tempId: formRows.length > 0 ? Math.max(...formRows.map(row => row.tempId)) + 1 : 1,
        pedido_id: '',
        origen: '',
        destino: '',
        carga_type: '',
        fecha: '',
        hora: '',
        prioridad: 'Media',
        unidad_type: '',
        comentarios: '',
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

  const handleSaveRow = async (rowToSave: FormDispatchRow, originalIndex: number) => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (!user) {
      setErrorMsg('Usuario no autenticado.');
      setLoading(false);
      return;
    }
    
    if (!rowToSave.origen || !rowToSave.destino || !rowToSave.fecha || !rowToSave.hora) {
        setErrorMsg('Por favor, completa los campos obligatorios (Origen, Destino, Fecha, Hora).');
        setLoading(false);
        return;
    }

    try {
      // Construir la fecha/hora local y guardarla como ISO UTC (toISOString)
      // Para evitar desfases por zona horaria al leer desde la base.
      const localScheduled = new Date(`${rowToSave.fecha}T${rowToSave.hora}:00`);
      const scheduledAtISO = localScheduled.toISOString();

      const dispatchDataToInsert = {
        pedido_id: rowToSave.pedido_id || `PED-${Date.now()}`,
        origen: rowToSave.origen,
        destino: rowToSave.destino,
        estado: 'Generado',
        scheduled_at: scheduledAtISO,
        // store local date/time for easy querying and display
        scheduled_local_date: localScheduled ? `${localScheduled.getFullYear()}-${String(localScheduled.getMonth()+1).padStart(2,'0')}-${String(localScheduled.getDate()).padStart(2,'0')}` : null,
        scheduled_local_time: localScheduled ? `${String(localScheduled.getHours()).padStart(2,'0')}:${String(localScheduled.getMinutes()).padStart(2,'0')}:00` : null,
        created_by: user.id,
        transport_id: null,
        driver_id: null,
        type: rowToSave.carga_type === 'recepcion' ? 'recepcion' : 'despacho',
        comentarios: rowToSave.comentarios,
        prioridad: rowToSave.prioridad,
        unidad_type: rowToSave.unidad_type, // Asegúrate de que esta columna exista en tu DB
      };

      console.log('DEBUG [CrearDespacho]: Intentando guardar despacho:', dispatchDataToInsert);
      const { data, error } = await supabase
        .from('despachos')
        .insert([dispatchDataToInsert])
        .select(`
            id,
            pedido_id,
            origen,
            destino,
            estado,
            scheduled_at,
            comentarios,
            type, 
            prioridad,
            unidad_type, 
            transporte_data:transportes!despachos_transporte_id_fkey(nombre)
        `);

      if (error) {
        console.error('DEBUG [CrearDespacho]: Error al guardar despacho:', error);
        setErrorMsg('Error al guardar despacho: ' + error.message);
      } else {
        console.log('DEBUG [CrearDespacho]: Despacho guardado con éxito:', data);
        setSuccessMsg(`Despacho "${dispatchDataToInsert.pedido_id}" guardado.`);
        
        await fetchGeneratedDispatches(user.id); 

        setFormRows(prevRows => prevRows.filter(row => row.tempId !== rowToSave.tempId));
        if (formRows.length === 1 && formRows[0].tempId === rowToSave.tempId) { 
             setFormRows([
                { tempId: 1, pedido_id: '', origen: '', destino: '', carga_type: '', fecha: '', hora: '', prioridad: 'Media', unidad_type: '', comentarios: '' },
             ]);
        }
      }
    } catch (err: any) {
      console.error('DEBUG [CrearDespacho]: Error inesperado en handleSaveRow:', err);
      setErrorMsg('Ocurrió un error inesperado: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para abrir el modal de oferta
  const handleOpenOfferModal = (dispatchId: string) => {
    console.log('DEBUG: handleOpenOfferModal llamado para despacho ID:', dispatchId); // DEBUG
    setSelectedDispatchIdToOffer(dispatchId);
    setIsOfferModalOpen(true);
  };

  // Función para cerrar el modal de oferta
  const handleCloseOfferModal = () => {
    console.log('DEBUG: handleCloseOfferModal llamado.'); // DEBUG
    setIsOfferModalOpen(false);
    setSelectedDispatchIdToOffer(null);
  };

  // Función para confirmar la oferta desde el modal (lógica de negocio futura)
  const handleConfirmOffer = async (dispatchId: string, selectedTransportId: string, offerType: 'priority' | 'direct') => {
    console.log(`DEBUG: Confirmando oferta para despacho ${dispatchId} a transporte ${selectedTransportId} (${offerType})`); // DEBUG
    
    // Verify ownership first
    if (!user || !user.id) return { success: false, error: 'Usuario no autenticado' };
    const ownerCheck = await checkOwnership(dispatchId);
    if (!ownerCheck.ok) {
      const errMsg = 'No se pudo verificar propietario: ' + (ownerCheck.error?.message || String(ownerCheck.error));
      console.error(errMsg);
      setErrorMsg(errMsg);
      return { success: false, error: errMsg };
    }
    if (ownerCheck.ownerId !== user.id) {
      const errMsg = 'No tienes permisos para ofrecer este despacho (no eres el creador)';
      console.warn(errMsg, { owner: ownerCheck.ownerId, me: user.id });
      setErrorMsg(errMsg);
      return { success: false, error: errMsg };
    }

    try {
      const { error } = await supabase
        .from('despachos')
        .update({ transport_id: selectedTransportId, estado: 'Ofrecido' })
        .eq('id', dispatchId);

      if (error) {
        console.error('Error al confirmar oferta:', error.message);
        setErrorMsg(error.message);
        return { success: false, error: error.message };
      }

      await fetchGeneratedDispatches(user.id);
      setSuccessMsg('Oferta confirmada.');
      return { success: true };
    } catch (err: any) {
      console.error('Excepción al confirmar oferta:', err);
      const m = err?.message || 'Error desconocido';
      setErrorMsg(m);
      return { success: false, error: m };
    }
  };


  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0e1a2d] text-slate-100">
        Cargando...
      </div>
    );
  }

    function handleOfferDispatch(id: string): void {
        handleOpenOfferModal(id);
    }

  return (
    <div className="flex min-h-screen bg-[#0e1a2d]">
      <Sidebar userEmail={user.email} userName={userName} />
      <div className="flex-1 flex flex-col">
        <Header userEmail={user.email} userName={userName} pageTitle="Despachos" />
        <main className="flex-1 p-6">
          <h3 className="text-xl font-semibold mb-4 text-cyan-400">Cargar nuevos despachos</h3>

          {errorMsg && <p className="text-red-400 mb-4">{errorMsg}</p>}
          {successMsg && <p className="text-green-400 mb-4">{successMsg}</p>}

          <form onSubmit={(e) => e.preventDefault()}>
            <div className="w-full overflow-x-auto bg-[#1b273b] p-4 rounded-lg shadow-lg mb-6">
              <table className="min-w-[1000px] divide-y divide-gray-700">
                <thead className="bg-[#0e1a2d]">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">#</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Pedido ID</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Origen</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Destino</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Tipo Carga</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Fecha</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Hora</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Prioridad</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Tipo Unidad</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Comentarios</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700 text-slate-200">
                  {formRows.map((row, index) => (
                    <tr key={row.tempId}>
                      <td className="px-2 py-3 whitespace-nowrap text-sm">{index + 1}</td>
                      <td className="px-2 py-3">
                        <input
                          type="text"
                          value={row.pedido_id}
                          onChange={(e) => handleRowChange(row.tempId, 'pedido_id', e.target.value)}
                          className="w-24 bg-[#0e1a2d] border border-gray-600 rounded-md px-1 py-1 text-sm focus:ring-cyan-500 focus:border-cyan-500"
                        />
                      </td>
                      <td className="px-2 py-3">
                        <input
                          type="text"
                          value={row.origen}
                          onChange={(e) => handleRowChange(row.tempId, 'origen', e.target.value)}
                          className="w-28 bg-[#0e1a2d] border border-gray-600 rounded-md px-1 py-1 text-sm focus:ring-cyan-500 focus:border-cyan-500"
                        />
                      </td>
                      <td className="px-2 py-3">
                        <input
                          type="text"
                          value={row.destino}
                          onChange={(e) => handleRowChange(row.tempId, 'destino', e.target.value)}
                          className="w-28 bg-[#0e1a2d] border border-gray-600 rounded-md px-1 py-1 text-sm focus:ring-cyan-500 focus:border-cyan-500"
                        />
                      </td>
                      <td className="px-2 py-3">
                        <select
                          value={row.carga_type}
                          onChange={(e) => handleRowChange(row.tempId, 'carga_type', e.target.value)}
                          className="w-24 bg-[#0e1a2d] border border-gray-600 rounded-md px-2 py-1 text-sm focus:ring-cyan-500 focus:border-cyan-500"
                        >
                          <option value="">Sel.</option>
                          <option value="despacho">Despacho</option>
                          <option value="paletizada">Paletizada</option>
                          <option value="granel">Granel</option>
                        </select>
                      </td>
                      <td className="px-2 py-3">
                        <input
                          type="date"
                          value={row.fecha}
                          onChange={(e) => handleRowChange(row.tempId, 'fecha', e.target.value)}
                          className="w-28 bg-[#0e1a2d] border border-gray-600 rounded-md px-1 py-1 text-sm focus:ring-cyan-500 focus:border-cyan-500"
                        />
                      </td>
                      <td className="px-2 py-3">
                        <input
                          type="time"
                          value={row.hora}
                          onChange={(e) => handleRowChange(row.tempId, 'hora', e.target.value)}
                          className="w-20 bg-[#0e1a2d] border border-gray-600 rounded-md px-1 py-1 text-sm focus:ring-cyan-500 focus:border-cyan-500"
                        />
                      </td>
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
                      <td className="px-2 py-3">
                        <input
                          type="text"
                          value={row.comentarios}
                          onChange={(e) => handleRowChange(row.tempId, 'comentarios', e.target.value)}
                          className="w-32 bg-[#0e1a2d] border border-gray-600 rounded-md px-1 py-1 text-sm focus:ring-cyan-500 focus:border-cyan-500"
                        />
                      </td>
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
                - Eliminar fila
              </button>
            </div>
          </form>

          <h3 className="text-xl font-semibold mt-8 mb-4 text-cyan-400">Despachos Generados</h3>
          <div className="w-full overflow-x-auto bg-[#1b273b] p-4 rounded-lg shadow-lg">
            <table className="min-w-[1000px] divide-y divide-gray-700">
              <thead className="bg-[#0e1a2d]">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Fecha</th> {/* CAMBIO: Fecha primero */}
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Hora</th> {/* CAMBIO: Hora segundo */}
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Origen</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Destino</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Tipo Carga</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Prioridad</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Unidad</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Comentarios</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Transporte</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700 text-slate-200">
                {generatedDispatches.length === 0 ? (
                    <tr>
                        <td colSpan={11} className="px-4 py-4 text-center text-slate-400"> {/* Colspan ajustado a 11 */}
                            {loadingGenerated ? "Cargando despachos generados..." : "No hay despachos generados para mostrar."}
                        </td>
                    </tr>
                ) : (
          generatedDispatches.map(dispatch => (
            <tr key={dispatch.id}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">{dispatch.fecha}</td> {/* CAMBIO: Fecha aquí */}
                            <td className="px-4 py-3 whitespace-nowrap text-sm">{dispatch.hora}</td> {/* CAMBIO: Hora aquí */}
                            <td className="px-4 py-3 whitespace-nowrap text-sm">{dispatch.origen}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">{dispatch.destino}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">{dispatch.carga_type}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">{dispatch.prioridad}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">{dispatch.unidad_type}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">{dispatch.comentarios}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">{dispatch.transporte_data?.nombre || 'Pendiente'}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">{dispatch.estado}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center flex items-center justify-center gap-2">
                                {dispatch.estado === 'Generado' ? (
                                    <button
                                      type="button"
                                      onClick={() => handleOfferDispatch(dispatch.id)}
                                      className="px-3 py-1 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs transition-colors duration-200"
                                    >
                                      Ofrecer
                                    </button>
                                ) : (
                                    <>
                                      <span className="px-2 py-1 rounded-full text-xs bg-green-700 text-white">Ofrecido</span>
                                      <button
                                        type="button"
                                        onClick={() => router.push(`/despachos/${dispatch.id}`)}
                                        className="px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-white text-xs"
                                      >
                                        Ver detalle
                                      </button>
                                    </>
                                )}

                                {/* Botón eliminar por fila (abre modal de confirmación) */}
                                  <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmPayload({ type: 'delete', id: dispatch.id });
                                    setIsConfirmModalOpen(true);
                                  }}
                                  className="px-2 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs"
                                >Eliminar
                                </button>
                            </td>
                        </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          {/* Offer modal (rendered once) */}
          <OfferDispatchModal
            isOpen={isOfferModalOpen}
            onClose={handleCloseOfferModal}
            dispatchId={selectedDispatchIdToOffer}
            onConfirmOffer={handleConfirmOffer}
            availableTransports={availableTransports}
          />

          {/* Confirm modal for deletions */}
          <ConfirmModal
            isOpen={isConfirmModalOpen}
            title="Eliminar despacho"
            message="¿Eliminar este despacho? Esta acción no se puede deshacer."
            confirmLabel="Eliminar"
            cancelLabel="Cancelar"
            onCancel={() => { setIsConfirmModalOpen(false); setConfirmPayload(null); }}
            onConfirm={async () => {
              if (!confirmPayload) return;
              if (confirmPayload.type === 'delete') {
                // Verify ownership before attempting delete
                if (!user || !user.id) {
                  setErrorMsg('Usuario no autenticado.');
                  setIsConfirmModalOpen(false);
                  setConfirmPayload(null);
                  return;
                }
                const ownerCheck = await checkOwnership(confirmPayload.id);
                if (!ownerCheck.ok) {
                  const errMsg = 'No se pudo verificar propietario: ' + (ownerCheck.error?.message || String(ownerCheck.error));
                  setErrorMsg(errMsg);
                  setIsConfirmModalOpen(false);
                  setConfirmPayload(null);
                  return;
                }
                if (ownerCheck.ownerId !== user.id) {
                  const errMsg = 'No tienes permisos para eliminar este despacho (no eres el creador). Propietario actual: ' + ownerCheck.ownerId;
                  setErrorMsg(errMsg);
                  setIsConfirmModalOpen(false);
                  setConfirmPayload(null);
                  return;
                }

                const { error, data: deleteData } = await supabase.from('despachos').delete().eq('id', confirmPayload.id).select('id');
                if (error) {
                  setErrorMsg('Error al eliminar despacho: ' + error.message);
                  console.error('Delete error', error);
                } else {
                  console.log('Delete result', deleteData);
                  // Verify that the row no longer exists
                  const { data: verifyData, error: verifyError } = await supabase.from('despachos').select('id, created_by').eq('id', confirmPayload.id).single();
                  if (verifyError && verifyError.code === 'PGRST116') {
                    // PostgREST codes: PGRST116 = No rows found? fallback to success
                    // If PostgREST returns no rows, interpret as deleted
                    await fetchGeneratedDispatches(user.id);
                    setSuccessMsg('Despacho eliminado.');
                  } else if (verifyError && !verifyData) {
                    // no data means deleted
                    await fetchGeneratedDispatches(user.id);
                    setSuccessMsg('Despacho eliminado.');
                  } else if (verifyData && verifyData.id) {
                    // Row still present
                    const msg = 'El despacho parece seguir presente después del DELETE (id=' + confirmPayload.id + '). created_by=' + (verifyData.created_by || 'NULL');
                    console.warn(msg, { verifyData });
                    setErrorMsg(msg + ' Revisa RLS/políticas o la columna created_by.');
                    // still refresh to ensure server data reflected
                    await fetchGeneratedDispatches(user.id);
                  } else {
                    // Fallback success
                    await fetchGeneratedDispatches(user.id);
                    setSuccessMsg('Despacho eliminado.');
                  }
                }
              }
              setIsConfirmModalOpen(false);
              setConfirmPayload(null);
            }}
          />

        </main>
      </div>
    </div>
  );
};

export default CrearDespacho;