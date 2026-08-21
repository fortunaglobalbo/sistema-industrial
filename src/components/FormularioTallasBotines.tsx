'use client';

import React, { useState, useEffect } from 'react';
import { 
  Footprints, Save, RefreshCw, User, FileText, ArrowLeft, 
  Trash2, Printer, CheckCircle2, ShieldCheck, Filter, Layers, Check
} from 'lucide-react';
import Swal from 'sweetalert2';
import { 
  createBootSizeRequest, 
  getBootSizeRequests, 
  deleteBootSizeRequest,
  getConsolidatedBootReport
} from '@/app/actions/bootSizeRequest';
import { 
  BOOT_AREAS, 
  BOOT_SIZES, 
  BootSizeRequestData 
} from '@/lib/bootSizeTypes';

interface FormularioTallasBotinesProps {
  onBackToMainApp?: () => void;
  showTabs?: boolean;
  initialTab?: 'create' | 'history';
}

export default function FormularioTallasBotines({ 
  onBackToMainApp, 
  showTabs = false, 
  initialTab = 'create' 
}: FormularioTallasBotinesProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>(initialTab);

  // Estados del Formulario
  const [fullName, setFullName] = useState('');
  const [area, setArea] = useState<string>(BOOT_AREAS[0]); // Default 'ÁREA ADMINISTRATIVA'
  const [position, setPosition] = useState('');
  const [gender, setGender] = useState<'MASCULINO' | 'FEMENINO'>('MASCULINO');
  const [bootSize, setBootSize] = useState<number>(40);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Historial
  const [historyList, setHistoryList] = useState<BootSizeRequestData[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [areaFilter, setAreaFilter] = useState('TODAS');
  const [genderFilter, setGenderFilter] = useState('TODOS');

  // Reporte Consolidado
  const [consolidatedData, setConsolidatedData] = useState<any | null>(null);
  const [loadingConsolidated, setLoadingConsolidated] = useState(false);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
      fetchConsolidated();
    }
  }, [activeTab, areaFilter, genderFilter]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    const data = await getBootSizeRequests(areaFilter, genderFilter);
    setHistoryList(data);
    setLoadingHistory(false);
  };

  const fetchConsolidated = async () => {
    setLoadingConsolidated(true);
    const res = await getConsolidatedBootReport(areaFilter);
    if (res.success) {
      setConsolidatedData(res);
    }
    setLoadingConsolidated(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Nombre Requerido',
        text: 'Por favor escriba el Nombre Completo del trabajador.',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    if (!position.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Cargo / Puesto Requerido',
        text: 'Por favor ingrese el Cargo o Puesto del trabajador.',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        fullName: fullName.trim().toUpperCase(),
        area: area.trim().toUpperCase(),
        position: position.trim().toUpperCase(),
        gender: gender.trim().toUpperCase() as 'MASCULINO' | 'FEMENINO',
        bootSize: Number(bootSize)
      };

      const result = await createBootSizeRequest(payload);

      if (result.success && result.folio) {
        Swal.fire({
          icon: 'success',
          title: '¡Talla de Botín Registrada!',
          html: `
            <div class="text-left text-sm space-y-2">
              <p class="font-bold text-slate-800">El registro de la talla de botín ha sido guardado correctamente para el pedido de dotación.</p>
              <div class="bg-blue-50 p-3.5 rounded-xl border border-blue-200 font-mono text-xs text-blue-900 space-y-1">
                <p><strong>N° Folio:</strong> #${result.folio}</p>
                <p><strong>Código:</strong> ${result.registrationCode}</p>
                <p><strong>Trabajador:</strong> ${fullName.trim().toUpperCase()}</p>
                <p><strong>Área:</strong> ${area}</p>
                <p><strong>Cargo:</strong> ${position.trim().toUpperCase()}</p>
                <p><strong>Género:</strong> ${gender}</p>
                <p class="text-base text-blue-700 font-black mt-1"><strong>Talla de Botín:</strong> ${bootSize}</p>
              </div>
            </div>
          `,
          confirmButtonColor: '#2563eb',
          confirmButtonText: 'ACEPTAR Y CONTINUAR'
        }).then(() => {
          setFullName('');
          setPosition('');
          setBootSize(40);
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error al Guardar',
          text: result.error || 'No se pudo guardar la información.',
          confirmButtonColor: '#ef4444'
        });
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error Inesperado',
        text: err?.message || 'Error al procesar el envío.',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirm = await Swal.fire({
      title: '¿Eliminar Registro?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
      const res = await deleteBootSizeRequest(id);
      if (res.success) {
        Swal.fire({
          icon: 'success',
          title: 'Eliminado',
          text: 'Registro eliminado correctamente.',
          timer: 1500,
          showConfirmButton: false
        });
        fetchHistory();
        fetchConsolidated();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: res.error || 'No se pudo eliminar.',
          confirmButtonColor: '#ef4444'
        });
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased">
      
      {/* HEADER PRINCIPAL */}
      <header className="bg-slate-900 text-white border-b-4 border-blue-600 shadow-md sticky top-0 z-50 print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {onBackToMainApp && (
              <button 
                onClick={onBackToMainApp}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition border border-slate-700 flex items-center justify-center shrink-0"
                title="Volver al Panel Principal"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            )}

            <div className="flex items-center gap-3">
              <img 
                src="/logo-ende.png" 
                alt="ENDE DEORURO" 
                className="h-11 sm:h-12 w-auto object-contain"
              />
              <div>
                <h1 className="text-base sm:text-xl font-black tracking-tight text-white uppercase">
                  ENDE DEORURO
                </h1>
                <p className="text-xs sm:text-sm text-blue-400 font-black uppercase tracking-wide flex items-center gap-1.5">
                  <Footprints className="w-4 h-4 text-blue-400" />
                  Registro de Tallas de Botines de Seguridad
                </p>
              </div>
            </div>
          </div>

          {/* Selector de Pestañas (Solo si showTabs es true) */}
          {showTabs && (
            <div className="flex p-1 bg-slate-800 rounded-xl border border-slate-700 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('create')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-black transition ${activeTab === 'create' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:text-white'}`}
              >
                <Footprints className="w-4 h-4" />
                Nuevo Registro
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-black transition ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:text-white'}`}
              >
                <FileText className="w-4 h-4" />
                Historial y Reporte
              </button>
            </div>
          )}

        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 md:p-8">
        
        {activeTab === 'create' ? (
          
          /* FORMULARIO DE REGISTRO DE TALLA DE BOTÍN */
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* CARD DATOS DEL TRABAJADOR */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-300 shadow-xl space-y-6">
              
              <div className="border-b border-slate-200 pb-4 flex items-center gap-3">
                <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
                    Datos del Trabajador para Dotación de Botines
                  </h2>
                  <p className="text-xs sm:text-sm font-bold text-slate-600">
                    Complete la información oficial para la solicitud de calzado de seguridad
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* NOMBRE COMPLETO */}
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-xs sm:text-sm font-black text-slate-900 uppercase">
                    Nombre Completo <span className="text-red-600 text-base">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="EJ. JUAN CARLOS MAMANI PÉREZ"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm sm:text-base font-black uppercase rounded-2xl px-5 py-4 focus:outline-none focus:border-blue-600 transition shadow-inner"
                  />
                </div>

                {/* ÁREA / DEPARTAMENTO */}
                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm font-black text-slate-900 uppercase">
                    Área / Departamento <span className="text-red-600 text-base">*</span>
                  </label>
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm sm:text-base font-black uppercase rounded-2xl px-5 py-4 focus:outline-none focus:border-blue-600 transition cursor-pointer"
                  >
                    {BOOT_AREAS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                {/* CARGO / PUESTO */}
                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm font-black text-slate-900 uppercase">
                    Cargo / Puesto <span className="text-red-600 text-base">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="EJ. TÉCNICO DE CAMPO, AUXILIAR ADMINISTRATIVO..."
                    value={position}
                    onChange={(e) => setPosition(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm sm:text-base font-black uppercase rounded-2xl px-5 py-4 focus:outline-none focus:border-blue-600 transition shadow-inner"
                  />
                </div>

                {/* GÉNERO */}
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-xs sm:text-sm font-black text-slate-900 uppercase">
                    Género <span className="text-red-600 text-base">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    
                    <button
                      type="button"
                      onClick={() => setGender('MASCULINO')}
                      className={`p-4.5 rounded-2xl border-2 font-black text-sm sm:text-base flex items-center justify-center gap-3 transition uppercase ${
                        gender === 'MASCULINO'
                          ? 'bg-blue-900 text-white border-blue-900 shadow-lg ring-2 ring-blue-500/50'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      <User className="w-5 h-5 text-blue-400" />
                      <span>MASCULINO</span>
                      {gender === 'MASCULINO' && <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-auto" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setGender('FEMENINO')}
                      className={`p-4.5 rounded-2xl border-2 font-black text-sm sm:text-base flex items-center justify-center gap-3 transition uppercase ${
                        gender === 'FEMENINO'
                          ? 'bg-pink-900 text-white border-pink-900 shadow-lg ring-2 ring-pink-500/50'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      <User className="w-5 h-5 text-pink-400" />
                      <span>FEMENINO</span>
                      {gender === 'FEMENINO' && <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-auto" />}
                    </button>

                  </div>
                </div>

                {/* SELECCIÓN DE TALLA DE BOTÍN (GRID 35 A 45) */}
                <div className="space-y-3 md:col-span-2 pt-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs sm:text-sm font-black text-slate-900 uppercase">
                      Seleccionar Talla de Botín <span className="text-red-600 text-base">*</span>
                    </label>
                    <span className="text-xs font-black text-blue-700 bg-blue-100 px-3 py-1 rounded-full uppercase">
                      TALLA SELECCIONADA: {bootSize}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-11 gap-2.5">
                    {BOOT_SIZES.map((size) => {
                      const isSelected = bootSize === size;
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setBootSize(size)}
                          className={`h-14 rounded-2xl font-mono font-black text-base sm:text-lg flex flex-col items-center justify-center transition border-2 shadow-sm ${
                            isSelected
                              ? 'bg-gradient-to-b from-blue-600 to-indigo-700 text-white border-blue-500 shadow-lg scale-105 ring-2 ring-blue-400/50'
                              : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 hover:border-blue-400'
                          }`}
                        >
                          <span>{size}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* BOTÓN SUBMIT */}
              <div className="pt-4 border-t-2 border-slate-200">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-base sm:text-lg py-5 px-6 rounded-2xl shadow-2xl transition flex items-center justify-center gap-3 disabled:opacity-50 uppercase tracking-widest"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                      <span>ENVIANDO DATOS...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-6 h-6 text-emerald-400" />
                      <span>SOLO ENVIAR DATOS</span>
                    </>
                  )}
                </button>
              </div>

            </div>

          </form>

        ) : (

          /* CONTROL HISTORIAL Y CONSOLIDADO PARA ALMACÉN (CON CLASE print-area) */
          <div className="print-area space-y-6 font-sans">
            
            {/* ENCABEZADO INSTITUCIONAL DE IMPRESIÓN (SOLO VISIBLE EN IMPRESIÓN) */}
            <div className="hidden print:flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
              <div className="flex items-center gap-4">
                <img 
                  src="/logo-ende.png" 
                  alt="ENDE DEORURO" 
                  className="h-12 w-auto object-contain"
                />
                <div>
                  <h2 className="text-base font-black uppercase text-slate-900 tracking-tight">ENDE DEORURO - DEPARTAMENTO DE SEGURIDAD INDUSTRIAL</h2>
                  <p className="text-xs font-extrabold text-blue-900 uppercase tracking-wide">REPORTE CONSOLIDADO Y PEDIDO DE BOTINES DE SEGURIDAD</p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block bg-slate-900 text-white font-mono font-bold text-xs px-3 py-1 rounded uppercase">
                  {areaFilter === 'TODAS' ? 'TODAS LAS ÁREAS' : areaFilter}
                </span>
                <p className="text-[10px] text-slate-600 font-bold mt-1 font-mono">
                  FECHA EMISIÓN: {new Date().toLocaleDateString('es-BO')}
                </p>
              </div>
            </div>

            {/* RESUMEN CONSOLIDADO PARA COMPRAS / ALMACÉN */}
            <div className="bg-white p-6 rounded-3xl border border-slate-300 shadow-sm space-y-4 print:p-0 print:border-none print:shadow-none">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4 print:pb-2">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-700 print:hidden" />
                    Consolidado de Tallas de Botines Solicitadas
                  </h3>
                  <p className="text-xs sm:text-sm font-bold text-slate-600">
                    Resumen total de pares de botines requeridos por número y género para pedido a almacén
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto print:hidden">
                  <select
                    value={areaFilter}
                    onChange={(e) => setAreaFilter(e.target.value)}
                    className="bg-slate-50 border-2 border-slate-300 text-slate-900 text-xs sm:text-sm font-black rounded-xl px-4 py-2.5 uppercase print:hidden"
                  >
                    <option value="TODAS">TODAS LAS ÁREAS</option>
                    {BOOT_AREAS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>

                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-4 py-2.5 rounded-xl transition print:hidden"
                  >
                    <Printer className="w-4 h-4 text-emerald-400" />
                    <span>Imprimir Resumen</span>
                  </button>
                </div>
              </div>

              {/* MATRIZ CONSOLIDADA DE TALLAS */}
              {loadingConsolidated ? (
                <div className="text-center py-6 text-xs text-slate-500 font-bold print:hidden">Cargando consolidado...</div>
              ) : consolidatedData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 print:grid-cols-6 gap-3">
                    {consolidatedData.summary?.map((item: any) => (
                      <div 
                        key={item.size} 
                        className={`p-3.5 rounded-2xl border-2 text-center transition print:p-2 print:rounded-xl print:border-slate-400 ${
                          item.total > 0 ? 'bg-blue-50/80 border-blue-300 print:bg-slate-100' : 'bg-slate-50 border-slate-200 opacity-60 print:opacity-100'
                        }`}
                      >
                        <span className="text-xs font-black text-slate-500 uppercase block print:text-[10px]">TALLA</span>
                        <span className="text-xl sm:text-2xl font-mono font-black text-slate-900 print:text-lg">{item.size}</span>
                        <div className="mt-1 pt-1 border-t border-slate-200 text-[11px] font-bold text-slate-700 space-y-0.5 print:text-[10px]">
                          <p className="text-blue-900 print:text-slate-900">Total: <strong className="font-mono">{item.total} pares</strong></p>
                          {item.total > 0 && (
                            <p className="text-[10px] text-slate-500 print:text-slate-700">M: {item.masculino} | F: {item.femenino}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-900 text-white p-4 rounded-2xl flex justify-between items-center font-black text-sm uppercase print:bg-slate-100 print:text-slate-900 print:border-2 print:border-slate-900 print:p-3">
                    <span>TOTAL GENERAL DE BOTINES REQUERIDOS:</span>
                    <span className="text-xl font-mono text-emerald-400 print:text-slate-900 print:font-black">{consolidatedData.totalPairs} PARES</span>
                  </div>
                </div>
              ) : null}

            </div>

            {/* TABLA HISTORIAL DE REGISTROS */}
            <div className="bg-white p-6 rounded-3xl border border-slate-300 shadow-sm space-y-4 print:p-0 print:border-none print:shadow-none print:pt-4">
              
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 print:pb-2">
                <h3 className="text-base font-black text-slate-900 uppercase">
                  Listado Individual de Trabajadores Registrados
                </h3>

                <div className="flex items-center gap-2 print:hidden">
                  <select
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-300 text-slate-900 text-xs font-black rounded-xl px-3 py-2 uppercase print:hidden"
                  >
                    <option value="TODOS">TODOS LOS GÉNEROS</option>
                    <option value="MASCULINO">MASCULINO</option>
                    <option value="FEMENINO">FEMENINO</option>
                  </select>

                  <button
                    onClick={() => { fetchHistory(); fetchConsolidated(); }}
                    disabled={loadingHistory}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition print:hidden"
                    title="Actualizar Lista"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 print:hidden">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                  <p className="text-xs text-slate-600 font-bold">Cargando registros...</p>
                </div>
              ) : historyList.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs sm:text-sm font-bold border-2 border-dashed border-slate-200 rounded-2xl">
                  No hay registros de tallas de botines almacenados para los filtros seleccionados.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-300 print:border-slate-400 print:rounded-none">
                  <table className="w-full border-collapse text-xs sm:text-sm text-left">
                    <thead>
                      <tr className="bg-slate-900 text-white font-black uppercase print:bg-slate-200 print:text-slate-900">
                        <th className="p-3.5 text-center print:p-2 print:border">N° Folio</th>
                        <th className="p-3.5 print:p-2 print:border">Trabajador</th>
                        <th className="p-3.5 print:p-2 print:border">Área / Depto.</th>
                        <th className="p-3.5 print:p-2 print:border">Cargo / Puesto</th>
                        <th className="p-3.5 text-center print:p-2 print:border">Género</th>
                        <th className="p-3.5 text-center print:p-2 print:border">Talla Botín</th>
                        <th className="p-3.5 text-center print:hidden">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-bold">
                      {historyList.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50 transition">
                          <td className="p-3.5 text-center font-black font-mono text-blue-700 print:p-2 print:border print:text-slate-900">
                            #{req.folio}
                          </td>
                          <td className="p-3.5 font-black text-slate-900 uppercase print:p-2 print:border">
                            {req.full_name}
                          </td>
                          <td className="p-3.5 font-black text-slate-800 uppercase text-xs print:p-2 print:border">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-black border print:border-none print:p-0 print:font-bold ${
                              req.area.includes('ADMINISTRATIVA') 
                                ? 'bg-amber-50 text-amber-900 border-amber-300' 
                                : 'bg-blue-50 text-blue-900 border-blue-300'
                            }`}>
                              {req.area}
                            </span>
                          </td>
                          <td className="p-3.5 font-bold text-slate-700 uppercase print:p-2 print:border">
                            {req.position}
                          </td>
                          <td className="p-3.5 text-center font-black text-xs uppercase print:p-2 print:border">
                            <span className={`px-2.5 py-0.5 rounded-full print:p-0 ${
                              req.gender === 'MASCULINO' ? 'bg-blue-100 text-blue-900' : 'bg-pink-100 text-pink-900'
                            }`}>
                              {req.gender}
                            </span>
                          </td>
                          <td className="p-3.5 text-center font-mono font-black text-base text-blue-700 print:p-2 print:border print:text-slate-900">
                            {req.boot_size}
                          </td>
                          <td className="p-3.5 text-center print:hidden">
                            <button
                              onClick={() => handleDelete(req.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition border border-red-200"
                              title="Eliminar registro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

          </div>

        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs sm:text-sm text-slate-600 font-black print:hidden mt-auto">
        <p>ENDE DEORURO - Registro de Tallas de Botines de Seguridad © {new Date().getFullYear()}</p>
      </footer>

    </div>
  );
}
