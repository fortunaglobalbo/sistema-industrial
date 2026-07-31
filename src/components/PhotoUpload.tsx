'use client';

import React, { useState, useRef } from 'react';
import { Camera, X, Loader2, FileImage } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PhotoUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
}

export default function PhotoUpload({ value, onChange }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploading(true);
    setError(null);

    try {
      // Generar nombre de archivo único
      const fileExt = file.name.split('.').pop() || 'jpg';
      const randomId = Math.random().toString(36).substring(2, 11);
      const fileName = `evidence_${Date.now()}_${randomId}.${fileExt}`;

      // Subir archivo al bucket 'evidences' en Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('evidences')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('evidences')
        .getPublicUrl(fileName);

      onChange(publicUrl);
    } catch (err: any) {
      console.error('Error al subir imagen:', err);
      setError(err.message || 'No se pudo subir la imagen. Verifica la conexión.');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = () => {
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment" // Habilita la cámara trasera en móviles directamente
        className="hidden"
      />

      {value ? (
        <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200 shadow-sm group">
          <img
            src={value}
            alt="Evidencia"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={removePhoto}
            className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 transition shadow"
            title="Eliminar foto"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={triggerSelect}
          disabled={uploading}
          className="flex flex-col items-center justify-center w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 text-slate-500 hover:text-blue-600 transition"
        >
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="text-[10px] mt-1 text-blue-500 font-medium">Subiendo...</span>
            </>
          ) : (
            <>
              <Camera className="w-6 h-6" />
              <span className="text-[10px] mt-1 font-semibold">Tomar Foto</span>
            </>
          )}
        </button>
      )}

      {error && (
        <span className="text-[10px] text-red-500 mt-1 max-w-[120px] text-center leading-tight">
          {error}
        </span>
      )}
    </div>
  );
}
