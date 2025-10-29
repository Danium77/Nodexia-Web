import React, { useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import {
  DocumentArrowUpIcon,
  XMarkIcon,
  CheckCircleIcon,
  PhotoIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface UploadRemitoFormProps {
  viajeId: string;
  onSuccess: () => void;
}

const TIPOS_DOCUMENTO = [
  { value: 'remito', label: 'Remito', icon: DocumentTextIcon },
  { value: 'comprobante', label: 'Comprobante', icon: DocumentTextIcon },
  { value: 'foto_carga', label: 'Foto de Carga', icon: PhotoIcon },
  { value: 'foto_descarga', label: 'Foto de Descarga', icon: PhotoIcon },
  { value: 'firma', label: 'Firma', icon: PhotoIcon },
  { value: 'otro', label: 'Otro', icon: DocumentTextIcon }
];

const UploadRemitoForm: React.FC<UploadRemitoFormProps> = ({ viajeId, onSuccess }) => {
  const { user } = useUserRole();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [tipo, setTipo] = useState('remito');
  const [descripcion, setDescripcion] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validar tamaño (máximo 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      alert('El archivo es demasiado grande. Máximo 10MB');
      return;
    }

    // Validar tipo
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf'
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      alert('Tipo de archivo no permitido. Solo imágenes (JPG, PNG, GIF, WEBP) y PDF');
      return;
    }

    setFile(selectedFile);
    setError('');

    // Generar preview para imágenes
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      alert('Por favor selecciona un archivo');
      return;
    }

    if (!user) {
      alert('Debes estar autenticado para subir archivos');
      return;
    }

    try {
      setUploading(true);
      setError('');
      setUploadProgress(0);

      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${viajeId}/${timestamp}_${tipo}.${fileExt}`;

      // Subir archivo a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('remitos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        // Si el bucket no existe, mostrar instrucción
        if (uploadError.message.includes('not found')) {
          throw new Error(
            'El bucket "remitos" no existe. Por favor ejecuta el script SQL documentos_viaje.sql para crearlo.'
          );
        }
        throw uploadError;
      }

      setUploadProgress(50);

      // Obtener URL pública del archivo
      const { data: urlData } = supabase.storage
        .from('remitos')
        .getPublicUrl(fileName);

      setUploadProgress(75);

      // Guardar registro en la tabla documentos_viaje
      const { error: dbError } = await supabase
        .from('documentos_viaje')
        .insert({
          viaje_id: viajeId,
          tipo,
          nombre_archivo: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user.id,
          descripcion: descripcion || null
        });

      if (dbError) {
        // Si falla, intentar eliminar el archivo subido
        await supabase.storage.from('remitos').remove([fileName]);
        throw dbError;
      }

      setUploadProgress(100);

      alert('✅ Documento subido exitosamente!');
      
      // Resetear formulario
      setFile(null);
      setPreview(null);
      setTipo('remito');
      setDescripcion('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onSuccess();

    } catch (err: any) {
      console.error('Error subiendo documento:', err);
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setPreview(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <form onSubmit={handleUpload} className="space-y-4">
      {/* Selector de tipo de documento */}
      <div>
        <label className="block text-white font-semibold mb-2">
          Tipo de documento *
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {TIPOS_DOCUMENTO.map((tipoDoc) => {
            const Icon = tipoDoc.icon;
            return (
              <button
                key={tipoDoc.value}
                type="button"
                onClick={() => setTipo(tipoDoc.value)}
                className={`p-3 rounded-lg border-2 transition-colors flex items-center justify-center gap-2 ${
                  tipo === tipoDoc.value
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                    : 'border-gray-700 bg-[#0a0e1a] text-gray-400 hover:border-gray-600'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{tipoDoc.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Input de archivo */}
      <div>
        <label className="block text-white font-semibold mb-2">
          Seleccionar archivo *
        </label>
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="flex items-center justify-center gap-3 p-6 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-cyan-500 transition-colors bg-[#0a0e1a]"
          >
            <DocumentArrowUpIcon className="h-8 w-8 text-gray-400" />
            <div className="text-center">
              <p className="text-white font-medium">
                {file ? file.name : 'Click para seleccionar archivo'}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Imágenes (JPG, PNG, GIF, WEBP) o PDF - Máximo 10MB
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Preview */}
      {preview && (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full max-h-64 object-contain rounded-lg border border-gray-700"
          />
          <button
            type="button"
            onClick={handleCancel}
            className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 rounded-full text-white"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {file && !preview && (
        <div className="bg-[#0a0e1a] rounded-lg p-4 border border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="h-8 w-8 text-cyan-400" />
            <div>
              <p className="text-white font-medium">{file.name}</p>
              <p className="text-gray-400 text-sm">
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="text-red-400 hover:text-red-300"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Descripción opcional */}
      <div>
        <label className="block text-white font-semibold mb-2">
          Descripción (opcional)
        </label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Agregar comentarios o notas sobre el documento..."
          rows={3}
          className="w-full px-4 py-2 bg-[#0a0e1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Progress bar */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-400">
            <span>Subiendo...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Botones */}
      <div className="flex gap-3 pt-2">
        {file && !uploading && (
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={!file || uploading}
          className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Subiendo...
            </>
          ) : (
            <>
              <CheckCircleIcon className="h-5 w-5" />
              Subir Documento
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default UploadRemitoForm;
