'use client';

import React, { useState, useRef } from 'react';
import { 
  X, Upload, Sparkles, Loader2, CheckCircle2, 
  Trash2, Plus, Calendar, User, MapPin, 
  ShieldCheck, AlertCircle, RefreshCw, Camera, Eye
} from 'lucide-react';
import Swal from 'sweetalert2';
import { analyzeWaterDeliverySheet, createBulkWaterWithdrawals } from '@/app/actions/waterSupply';
import { WaterWithdrawalInput } from '@/lib/waterSupplyTypes';

const SECTOR_OPTIONS = [
  'ADMINISTRACIÓN',
  'RECURSOS HUMANOS',
  'COMERCIAL',
  'MANTENIMIENTO URBANO',
  'MANTENIMIENTO RURAL',
  'TRANSMISIÓN',
  'SALUD OCUPACIONAL',
  'SEGURIDAD INDUSTRIAL',
  'ALMACÉN / LOGÍSTICA',
  'MAESTRANZA / TALLER',
  'OPERACIONES / PLANTA',
  'OTRA ÁREA'
];

interface WaterAiScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function WaterAiScannerModal({
  isOpen,
  onClose,
  onSuccess
}: WaterAiScannerModalProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [rows, setRows] = useState<WaterWithdrawalInput[]>([]);
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire({ icon: 'warning', title: 'Archivo inválido', text: 'Por favor seleccione una imagen (JPG, PNG).' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleStartAnalysis = async () => {
    if (!imagePreview) {
      Swal.fire({ icon: 'warning', title: 'Foto requerida', text: 'Tome o suba una foto de la planilla con firmas.' });
      return;
    }

    setAnalyzing(true);
    try {
      const res = await analyzeWaterDeliverySheet(imagePreview);
      setAnalyzing(false);

      if (res.success && res.items && res.items.length > 0) {
        setRows(res.items);
        setStep('review');
        Swal.fire({
          icon: 'success',
          title: `¡${res.items.length} Retiros Detectados!`,
          text: 'La IA reconoció los nombres, sectores y cantidades. Revisa los datos y realiza cualquier corrección si es necesario antes de guardar.',
          timer: 3000,
          showConfirmButton: false
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'No se detectaron registros',
          text: res.error || 'Asegúrese de que la foto de la planilla esté enfocada, con buena luz y muestre la tabla de firmas claramente.'
        });
      }
    } catch (err: any) {
      setAnalyzing(false);
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'Error al conectar con el motor de visión IA.' });
    }
  };

  const handleRowChange = (index: number, field: keyof WaterWithdrawalInput, value: any) => {
    const updated = [...rows];
    (updated[index] as any)[field] = value;
    setRows(updated);
  };

  const handleRemoveRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleAddManualRow = () => {
    const today = new Date().toISOString().split('T')[0];
    setRows([
      ...rows,
      {
        withdrawalDate: today,
        recipientName: '',
        sector: 'PLANTA DE PRODUCCIÓN',
        bottlesQuantity: 1,
        signaturePresent: true,
        photoUrl: imagePreview,
        notes: ''
      }
    ]);
  };

  const handleSaveAll = async () => {
    if (rows.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Sin registros', text: 'No hay retiros para guardar.' });
      return;
    }

    // Validar filas
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i].recipientName?.trim()) {
        Swal.fire({ icon: 'warning', title: 'Nombre faltante', text: `La fila #${i + 1} no tiene el nombre de la persona.` });
        return;
      }
      if (!rows[i].sector?.trim()) {
        Swal.fire({ icon: 'warning', title: 'Sector faltante', text: `La fila #${i + 1} no tiene sector asignado.` });
        return;
      }
      if (!rows[i].bottlesQuantity || rows[i].bottlesQuantity <= 0) {
        Swal.fire({ icon: 'warning', title: 'Cantidad inválida', text: `La cantidad en la fila #${i + 1} debe ser mayor a 0.` });
        return;
      }
    }

    setSaving(true);
    const res = await createBulkWaterWithdrawals(rows);
    setSaving(false);

    if (res.success) {
      await Swal.fire({
        icon: 'success',
        title: '¡Retiros Guardados!',
        text: `Se registraron exitosamente ${res.savedCount} salidas de botellones de agua asociadas a sus respectivos sectores.`,
        confirmButtonColor: '#10b981'
      });
      onSuccess();
      onClose();
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error al Guardar',
        text: res.error || 'No se pudieron registrar las salidas.'
      });
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setRows([]);
    setStep('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Cabecera */}
        <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white p-5 flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-500/30 text-amber-300 rounded-xl border border-indigo-400/30">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                  Reconocimiento OCR con IA: Planilla de Retiro de Botellones
                </h3>
                <p className="text-xs text-indigo-200">
                  Digitaliza automáticamente la hoja física firmada de personas y sectores que retiraron agua.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENIDO SEGÚN PASO */}
        <div className="flex-1 overflow-y-auto p-5">
          
          {step === 'upload' && (
            <div className="max-w-2xl mx-auto space-y-6 py-4">
              
              {!imagePreview ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-indigo-300 hover:border-indigo-600 bg-indigo-50/40 hover:bg-indigo-50/80 rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition flex flex-col items-center justify-center gap-4 group"
                >
                  <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg group-hover:scale-105 transition transform">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-black text-slate-800">
                      Haz clic para tomar una foto o subir la planilla firmada
                    </p>
                    <p className="text-xs text-slate-500 font-medium">
                      Soporta fotos tomadas desde celular o escaneos en JPG, PNG (máx. 10MB)
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-950 flex items-center justify-center max-h-96 group">
                    <img 
                      src={imagePreview} 
                      alt="Planilla de firmas" 
                      className="max-h-96 w-auto object-contain rounded-lg"
                    />
                    <button
                      onClick={handleReset}
                      className="absolute top-3 right-3 bg-red-600/90 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow backdrop-blur-sm transition flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Cambiar Foto
                    </button>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-xs text-blue-900 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Foto lista para análisis</p>
                      <p className="text-blue-700">
                        La IA identificará los nombres, sectores, firmas y cantidades de botellones sacados de cada fila.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleStartAnalysis}
                    disabled={analyzing}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-sm py-3.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                        <span>Analizando planilla y reconociendo firmas con IA...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Escanear y Extraer Datos de la Planilla con IA</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Guía rápida */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[11px] text-slate-600">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="font-bold text-slate-800 block mb-0.5">1. Buena Iluminación</span>
                  Asegura que las firmas y nombres manuscritos no tengan sombras fuertes.
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="font-bold text-slate-800 block mb-0.5">2. Encuadre Plano</span>
                  Procura que la hoja esté recta y se vean todos los bordes de la tabla.
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="font-bold text-slate-800 block mb-0.5">3. Verificación Previa</span>
                  Podrás editar o corregir cualquier dato antes de guardar en el sistema.
                </div>
              </div>

            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase">
                    Filas Detectadas por la IA ({rows.length} retiros)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Revisa los datos extraídos. Si hay algún apellido o sector que desees ajustar, puedes editarlo directamente.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddManualRow}
                    className="flex items-center gap-1 text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg transition"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-600" />
                    + Agregar Fila
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1 text-xs font-bold bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 px-3 py-1.5 rounded-lg transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Subir Otra Foto
                  </button>
                </div>
              </div>

              {/* TABLA DE REVISIÓN */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                <table className="w-full text-left text-xs divide-y divide-slate-200 min-w-[700px]">
                  <thead className="bg-slate-100/80 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-2.5 w-12 text-center">#</th>
                      <th className="p-2.5 w-32">Fecha</th>
                      <th className="p-2.5">Persona que Retiró</th>
                      <th className="p-2.5">Sector / Área</th>
                      <th className="p-2.5 w-24 text-center">Cant. (20L)</th>
                      <th className="p-2.5 w-20 text-center">¿Firmó?</th>
                      <th className="p-2.5 w-12 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-indigo-50/30 transition">
                        <td className="p-2.5 text-center font-mono font-bold text-slate-400 text-xs">
                          {idx + 1}
                        </td>
                        <td className="p-2.5">
                          <input
                            type="date"
                            value={row.withdrawalDate}
                            onChange={(e) => handleRowChange(idx, 'withdrawalDate', e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold bg-white focus:border-indigo-500 focus:outline-none"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            placeholder="Nombre completo"
                            value={row.recipientName}
                            onChange={(e) => handleRowChange(idx, 'recipientName', e.target.value.toUpperCase())}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-extrabold uppercase bg-white focus:border-indigo-500 focus:outline-none"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            list="sectors-list"
                            placeholder="Ej. Planta, Mantenimiento"
                            value={row.sector}
                            onChange={(e) => handleRowChange(idx, 'sector', e.target.value.toUpperCase())}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold uppercase bg-white focus:border-indigo-500 focus:outline-none"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={row.bottlesQuantity}
                            onChange={(e) => handleRowChange(idx, 'bottlesQuantity', parseInt(e.target.value, 10) || 1)}
                            className="w-16 border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-black text-center bg-white focus:border-indigo-500 focus:outline-none mx-auto"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={row.signaturePresent}
                            onChange={(e) => handleRowChange(idx, 'signaturePresent', e.target.checked)}
                            className="w-4 h-4 text-emerald-600 rounded cursor-pointer accent-emerald-600"
                            title={row.signaturePresent ? 'Firma física verificada' : 'Sin firma'}
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => handleRemoveRow(idx)}
                            className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg transition"
                            title="Eliminar esta fila"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Datalist para autocompletar sectores */}
              <datalist id="sectors-list">
                {SECTOR_OPTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>

              {/* Resumen inferior */}
              <div className="bg-indigo-50/60 border border-indigo-200 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="text-xs text-indigo-900">
                  <span>Total de botellones a registrar: </span>
                  <strong className="text-sm font-black font-mono">
                    {rows.reduce((acc, r) => acc + (Number(r.bottlesQuantity) || 0), 0)} botellones
                  </strong>
                  <span className="text-indigo-600"> en {rows.length} retiros</span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setStep('upload')}
                    className="flex-1 sm:flex-initial px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition"
                  >
                    Volver a la Foto
                  </button>
                  <button
                    onClick={handleSaveAll}
                    disabled={saving}
                    className="flex-1 sm:flex-initial px-5 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow transition flex items-center justify-center gap-1.5"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                        <span>Confirmar y Guardar Salidas</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
