'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  FileSpreadsheet,
  Calendar,
  Filter,
  RefreshCw,
  Loader2,
  Shirt,
  Wrench,
  Shield,
  Layers,
  Users,
  CheckCircle2,
  FileText
} from 'lucide-react';
import {
  getConsolidatedTransactionsReport,
  ConsolidatedReportFilter
} from '@/app/actions/transaction';

interface PlanillaConsolidadaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PlanillaConsolidadaModal({
  isOpen,
  onClose
}: PlanillaConsolidadaModalProps) {
  // Estados de Filtros
  const [periodMode, setPeriodMode] = useState<'month' | 'custom'>('month');
  
  // Mes actual por defecto (formato YYYY-MM)
  const currentMonthYear = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthYear());
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Filtro de Categoría: 'all' | 'Ropa de Trabajo' | 'Herramientas' | 'EPP (Protección)'
  const [selectedCategory, setSelectedCategory] = useState<string>('Ropa de Trabajo');
  
  // Filtro de Operación: 'all' | 'entregas_todas' | 'desuso_devolucion' | 'desuso'
  const [selectedType, setSelectedType] = useState<string>('all');

  // Estados de Carga y Datos
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalTransactions: 0,
    totalClothingQuantity: 0,
    totalToolsScrapQuantity: 0,
    totalEppQuantity: 0,
    totalOtherQuantity: 0,
    totalWorkersBenefited: 0,
  });

  // Cargar datos cuando cambia isOpen o se actualizan filtros
  const fetchReport = async () => {
    setLoading(true);
    try {
      const filters: ConsolidatedReportFilter = {
        category: selectedCategory,
        transactionType: selectedType,
      };

      if (periodMode === 'month') {
        filters.monthYear = selectedMonth;
      } else {
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
      }

      const res = await getConsolidatedTransactionsReport(filters);
      if (res.success) {
        setRecords(res.records);
        setSummary(res.summary);
      }
    } catch (err) {
      console.error('Error al cargar reporte consolidado:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReport();
    }
  }, [isOpen, periodMode, selectedMonth, selectedCategory, selectedType]);

  if (!isOpen) return null;

  // Formateadores
  const formatDateOnly = (iso: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const translateTypeBadge = (type: string) => {
    switch (type) {
      case 'dotacion':
        return { label: 'Dotación', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300' };
      case 'entrega':
        return { label: 'Entrega Ropa/EPP', bg: 'bg-blue-50 text-blue-800 border-blue-300' };
      case 'desuso':
        return { label: 'En Desuso / Retiro', bg: 'bg-rose-50 text-rose-800 border-rose-300' };
      case 'devolucion':
        return { label: 'Devolución', bg: 'bg-amber-50 text-amber-800 border-amber-300' };
      case 'intercambio':
        return { label: 'Intercambio', bg: 'bg-purple-50 text-purple-800 border-purple-300' };
      default:
        return { label: type.toUpperCase(), bg: 'bg-slate-100 text-slate-800 border-slate-300' };
    }
  };

  const translateReason = (reason: string) => {
    switch (reason) {
      case 'nuevo': return 'Dotación / Nuevo';
      case 'desgaste_natural': return 'Desgaste Natural';
      case 'dano_operativo': return 'Daño Operativo';
      case 'defecto_fabrica': return 'Defecto de Fábrica';
      case 'cambio_talla': return 'Cambio de Talla';
      case 'en_desuso': return 'En Desuso / Retiro';
      default: return reason;
    }
  };

  // Título dinámico para el membrete oficial
  const getOfficialTitle = () => {
    if (selectedCategory === 'Ropa de Trabajo') {
      return 'PLANILLA OFICIAL DE ENTREGA Y DOTACIÓN DE ROPA DE TRABAJO';
    }
    if (selectedCategory === 'Herramientas') {
      return 'PLANILLA OFICIAL DE RECEPCIÓN DE HERRAMIENTAS EN DESUSO Y RETIRO';
    }
    if (selectedCategory === 'EPP (Protección)') {
      return 'PLANILLA OFICIAL DE ENTREGA DE EQUIPOS DE PROTECCIÓN PERSONAL (EPP)';
    }
    return 'PLANILLA CONSOLIDADA DE MOVIMIENTOS Y DOTACIONES DE ALMACÉN';
  };

  const getPeriodLabel = () => {
    if (periodMode === 'month') {
      if (selectedMonth === 'all') return 'HISTORIAL COMPLETO REGISTRADO';
      const [y, m] = selectedMonth.split('-');
      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      const name = monthNames[parseInt(m, 10) - 1] || m;
      return `MES: ${name.toUpperCase()} DE ${y}`;
    }
    if (startDate || endDate) {
      return `DESDE: ${startDate || 'INICIO'} HASTA: ${endDate || 'ACTUALIDAD'}`;
    }
    return 'HISTORIAL COMPLETO';
  };

  // Exportar a Excel (CSV con UTF-8 BOM)
  const handleExportCSV = () => {
    if (records.length === 0) return;

    const headers = [
      'N° Folio',
      'Fecha',
      'Trabajador',
      'C.I.',
      'Cargo',
      'Sección / Departamento',
      'Tipo de Operación',
      'Ítems / Prendas',
      'Cantidad Total',
      'Motivo / Condición',
      'Autorizado Por'
    ];

    const rows = records.map(r => {
      const itemsList = r.items.map((i: any) => `${i.itemName} (x${i.quantity})`).join(' | ');
      const totalQty = r.items.reduce((sum: number, i: any) => sum + i.quantity, 0);
      const reasons = Array.from(new Set(r.items.map((i: any) => translateReason(i.conditionReason)))).join(', ');

      return [
        `#${r.folio}`,
        formatDateOnly(r.date),
        `"${r.workerName.replace(/"/g, '""')}"`,
        r.workerCi,
        `"${r.workerPosition.replace(/"/g, '""')}"`,
        `"${r.workerDepartment.replace(/"/g, '""')}"`,
        translateTypeBadge(r.transactionType).label,
        `"${itemsList.replace(/"/g, '""')}"`,
        totalQty,
        `"${reasons.replace(/"/g, '""')}"`,
        `"${r.supervisorName.replace(/"/g, '""')}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Planilla_${selectedCategory.replace(/\s+/g, '_')}_${selectedMonth || 'periodo'}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        
        {/* CABECERA SUPERIOR: CONTROLES DE FILTRO Y ACCIONES (NO SE IMPRIME) */}
        <div className="bg-[#002f6c] text-white p-4 sm:p-5 flex flex-col gap-4 shrink-0 shadow-md">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 border border-white/20">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-wide flex items-center gap-2">
                  Planilla Oficial de Almacén e Historial
                  <span className="text-[10px] bg-amber-400 text-slate-900 font-bold px-2 py-0.5 rounded-full uppercase">
                    Consolidado
                  </span>
                </h2>
                <p className="text-xs text-blue-200">
                  Generación, control mensual e impresión formal para entrega de ropa de trabajo y desuso
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                disabled={records.length === 0 || loading}
                className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl transition shadow cursor-pointer disabled:opacity-50"
                title="Imprimir esta planilla oficial directamente (Carta / Oficio)"
              >
                <Printer className="w-4 h-4" />
                Imprimir Planilla
              </button>
              <button
                onClick={handleExportCSV}
                disabled={records.length === 0 || loading}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow cursor-pointer disabled:opacity-50"
                title="Descargar en formato Excel (.csv)"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Exportar Excel
              </button>
              <button
                onClick={onClose}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
                title="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* BARRA DE FILTROS INTERACTIVOS */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-white/15 text-xs text-slate-900">
            
            {/* FILTRO 1: CATEGORÍA */}
            <div className="sm:col-span-4 bg-white/95 backdrop-blur p-2.5 rounded-xl shadow-sm">
              <label className="block text-[11px] font-black text-[#002f6c] uppercase mb-1.5 flex items-center gap-1">
                <Shirt className="w-3.5 h-3.5 text-amber-500" />
                Categoría de Insumo:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setSelectedCategory('Ropa de Trabajo')}
                  className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition text-left flex items-center gap-1.5 border cursor-pointer ${
                    selectedCategory === 'Ropa de Trabajo'
                      ? 'bg-[#002f6c] text-white border-[#002f6c] shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <Shirt className="w-3.5 h-3.5" />
                  Ropa de Trabajo
                </button>
                <button
                  onClick={() => setSelectedCategory('Herramientas')}
                  className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition text-left flex items-center gap-1.5 border cursor-pointer ${
                    selectedCategory === 'Herramientas'
                      ? 'bg-[#002f6c] text-white border-[#002f6c] shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  En Desuso / Retiro
                </button>
                <button
                  onClick={() => setSelectedCategory('EPP (Protección)')}
                  className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition text-left flex items-center gap-1.5 border cursor-pointer ${
                    selectedCategory === 'EPP (Protección)'
                      ? 'bg-[#002f6c] text-white border-[#002f6c] shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  EPP (Protección)
                </button>
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition text-left flex items-center gap-1.5 border cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-[#002f6c] text-white border-[#002f6c] shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Todas las Categorías
                </button>
              </div>
            </div>

            {/* FILTRO 2: PERÍODO (MES O FECHAS) */}
            <div className="sm:col-span-5 bg-white/95 backdrop-blur p-2.5 rounded-xl shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-black text-[#002f6c] uppercase flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Período de Emisión:
                </label>
                <div className="flex gap-2">
                  <label className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 cursor-pointer">
                    <input
                      type="radio"
                      name="periodType"
                      checked={periodMode === 'month'}
                      onChange={() => setPeriodMode('month')}
                      className="accent-[#002f6c]"
                    />
                    Por Mes
                  </label>
                  <label className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 cursor-pointer">
                    <input
                      type="radio"
                      name="periodType"
                      checked={periodMode === 'custom'}
                      onChange={() => setPeriodMode('custom')}
                      className="accent-[#002f6c]"
                    />
                    Rango Fechas
                  </label>
                </div>
              </div>

              {periodMode === 'month' ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="month"
                    value={selectedMonth === 'all' ? '' : selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value || 'all')}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#002f6c]"
                  />
                  <button
                    onClick={() => setSelectedMonth('all')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition shrink-0 cursor-pointer ${
                      selectedMonth === 'all'
                        ? 'bg-blue-900 text-white border-blue-900'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-300'
                    }`}
                  >
                    Ver Todo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div>
                    <span className="text-[9px] font-semibold text-slate-500 block">Desde:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] font-semibold text-slate-500 block">Hasta:</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* FILTRO 3: TIPO DE OPERACIÓN Y REFRESCAR */}
            <div className="sm:col-span-3 bg-white/95 backdrop-blur p-2.5 rounded-xl shadow-sm flex flex-col justify-between">
              <div>
                <label className="block text-[11px] font-black text-[#002f6c] uppercase mb-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-emerald-600" />
                  Tipo de Operación:
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#002f6c]"
                >
                  <option value="all">Todas las Operaciones</option>
                  <option value="entregas_todas">Solo Entregas y Dotaciones</option>
                  <option value="desuso_devolucion">Solo En Desuso / Devoluciones</option>
                  <option value="desuso">Exclusivo Herramientas en Desuso</option>
                </select>
              </div>

              <div className="flex justify-end mt-2">
                <button
                  onClick={fetchReport}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-1 bg-[#002f6c] hover:bg-[#003876] text-white font-bold text-xs py-1.5 rounded-lg transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Aplicar Filtros
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* TARJETAS RESUMEN DE TOTALES EN PANTALLA (NO SE IMPRIMEN) */}
        <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase">Total Actas</p>
              <p className="text-base font-black text-slate-800">{summary.totalTransactions}</p>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase">Trabajadores</p>
              <p className="text-base font-black text-slate-800">{summary.totalWorkersBenefited}</p>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <Shirt className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase">Prendas Ropa</p>
              <p className="text-base font-black text-slate-800">{summary.totalClothingQuantity} pzas</p>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-50 text-rose-700">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase">Herr. en Desuso</p>
              <p className="text-base font-black text-slate-800">{summary.totalToolsScrapQuantity} pzas</p>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase">EPP / Otros</p>
              <p className="text-base font-black text-slate-800">{summary.totalEppQuantity + summary.totalOtherQuantity} pzas</p>
            </div>
          </div>
        </div>

        {/* CONTENEDOR CENTRAL: ÁREA OFICIAL IMPRIMIBLE (.print-area) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/50">
          <div className="print-area bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-xl max-w-5xl mx-auto print:shadow-none print:border-none print:w-full print:p-0 font-sans">
            
            {/* MEMBRETE OFICIAL ENDE DEORURO */}
            <div className="flex justify-between items-start border-b-2 border-[#002f6c] pb-3 mb-4">
              <div className="flex items-center gap-3">
                <img
                  src="/logo_ende_deoruro.png"
                  alt="ENDE DEORURO"
                  className="h-12 w-auto object-contain mix-blend-multiply"
                />
                <div className="border-l-2 border-slate-300 pl-3">
                  <h1 className="font-extrabold text-xs sm:text-sm text-[#002f6c] tracking-wide leading-tight">
                    EMPRESA DE LUZ Y FUERZA ELÉCTRICA DE ORURO
                  </h1>
                  <p className="text-[10px] font-bold text-slate-600">
                    SECCIÓN SEGURIDAD INDUSTRIAL Y SALUD OCUPACIONAL - ALMACÉN
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block bg-[#002f6c] text-white font-black text-[10px] px-2.5 py-1 rounded tracking-widest">
                  PLANILLA OFICIAL
                </span>
                <p className="text-[9px] text-slate-500 font-mono mt-1">
                  Emisión: {new Date().toLocaleDateString('es-ES')} {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* TÍTULO Y PERÍODO OFICIAL */}
            <div className="text-center my-3 pb-2 border-b border-slate-200">
              <h2 className="font-black text-sm sm:text-base text-slate-900 uppercase tracking-wide">
                {getOfficialTitle()}
              </h2>
              <p className="text-xs font-extrabold text-[#002f6c] uppercase mt-0.5 tracking-wider">
                {getPeriodLabel()}
              </p>
            </div>

            {/* RESUMEN INSTITUCIONAL EN DOCUMENTO */}
            <div className="grid grid-cols-4 gap-2 mb-4 text-[10px] border border-slate-300 rounded-lg p-2 bg-slate-50/80">
              <div>
                <span className="text-slate-500 font-medium">Categoría Reportada:</span>
                <p className="font-bold text-slate-800">{selectedCategory === 'all' ? 'Consolidado General' : selectedCategory}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Filtro de Operación:</span>
                <p className="font-bold text-slate-800">
                  {selectedType === 'all' ? 'Todos los movimientos' : selectedType === 'entregas_todas' ? 'Entregas y Dotaciones' : 'Herramientas en Desuso'}
                </p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Trabajadores Atendidos:</span>
                <p className="font-bold text-slate-800">{summary.totalWorkersBenefited} funcionarios</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Total Unidades Movilizadas:</span>
                <p className="font-black text-[#002f6c]">
                  {summary.totalClothingQuantity + summary.totalToolsScrapQuantity + summary.totalEppQuantity + summary.totalOtherQuantity} ítems
                </p>
              </div>
            </div>

            {/* TABLA PRINCIPAL DE LA PLANILLA */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-[#002f6c]" />
                <p className="text-xs font-bold text-slate-500">Generando planilla oficial...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs border border-dashed border-slate-300 rounded-xl">
                No existen registros ni actas que coincidan con los filtros y período seleccionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[10px] sm:text-[11px] border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-extrabold border-b-2 border-slate-300">
                      <th className="p-2 border-r border-slate-300 text-center w-12">N°</th>
                      <th className="p-2 border-r border-slate-300 text-center w-16">Fecha</th>
                      <th className="p-2 border-r border-slate-300 text-left w-48">Trabajador (C.I. / Cargo)</th>
                      <th className="p-2 border-r border-slate-300 text-center w-24">Operación</th>
                      <th className="p-2 border-r border-slate-300 text-left">Detalle de Prendas / Ítems</th>
                      <th className="p-2 border-r border-slate-300 text-center w-12">Cant.</th>
                      <th className="p-2 border-r border-slate-300 text-left w-28">Motivo / Condición</th>
                      <th className="p-2 text-center w-28">Firma / Conforme</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {records.map((r, idx) => {
                      const totalQty = r.items.reduce((acc: number, item: any) => acc + item.quantity, 0);
                      const badge = translateTypeBadge(r.transactionType);

                      return (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition">
                          {/* N° / FOLIO */}
                          <td className="p-2 border-r border-slate-300 text-center font-mono font-bold text-slate-700">
                            {idx + 1}
                            <span className="block text-[8px] text-slate-400 font-mono">#{r.folio}</span>
                          </td>

                          {/* FECHA */}
                          <td className="p-2 border-r border-slate-300 text-center font-semibold text-slate-600 whitespace-nowrap">
                            {formatDateOnly(r.date)}
                          </td>

                          {/* TRABAJADOR */}
                          <td className="p-2 border-r border-slate-300">
                            <p className="font-black text-slate-900 leading-snug">{r.workerName}</p>
                            <p className="text-[9px] text-slate-600 font-mono">C.I. {r.workerCi}</p>
                            <p className="text-[9px] text-slate-500 italic leading-tight">
                              {r.workerPosition} • {r.workerDepartment}
                            </p>
                          </td>

                          {/* OPERACIÓN */}
                          <td className="p-2 border-r border-slate-300 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${badge.bg}`}>
                              {badge.label}
                            </span>
                          </td>

                          {/* DETALLE DE ÍTEMS / PRENDAS */}
                          <td className="p-2 border-r border-slate-300 font-medium">
                            <ul className="space-y-1">
                              {r.items.map((it: any) => (
                                <li key={it.id} className="flex justify-between items-center gap-2">
                                  <span className="text-slate-800">
                                    • {it.itemName}
                                  </span>
                                  <span className="font-mono font-black text-slate-700 shrink-0">
                                    x{it.quantity}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </td>

                          {/* TOTAL CANTIDAD */}
                          <td className="p-2 border-r border-slate-300 text-center font-black text-slate-900 font-mono">
                            {totalQty}
                          </td>

                          {/* MOTIVO */}
                          <td className="p-2 border-r border-slate-300 text-slate-700 text-[10px]">
                            {r.items.map((it: any) => (
                              <div key={it.id} className="truncate" title={translateReason(it.conditionReason)}>
                                {translateReason(it.conditionReason)}
                              </div>
                            ))}
                          </td>

                          {/* FIRMA */}
                          <td className="p-2 text-center align-middle">
                            {r.signatureUrl ? (
                              <div className="flex flex-col items-center justify-center">
                                <img
                                  src={r.signatureUrl}
                                  alt="Firma"
                                  className="h-8 max-w-[90px] object-contain mix-blend-multiply"
                                />
                                <span className="text-[7px] text-emerald-700 font-bold flex items-center gap-0.5">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  Firmado
                                </span>
                              </div>
                            ) : (
                              <div className="h-9 border border-dashed border-slate-300 rounded flex items-center justify-center text-[8px] text-slate-400">
                                Firma física
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* PIE DE PÁGINA: FIRMAS OFICIALES DE AUDITORÍA Y CONTROL */}
            <div className="mt-8 pt-6 border-t-2 border-slate-200 grid grid-cols-2 gap-12 text-center text-xs">
              <div className="flex flex-col items-center justify-end">
                <div className="w-48 border-b-2 border-slate-800 pb-1 mb-1"></div>
                <p className="font-black text-slate-900">RESPONSABLE DE ALMACÉN</p>
                <p className="text-[10px] text-slate-500 font-bold">Entrega / Recepción de Insumos</p>
                <p className="text-[9px] text-slate-400">ENDE DEORURO</p>
              </div>

              <div className="flex flex-col items-center justify-end">
                <div className="w-48 border-b-2 border-slate-800 pb-1 mb-1"></div>
                <p className="font-black text-slate-900">SEGURIDAD INDUSTRIAL Y SALUD</p>
                <p className="text-[10px] text-slate-500 font-bold">Vo.Bo. Supervisión y Fiscalización</p>
                <p className="text-[9px] text-slate-400">ENDE DEORURO</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
