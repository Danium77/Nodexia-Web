import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabaseClient';

interface Planta {
  id: string;
  nombre: string;
  cuit: string;
  direccion: string;
  localidad: string;
  provincia: string;
  ubicacion: string;
  telefono: string;
  tipo: string; // planta, deposito, sucursal, etc.
  documentacion: string[];
}

const PlantasPage = () => {
  const router = useRouter();
  const [filtro, setFiltro] = useState('');
  const [plantas, setPlantas] = useState<Planta[]>([]);
  const [cuitInput, setCuitInput] = useState('');
  const [nuevaPlanta, setNuevaPlanta] = useState<Planta | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);

  // Cargar plantas asociadas al coordinador
  useEffect(() => {
    cargarPlantasAsociadas();
  }, []);

  const cargarPlantasAsociadas = async () => {
    try {
      // Obtener el usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener la empresa del usuario coordinador
      const { data: usuarioEmpresa, error: userError } = await supabase
        .from('usuarios_empresa')
        .select('empresa_id')
        .eq('user_id', user.id)
        .eq('activo', true)
        .single();

      if (userError || !usuarioEmpresa) {
        console.error('Error al obtener empresa del usuario:', userError);
        return;
      }

      // Obtener plantas asociadas (empresas tipo coordinador que son plantas)
      // Usaremos el campo configuracion_empresa para distinguir plantas
      const { data: relaciones, error: relacionesError } = await supabase
        .from('relaciones_empresa')
        .select(`
          empresa_relacionada:empresas!empresa_transporte_id(
            id,
            nombre,
            cuit,
            direccion,
            localidad,
            provincia,
            telefono,
            configuracion_empresa
          )
        `)
        .eq('empresa_coordinadora_id', usuarioEmpresa.empresa_id)
        .eq('estado', 'activa')
        .eq('activo', true);

      if (relacionesError) {
        console.error('Error al cargar plantas asociadas:', relacionesError);
        return;
      }

      // Filtrar solo las empresas que son plantas (por configuración)
      const plantasAsociadas = (relaciones || [])
        .map(relacion => relacion.empresa_relacionada)
        .filter(Boolean)
        .filter((empresa: any) => {
          // Filtrar solo plantas por configuración específica
          return empresa.configuracion_empresa?.tipo_instalacion === 'planta';
        })
        .map((empresa: any) => ({
          id: empresa.id,
          nombre: empresa.nombre,
          cuit: empresa.cuit || '',
          direccion: empresa.direccion || '',
          localidad: empresa.localidad || '',
          provincia: empresa.provincia || '',
          ubicacion: `${empresa.localidad || ''}, ${empresa.provincia || ''}`.replace(/^, |, $/, ''),
          telefono: empresa.telefono || '',
          tipo: empresa.configuracion_empresa?.tipo_instalacion || 'planta',
          documentacion: [] // Por ahora array vacío, se puede expandir luego
        }));

      console.log('Plantas asociadas cargadas:', plantasAsociadas);
      setPlantas(plantasAsociadas);

    } catch (error) {
      console.error('Error al cargar plantas asociadas:', error);
    }
  };

  // Buscar planta por CUIT en la red Nodexia
  const buscarPlantaPorCuit = async () => {
    setMensaje('');
    setNuevaPlanta(null);
    setLoading(true);
    
    try {
      if (!cuitInput.trim()) {
        setMensaje('Ingrese un CUIT válido');
        return;
      }

      // Buscar empresa tipo coordinador con configuración de planta (búsqueda flexible)
      const cuitLimpio = cuitInput.trim();
      
      const { data: plantaEncontrada, error } = await supabase
        .from('empresas')
        .select('*')
        .or(`cuit.eq.${cuitLimpio},cuit.like.${cuitLimpio}%`)
        .eq('tipo_empresa', 'coordinador')
        .single();

      if (error || !plantaEncontrada) {
        setMensaje('La planta/depósito no existe en la red Nodexia. Debe registrarse antes de poder asociarla.');
        return;
      }

      // Verificar que sea efectivamente una planta
      const esPlanta = plantaEncontrada.configuracion_empresa?.tipo_instalacion === 'planta';
      
      if (!esPlanta) {
        setMensaje('La empresa encontrada no es una planta o depósito.');
        return;
      }

      // Verificar si ya está asociada
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuarioEmpresa } = await supabase
        .from('usuarios_empresa')
        .select('empresa_id')
        .eq('user_id', user.id)
        .eq('activo', true)
        .single();

      if (!usuarioEmpresa) {
        setMensaje('Error: No se pudo obtener la empresa del usuario');
        return;
      }

      const { data: relacionExiste } = await supabase
        .from('relaciones_empresa')
        .select('id')
        .eq('empresa_coordinadora_id', usuarioEmpresa.empresa_id)
        .eq('empresa_transporte_id', plantaEncontrada.id)
        .eq('estado', 'activa')
        .single();

      if (relacionExiste) {
        setMensaje('Esta planta ya está asociada a tu empresa.');
        return;
      }

      // Configurar planta encontrada
      setNuevaPlanta({
        id: plantaEncontrada.id,
        nombre: plantaEncontrada.nombre,
        cuit: plantaEncontrada.cuit || '',
        direccion: plantaEncontrada.direccion || '',
        localidad: plantaEncontrada.localidad || '',
        provincia: plantaEncontrada.provincia || '',
        ubicacion: `${plantaEncontrada.localidad || ''}, ${plantaEncontrada.provincia || ''}`.replace(/^, |, $/, ''),
        telefono: plantaEncontrada.telefono || '',
        tipo: plantaEncontrada.configuracion_empresa?.categoria || 'planta',
        documentacion: []
      });

      setMensaje('Planta encontrada. Puede proceder a asociarla.');

    } catch (error) {
      console.error('Error buscando planta:', error);
      setMensaje('Error al buscar la planta. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Asociar planta existente
  const asociarPlanta = async () => {
    if (!nuevaPlanta) return;
    
    try {
      setLoading(true);
      
      // Obtener el usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMensaje('Error: Usuario no autenticado');
        return;
      }

      // Obtener la empresa del usuario coordinador
      const { data: usuarioEmpresa, error: userError } = await supabase
        .from('usuarios_empresa')
        .select('empresa_id')
        .eq('user_id', user.id)
        .eq('activo', true)
        .single();

      if (userError || !usuarioEmpresa) {
        setMensaje('Error: No se pudo obtener la empresa del usuario');
        return;
      }

      // Crear la relación
      const { error: relacionError } = await supabase
        .from('relaciones_empresa')
        .insert({
          empresa_coordinadora_id: usuarioEmpresa.empresa_id,
          empresa_transporte_id: nuevaPlanta.id,
          estado: 'activa',
          fecha_inicio: new Date().toISOString().split('T')[0],
          activo: true
        })
        .select()
        .single();

      if (relacionError) {
        setMensaje('Error al crear la relación: ' + relacionError.message);
        return;
      }

      setMensaje('Planta asociada correctamente.');
      // Recargar la lista de plantas asociadas
      await cargarPlantasAsociadas();
      setNuevaPlanta(null);
      setCuitInput('');

    } catch (error) {
      console.error('Error al asociar planta:', error);
      setMensaje('Error inesperado al asociar la planta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout pageTitle="Gestión de Plantas y Depósitos">
      <button
        className="mb-6 flex items-center text-green-400 hover:text-green-200 font-semibold"
        onClick={() => router.push('/configuracion')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Volver
      </button>
      <div className="bg-gray-800 rounded shadow-md p-2 mb-2">
        <h2 className="text-2xl font-bold text-green-400 mb-4">Plantas y Depósitos</h2>
        <div className="mb-4 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-gray-300 mb-1">Filtrar por nombre o CUIT</label>
            <input
              type="text"
              className="w-full rounded px-3 py-2 bg-gray-900 text-white"
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              placeholder="Buscar..."
            />
          </div>
          <div className="flex-1">
            <label className="block text-gray-300 mb-1">Agregar planta/deposito por CUIT</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="rounded px-3 py-2 bg-gray-900 text-white flex-1"
                value={cuitInput}
                onChange={e => setCuitInput(e.target.value)}
                placeholder="CUIT"
                maxLength={11}
              />
              <button
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                onClick={buscarPlantaPorCuit}
                disabled={loading || !cuitInput.trim()}
              >Buscar</button>
            </div>
          </div>
        </div>
        {mensaje && <div className="my-2 text-yellow-400">{mensaje}</div>}
        {nuevaPlanta && (
          <div className="bg-gray-900 rounded p-4 mt-4">
            <h3 className="text-lg font-bold text-green-300 mb-2">Datos de la planta/deposito encontrada</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-white">
              <div><strong>Nombre:</strong> {nuevaPlanta.nombre}</div>
              <div><strong>CUIT:</strong> {nuevaPlanta.cuit}</div>
              <div><strong>Dirección:</strong> {nuevaPlanta.direccion}</div>
              <div><strong>Localidad:</strong> {nuevaPlanta.localidad}</div>
              <div><strong>Provincia:</strong> {nuevaPlanta.provincia}</div>
              <div><strong>Ubicación:</strong> {nuevaPlanta.ubicacion}</div>
              <div><strong>Teléfono:</strong> {nuevaPlanta.telefono}</div>
              <div><strong>Tipo:</strong> {nuevaPlanta.tipo}</div>
              <div className="col-span-2"><strong>Documentación:</strong> {nuevaPlanta.documentacion?.length > 0 ? nuevaPlanta.documentacion.join(', ') : 'Sin documentación'}</div>
            </div>
            <button
              className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              onClick={asociarPlanta}
            >Asociar a mi lista</button>
          </div>
        )}
      </div>
      <div className="bg-gray-800 rounded shadow-md p-2">
        <h3 className="text-xl font-bold text-green-300 mb-4">Mis plantas y depósitos asociados</h3>
        {plantas.length === 0 ? (
          <div className="text-gray-400">No tienes plantas ni depósitos asociados aún.</div>
        ) : (
          <table className="w-full text-white">
            <thead>
              <tr className="bg-gray-900">
                <th className="p-2">Nombre</th>
                <th className="p-2">CUIT</th>
                <th className="p-2">Dirección</th>
                <th className="p-2">Localidad</th>
                <th className="p-2">Provincia</th>
                <th className="p-2">Teléfono</th>
                <th className="p-2">Tipo</th>
                <th className="p-2">Documentación</th>
                <th className="p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {plantas.filter(p =>
                p.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
                p.cuit.includes(filtro)
              ).map(p => (
                <tr key={p.id} className="border-b border-gray-700">
                  <td className="p-2">{p.nombre}</td>
                  <td className="p-2">{p.cuit}</td>
                  <td className="p-2">{p.direccion}</td>
                  <td className="p-2">{p.localidad}</td>
                  <td className="p-2">{p.provincia}</td>
                  <td className="p-2">{p.telefono}</td>
                  <td className="p-2">{p.tipo}</td>
                  <td className="p-2">{p.documentacion?.length > 0 ? p.documentacion.join(', ') : 'Sin documentación'}</td>
                  <td className="p-2">
                    <button
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                      onClick={() => router.push(`/configuracion/plantas/${p.id}`)}
                    >
                      Gestionar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
};

export default PlantasPage;
