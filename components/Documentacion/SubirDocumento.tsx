// components/Documentacion/SubirDocumento.tsx
// Formulario para subir documentación con drag & drop

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

interface SubirDocumentoProps {
  entidadTipo: 'chofer' | 'camion' | 'acoplado' | 'transporte';
  entidadId: string;
  empresaId: string;
  tiposPermitidos?: string[];
  onUploadSuccess?: () => void;
  onCancel?: () => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

// Tipos de documento según la entidad
const TIPOS_DOCUMENTO: Record<string, { value: string; label: string }[]> = {
  chofer: [
    { value: 'licencia_conducir', label: 'Licencia de Conducir' },
    { value: 'art_clausula_no_repeticion', label: 'ART Cláusula No Repetición' },
    { value: 'seguro_vida_autonomo', label: 'Seguro de Vida Autónomo' },
  ],
  camion: [
    { value: 'seguro', label: 'Seguro' },
    { value: 'rto', label: 'Revisión Técnica Obligatoria (RTO)' },
    { value: 'cedula', label: 'Cédula Verde' },
  ],
  acoplado: [
    { value: 'seguro', label: 'Seguro' },
    { value: 'rto', label: 'Revisión Técnica Obligatoria (RTO)' },
    { value: 'cedula', label: 'Cédula Verde' },
  ],
  transporte: [
    { value: 'seguro_carga_global', label: 'Seguro de Carga Global' },
  ],
};

const TIPOS_ARCHIVO_ACEPTADOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (límite del bucket)

export default function SubirDocumento({
  entidadTipo,
  entidadId,
  empresaId,
  tiposPermitidos,
  onUploadSuccess,
  onCancel,
}: SubirDocumentoProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    tipo_documento: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Obtener tipos de documento disponibles
  const tiposDisponibles = tiposPermitidos
    ? TIPOS_DOCUMENTO[entidadTipo].filter((tipo) => tiposPermitidos.includes(tipo.value))
    : TIPOS_DOCUMENTO[entidadTipo];

  // Validar archivo
  const validarArchivo = (file: File): string | null => {
    if (!TIPOS_ARCHIVO_ACEPTADOS.includes(file.type)) {
      return 'Tipo de archivo no permitido. Solo se aceptan PDF, JPG y PNG.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'El archivo es demasiado grande. El tamaño máximo es 10MB.';
    }
    return null;
  };

  // Manejar selección de archivo
  const handleFileSelect = (file: File) => {
    const error = validarArchivo(file);
    if (error) {
      setErrorMessage(error);
      setUploadState('error');
      return;
    }

    setSelectedFile(file);
    setErrorMessage('');
    setUploadState('idle');

    // Crear preview para imágenes
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  // Eventos de drag & drop
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Manejar selección desde input
  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Limpiar archivo seleccionado
  const handleClearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMessage('');
    setUploadState('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Manejar cambios en el formulario
  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      setErrorMessage('Debe seleccionar un archivo');
      setUploadState('error');
      return;
    }

    if (!formData.tipo_documento) {
      setErrorMessage('Debe seleccionar el tipo de documento');
      setUploadState('error');
      return;
    }

    // Fechas se asignan por admin al validar

    setUploadState('uploading');
    setErrorMessage('');

    try {
      // Crear FormData para enviar archivo
      const data = new FormData();
      data.append('archivo', selectedFile);
      data.append('entidad_tipo', entidadTipo);
      data.append('entidad_id', entidadId);
      data.append('empresa_id', empresaId);
      data.append('tipo_documento', formData.tipo_documento);

      // Obtener token de sesión
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/documentacion/upload', {
        method: 'POST',
        headers: {
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: data,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Error al subir el documento');
      }

      setUploadState('success');
      
      // Resetear formulario después de 2 segundos
      setTimeout(() => {
        handleClearFile();
        setFormData({
          tipo_documento: '',
        });
        setUploadState('idle');
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      }, 2000);
    } catch (error) {
      console.error('Error al subir documento:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Error desconocido');
      setUploadState('error');
    }
  };

  // Formatear tamaño de archivo
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-slate-100 mb-4">
        Subir Documentación
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tipo de documento */}
        <div>
          <label htmlFor="tipo_documento" className="block text-sm font-medium text-slate-300 mb-2">
            Tipo de Documento <span className="text-red-500">*</span>
          </label>
          <select
            id="tipo_documento"
            value={formData.tipo_documento}
            onChange={(e) => handleFormChange('tipo_documento', e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={uploadState === 'uploading'}
            required
          >
            <option value="">Seleccione un tipo</option>
            {tiposDisponibles.map((tipo) => (
              <option key={tipo.value} value={tipo.value}>
                {tipo.label}
              </option>
            ))}
          </select>
        </div>

        {/* Nota: las fechas de emisión y vencimiento se asignan por admin al validar */}

        {/* Área de drag & drop */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Archivo <span className="text-red-500">*</span>
          </label>
          
          {!selectedFile ? (
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragging
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-600 hover:border-slate-500 bg-slate-700/50'
                }
                ${uploadState === 'uploading' ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <CloudArrowUpIcon className="h-12 w-12 mx-auto text-slate-400 mb-3" />
              <p className="text-slate-300 font-medium mb-1">
                Arrastra tu archivo aquí o haz clic para seleccionar
              </p>
              <p className="text-sm text-slate-400">
                PDF, JPG o PNG • Máximo 10MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileInputChange}
                className="hidden"
                disabled={uploadState === 'uploading'}
              />
            </div>
          ) : (
            <div className="border border-slate-600 rounded-lg p-4 bg-slate-700">
              <div className="flex items-start gap-3">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-16 h-16 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 bg-slate-600 rounded flex items-center justify-center flex-shrink-0">
                    <DocumentTextIcon className="h-8 w-8 text-slate-400" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-slate-100 font-medium truncate">{selectedFile.name}</p>
                  <p className="text-sm text-slate-400">{formatFileSize(selectedFile.size)}</p>
                </div>

                {uploadState !== 'uploading' && (
                  <button
                    type="button"
                    onClick={handleClearFile}
                    className="p-1 text-slate-400 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mensajes de estado */}
        {uploadState === 'success' && (
          <div className="flex items-center gap-2 p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-300">
            <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">Documento subido exitosamente</span>
          </div>
        )}

        {uploadState === 'error' && errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
            <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{errorMessage}</span>
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={uploadState === 'uploading' || !selectedFile}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {uploadState === 'uploading' ? 'Subiendo...' : 'Subir Documento'}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={uploadState === 'uploading'}
              className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
