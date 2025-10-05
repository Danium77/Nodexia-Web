import React, { useRef, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { useUserRole } from '../../lib/contexts/UserRoleContext';


export default function DocumentacionTransporte() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { email, role, loading } = useUserRole();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    setMessage(null);
    
    try {
      const bucket = 'documentacion-general';
      const tipo = 'constancia_inscripcion';
      const entidad = 'transporte';
      
      // Verificar sesión y usuario
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(`Error de sesión: ${sessionError.message}`);
      }
      
      if (!session) {
        throw new Error('No hay sesión activa. Por favor, vuelve a iniciar sesión.');
      }
      
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        throw new Error(`Error obteniendo usuario: ${userError.message}`);
      }
      
      const usuario_subio = userData?.user?.id;
      if (!usuario_subio) {
        throw new Error('No se pudo obtener el ID del usuario.');
      }
      
      const id_entidad = usuario_subio; // Para transporte, el id de entidad es el id del usuario
      const extension = file.name.split('.').pop() || '';
      const nombre_archivo = file.name;
      
      // DEBUG: Mostrar información del usuario
      console.log('DEBUG usuario_subio:', usuario_subio);
      console.log('DEBUG userData:', userData);
      console.log('DEBUG session:', session);
      
      const path = `${entidad}/${id_entidad}/${tipo}/${Date.now()}_${file.name}`;
      
      // Subir archivo a storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true });
        
      if (uploadError) {
        throw new Error(`Error al subir archivo al storage: ${uploadError.message}`);
      }
      
      // Insertar metadatos en la tabla documentos
      const { error: insertError } = await supabase
        .from('documentos')
        .insert([
          {
            bucket,
            path,
            tipo,
            entidad,
            id_entidad,
            nombre_archivo,
            extension,
            usuario_subio,
          },
        ]);
        
      if (insertError) {
        // Si falló la inserción, intentar eliminar el archivo subido
        await supabase.storage.from(bucket).remove([path]);
        throw new Error(`Error al guardar metadatos: ${insertError.message}`);
      }
      
      setMessage('Archivo subido y registrado correctamente.');
      
    } catch (error) {
      console.error('Error en handleUpload:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <AdminLayout pageTitle="Documentación de Transporte">
      <div className="max-w-2xl mx-auto bg-gray-800 rounded-lg shadow-md p-8 mt-8">
        <h2 className="text-xl font-bold text-cyan-400 mb-6">Documentación</h2>
        <div className="flex items-center justify-between mb-4">
          <span className="text-white">Constancia de inscripción</span>
          <>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="application/pdf,image/*"
              onChange={handleUpload}
              disabled={uploading}
            />
            <button
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded text-sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Subiendo...' : 'Subir'}
            </button>
          </>
        </div>
        <p className="text-gray-400 text-sm mb-2">Ejemplo: AFIP, IIBB, etc.</p>
        {message && (
          <div className={`mt-2 text-sm ${message.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>{message}</div>
        )}
      </div>
    </AdminLayout>
  );
}
