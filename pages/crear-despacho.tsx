import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient'; // Ruta relativa

import Header from '../components/layout/Header'; // Ruta relativa
import Sidebar from '../components/layout/Sidebar'; // Ruta relativa
import OfferDispatchModal from '../components/Modals/OfferDispatchModal'; // Ruta relativa

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
            const mappedData: GeneratedDispatch[] = data.map(d => ({
                id: d.id,
                pedido_id: d.pedido_id,
                origen: d.origen,
                destino: d.destino,
                carga_type: d.type || 'N/A',
                fecha: d.scheduled_at ? d.scheduled_at.split('T')[0] : 'N/A',
                hora: d.scheduled_at ? d.scheduled_at.split('T')[1].substring(0, 5) : 'N/A',
                prioridad: d.prioridad,
                unidad_type: (d as any).unidad_type || 'N/A', 
                comentarios: d.comentarios,
                transporte_data: Array.isArray(d.transporte_data) ? d.transporte_data[0] : d.transporte_data,
                estado: d.estado,
            }));
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
      const dispatchDataToInsert = {
        pedido_id: rowToSave.pedido_id || `PED-${Date.now()}`,
        origen: rowToSave.origen,
        destino: rowToSave.destino,
        estado: 'Generado',
        scheduled_at: `${rowToSave.fecha}T${rowToSave.hora}:00`,
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
    
    await supabase
      .from('despachos')
      .update({
        transport_id: selectedTransportId,
        estado: 'Ofrecido' 
      })
      .eq('id', dispatchId);

    await fetchGeneratedDispatches(user.id); 
    alert('Oferta confirmada (simulado).');
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
                          <option value="recepcion">Recepción</option>
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
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                {dispatch.estado === 'Generado' ? (
                                    <button
                                      type="button"
                                      onClick={() => handleOfferDispatch(dispatch.id)}
                                      className="px-3 py-1 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs transition-colors duration-200"
                                    >
                                      Ofrecer
                                    </button>
                                ) : (
                                    <span className="text-slate-400">Ver</span> // O un botón de ver detalle
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
    </div>
  );
};

export default CrearDespacho;