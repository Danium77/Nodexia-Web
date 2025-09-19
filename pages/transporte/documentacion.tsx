import React, { useRef, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { useUserContext } from '../../components/context/UserContext';


export default function DocumentacionTransporte() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { email, role, loading } = useUserContext();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    const bucket = 'documentacion-general';
    const tipo = 'constancia_inscripcion';
    const entidad = 'transporte';
    // Forzar refresh de sesión antes de obtener el usuario
    await supabase.auth.getSession();
    const { data: userData } = await supabase.auth.getUser();
    const usuario_subio = userData?.user?.id;
    if (!usuario_subio) {
      setMessage('Error: No hay sesión activa. Por favor, vuelve a iniciar sesión.');
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const id_entidad = usuario_subio; // Para transporte, el id de entidad es el id del usuario
    const extension = file.name.split('.').pop() || '';
    const nombre_archivo = file.name;
  // DEBUG: Mostrar el id del usuario autenticado y el valor que se enviará como usuario_subio
  console.log('DEBUG usuario_subio:', usuario_subio);
  console.log('DEBUG userData:', userData);
    const path = `${entidad}/${id_entidad}/${tipo}/${Date.now()}_${file.name}`;
    // Subir archivo a storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true });
    if (uploadError) {
      setMessage('Error al subir el archivo: ' + uploadError.message);
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
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
      setMessage('Archivo subido pero error al guardar metadatos: ' + insertError.message);
    } else {
      setMessage('Archivo subido y registrado correctamente.');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
