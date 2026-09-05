'use client';

import React, { useState, useEffect } from 'react';
import { 
  Droplets, Plus, RefreshCw, Printer, Trash2, 
  CheckCircle2, AlertCircle, ArrowLeft, Calendar, 
  User, FileText, TrendingDown, TrendingUp, Table, Info,
  Sparkles, Camera, MapPin, Check, Eye, Package, ArrowUpRight, ArrowDownRight, Layers, X, Clock, BarChart3
} from 'lucide-react';
import Swal from 'sweetalert2';
import { 
  createWaterDelivery, 
  getWaterDeliveries, 
  deleteWaterDelivery, 
  getWaterMonthlySummary,
  getAnnualContractAudit,
  createWaterWithdrawal,
  getWaterWithdrawals,
  deleteWaterWithdrawal,
  getWaterInventoryBalance,
  OFFICIAL_CONTRACT_SCHEDULE
} from '@/app/actions/waterSupply';
import { 
  WaterSupplyInput, 
  WaterSupplyData, 
  WaterWithdrawalInput, 
  WaterWithdrawalData, 
  WaterAnnualMonthRow 
} from '@/lib/waterSupplyTypes';
import WaterAiScannerModal from './WaterAiScannerModal';

const ENDE_AREAS = [
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

interface ModuloControlAguaProps {
  showTabs?: boolean;
}

export default function ModuloControlAgua({ showTabs = true }: ModuloControlAguaProps) {
  // Pestaña activa por defecto: 'salidas' para que vea de inmediato la cámara con IA y el control de áreas
  const [subTab, setSubTab] = useState<'salidas' | 'recepciones' | 'matriz'>('salidas');
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'print'>('list');

  // Estados de Recepciones (Entradas Proveedor Aquabel)
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalReceived: 0,
    totalContracted: 0,
    totalDifference: 0,
    deliveriesCount: 0
  });

  // Estados de Salidas (Retiros Áreas)
  const [withdrawals, setWithdrawals] = useState<WaterWithdrawalData[]>([]);
  const [inventoryBalance, setInventoryBalance] = useState({
    totalReceived: 286,
    totalDispatched: 0,
    currentStock: 286,
    sectorStats: [] as any[]
  });

  // Estados de Matriz Anual
  const [annualData, setAnnualData] = useState<{
    rows: WaterAnnualMonthRow[];
    summary: {
      totalContractYear: number;
      totalReceivedYear: number;
      totalRemainingContract: number;
      cumulativeAugustQuota: number;
      cumulativeAugustReceived: number;
      cumulativeExcessAugust: number;
    };
  }>({
    rows: [],
    summary: {
      totalContractYear: 440,
      totalReceivedYear: 286,
      totalRemainingContract: 154,
      cumulativeAugustQuota: 255,
      cumulativeAugustReceived: 286,
      cumulativeExcessAugust: 31
    }
  });

  const [loading, setLoading] = useState(false);

  // Filtro de Mes/Año (YYYY-MM o 'all' para ver todo el historial)
  const [filterMonth, setFilterMonth] = useState<string>('all');

  // Form State: Entrega de Proveedor (Aquabel por defecto, sin número de remisión requerido)
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [supplierName, setSupplierName] = useState('AQUABEL');
  const [bottlesReceived, setBottlesReceived] = useState<number>(30);
  const [bottlesContracted, setBottlesContracted] = useState<number>(30);
  const [bottleCapacity, setBottleCapacity] = useState('20 Litros');
  const [containerCondition, setContainerCondition] = useState('Conforme y Sellado');
  const [receivedBy, setReceivedBy] = useState('TATIANA TORRES');
  const [observations, setObservations] = useState('');
  const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);

  // Form State: Salida Manual a Área
  const [showManualWithdrawalModal, setShowManualWithdrawalModal] = useState(false);
  const [withdrawalDate, setWithdrawalDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [withdrawalRecipient, setWithdrawalRecipient] = useState('');
  const [withdrawalSector, setWithdrawalSector] = useState(ENDE_AREAS[0]);
  const [withdrawalQuantity, setWithdrawalQuantity] = useState<number>(1);
  const [withdrawalNotes, setWithdrawalNotes] = useState('');
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);

  // Modal IA OCR
  const [showAiModal, setShowAiModal] = useState(false);

  // Modal Foto Respaldo
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, [filterMonth]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const list = await getWaterDeliveries(filterMonth);
      const sum = await getWaterMonthlySummary(filterMonth);
      setDeliveries(Array.isArray(list) ? list : []);
      if (sum) {
        setSummary({
          totalReceived: sum.totalReceived || 0,
          totalContracted: sum.totalContracted || 0,
          totalDifference: sum.totalDifference || 0,
          deliveriesCount: sum.deliveriesCount || 0
        });
      }

      const withs = await getWaterWithdrawals(filterMonth);
      const balance = await getWaterInventoryBalance();
      setWithdrawals(Array.isArray(withs) ? withs : []);
      if (balance) {
        setInventoryBalance({
          totalReceived: balance.totalReceived ?? 286,
          totalDispatched: balance.totalDispatched ?? 0,
          currentStock: balance.currentStock ?? 286,
          sectorStats: Array.isArray(balance.sectorStats) ? balance.sectorStats : []
        });
      }

      const annual = await getAnnualContractAudit();
      if (annual && annual.success) {
        setAnnualData({
          rows: Array.isArray(annual.rows) ? annual.rows : [],
          summary: annual.summary || {
            totalContractYear: 440,
            totalReceivedYear: 286,
            totalRemainingContract: 154,
            cumulativeAugustQuota: 255,
            cumulativeAugustReceived: 286,
            cumulativeExcessAugust: 31
          }
        });
      }
    } catch (err) {
      console.error('Error cargando datos de control de agua:', err);
    } finally {
      setLoading(false);
    }
  };

  const getContractQuotaForDate = (dateStr: string) => {
    if (!dateStr) return 30;
    const month = new Date(dateStr + 'T00:00:00').getMonth() + 1;
    const match = OFFICIAL_CONTRACT_SCHEDULE.find((s) => s.monthNum === month);
    return match ? match.quota : 30;
  };

  const handleOpenNewDelivery = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultQuota = getContractQuotaForDate(todayStr);
    setDeliveryDate(todayStr);
    setSupplierName('AQUABEL');
    setBottlesReceived(defaultQuota);
    setBottlesContracted(defaultQuota);
    setBottleCapacity('20 Litros');
    setContainerCondition('Conforme y Sellado');
    setReceivedBy('TATIANA TORRES');
    setObservations('');
    setViewMode('form');
  };

  const handleDateChange = (newDate: string) => {
    setDeliveryDate(newDate);
    const monthQuota = getContractQuotaForDate(newDate);
    setBottlesContracted(monthQuota);
  };

  const handleSubmitDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryDate) {
      Swal.fire({ icon: 'warning', title: 'Fecha Obligatoria', text: 'Ingrese la fecha de recepción.' });
      return;
    }
    if (!receivedBy.trim()) {
      Swal.fire({ icon: 'warning', title: 'Responsable Obligatorio', text: 'Especifique el nombre de quien recibe.' });
      return;
    }

    setIsSubmittingDelivery(true);
    const payload: WaterSupplyInput = {
      deliveryDate,
      supplierName: 'AQUABEL',
      bottlesReceived: Number(bottlesReceived),
      bottlesContracted: Number(bottlesContracted),
      bottleCapacity,
      containerCondition,
      receivedBy,
      observations
    };

    const res = await createWaterDelivery(payload);
    setIsSubmittingDelivery(false);

    if (res.success) {
      Swal.fire({
        icon: 'success',
        title: 'Recepción Registrada',
        text: 'Los botellones recibidos de Aquabel fueron guardados en el sistema.',
        timer: 1800,
        showConfirmButton: false
      });
      setViewMode('list');
      loadAllData();
    } else {
      Swal.fire({ icon: 'error', title: 'Error al Guardar', text: res.error });
    }
  };

  const handleDeleteDelivery = async (id: string) => {
    const confirm = await Swal.fire({
      title: '¿Eliminar este registro?',
      text: 'Se eliminará esta recepción de agua del historial.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
      const res = await deleteWaterDelivery(id);
      if (res.success) {
        Swal.fire({ icon: 'success', title: 'Registro eliminado', timer: 1500, showConfirmButton: false });
        loadAllData();
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: res.error });
      }
    }
  };

  const handleSubmitManualWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawalRecipient.trim()) {
      Swal.fire({ icon: 'warning', title: 'Nombre requerido', text: 'Indique el nombre y apellido de quien retira.' });
      return;
    }

    setIsSubmittingWithdrawal(true);
    const res = await createWaterWithdrawal({
      withdrawalDate,
      recipientName: withdrawalRecipient,
      sector: withdrawalSector,
      bottlesQuantity: withdrawalQuantity,
      signaturePresent: true,
      notes: withdrawalNotes
    });
    setIsSubmittingWithdrawal(false);

    if (res.success) {
      Swal.fire({
        icon: 'success',
        title: 'Salida Registrada',
        text: `Se registró el retiro de ${withdrawalQuantity} botellón(es) para el área de ${withdrawalSector}.`,
        timer: 1800,
        showConfirmButton: false
      });
      setShowManualWithdrawalModal(false);
      setWithdrawalRecipient('');
      setWithdrawalQuantity(1);
      setWithdrawalNotes('');
      loadAllData();
    } else {
      Swal.fire({ icon: 'error', title: 'Error', text: res.error });
    }
  };

  const handleDeleteWithdrawal = async (id: string, name: string) => {
    const confirm = await Swal.fire({
      title: '¿Eliminar registro de salida?',
      text: `Se eliminará el retiro de agua asignado a ${name}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
      const res = await deleteWaterWithdrawal(id);
      if (res.success) {
        Swal.fire({ icon: 'success', title: 'Registro eliminado', timer: 1500, showConfirmButton: false });
        loadAllData();
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: res.error });
      }
    }
  };

  // Cálculo de diferencia en vivo para el formulario de entrega
  const liveDiff = Number(bottlesReceived || 0) - Number(bottlesContracted || 0);

  return (
    <div className="space-y-6">

      {/* VISTA 1: PRINCIPAL CON SUB-PESTAÑAS */}
      {viewMode === 'list' && (
        <div className="space-y-6">

          {/* BARRA SUPERIOR DE SUB-PESTAÑAS */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setSubTab('salidas')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black transition ${
                  subTab === 'salidas'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Salidas y Retiros por Área (Firmas y Cámara IA)</span>
              </button>

              <button
                onClick={() => setSubTab('recepciones')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black transition ${
                  subTab === 'recepciones'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Droplets className="w-4 h-4" />
                <span>Recepciones Aquabel (Ingresos)</span>
              </button>

              <button
                onClick={() => setSubTab('matriz')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black transition ${
                  subTab === 'matriz'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Table className="w-4 h-4 text-emerald-400" />
                <span>Matriz Anual Oficial (440 Bidones)</span>
              </button>
            </div>

            {/* BOTONES DE ACCIÓN RÁPIDA */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowAiModal(true)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition transform hover:scale-[1.02]"
                title="Toma foto a la planilla de firmas y la IA reconocerá nombres, apellidos, áreas y cantidades automáticamente"
              >
                <Camera className="w-4 h-4 text-amber-300" />
                <span>📷 Escanear Planilla con IA</span>
              </button>

              {subTab === 'recepciones' && (
                <button
                  onClick={handleOpenNewDelivery}
                  className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Registrar Recepción Aquabel</span>
                </button>
              )}

              {subTab === 'salidas' && (
                <button
                  onClick={() => setShowManualWithdrawalModal(true)}
                  className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Retiro Manual</span>
                </button>
              )}
            </div>
          </div>

          {/* 4 TARJETAS PRINCIPALES DE RESUMEN GLOBAL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Tarjeta 1: Saldo del Contrato Anual */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-800 text-white p-5 rounded-2xl shadow-md flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-200">
                    Contrato Anual Aquabel (11 Meses)
                  </span>
                  <p className="text-3xl font-black font-mono mt-0.5">
                    {annualData.summary.totalRemainingContract}
                    <span className="text-xs font-normal ml-1 text-blue-200">disp.</span>
                  </p>
                </div>
                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Droplets className="w-5 h-5 text-amber-300" />
                </div>
              </div>
              <div className="pt-3 border-t border-white/20 mt-3 flex justify-between text-[11px] text-blue-100">
                <span>Total Contrato: <strong>{annualData.summary.totalContractYear}</strong></span>
                <span>Recibidas: <strong>{annualData.summary.totalReceivedYear}</strong></span>
              </div>
            </div>

            {/* Tarjeta 2: Balance Acumulado (Corte Agosto) */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Acumulado Corte a Agosto
                  </span>
                  <p className={`text-2xl font-black font-mono mt-0.5 ${
                    annualData.summary.cumulativeExcessAugust > 0 ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {annualData.summary.cumulativeExcessAugust > 0 ? `+${annualData.summary.cumulativeExcessAugust}` : annualData.summary.cumulativeExcessAugust}
                    <span className="text-xs font-normal ml-1 text-slate-600">en exceso</span>
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl ${
                  annualData.summary.cumulativeExcessAugust > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 mt-3 flex justify-between text-[11px] text-slate-500 font-medium">
                <span>Prog. hasta Ago: <strong>{annualData.summary.cumulativeAugustQuota}</strong></span>
                <span>Recibidas: <strong>{annualData.summary.cumulativeAugustReceived}</strong></span>
              </div>
            </div>

            {/* Tarjeta 3: Mes Seleccionado */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Período ({filterMonth === 'all' ? 'Historial Completo' : filterMonth})
                  </span>
                  <p className="text-2xl font-black font-mono text-slate-900 mt-0.5">
                    {summary.totalReceived}
                    <span className="text-xs font-normal ml-1 text-slate-500">de {summary.totalContracted || getContractQuotaForDate(`${filterMonth}-01`)}</span>
                  </p>
                </div>
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 mt-3 flex justify-between items-center text-[11px]">
                <span className="text-slate-500 font-medium">Balance Mes:</span>
                <span className={`font-mono font-bold ${
                  summary.totalDifference < 0 ? 'text-rose-600' : summary.totalDifference > 0 ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {summary.totalDifference > 0 ? `+${summary.totalDifference}` : summary.totalDifference} bidones
                </span>
              </div>
            </div>

            {/* Tarjeta 4: Stock Botellones Llenos en Almacén */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-md flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">
                    Stock en Oficina / Almacén
                  </span>
                  <p className="text-3xl font-black font-mono text-emerald-400 mt-0.5">
                    {inventoryBalance.currentStock}
                    <span className="text-xs font-normal ml-1 text-slate-300">llenos</span>
                  </p>
                </div>
                <div className="p-2.5 bg-white/10 rounded-xl">
                  <Package className="w-5 h-5 text-emerald-300" />
                </div>
              </div>
              <div className="pt-3 border-t border-white/10 mt-3 flex justify-between text-[11px] text-slate-300">
                <span>Ingresados Aquabel: <strong>{inventoryBalance.totalReceived}</strong></span>
                <span>Salidas a Áreas: <strong>{inventoryBalance.totalDispatched}</strong></span>
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* SUB-PESTAÑA 1: SALIDAS POR ÁREA (CON CAMARA IA Y FRECUENCIA SEMANAL)    */}
          {/* ========================================================================= */}
          {subTab === 'salidas' && (
            <div className="space-y-5">
              
              {/* BANNER GIGANTE DE LA CÁMARA CON IA */}
              <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 border border-purple-500/30 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-purple-500/30 text-amber-300 rounded-2xl border border-purple-400/40 shadow-inner">
                    <Camera className="w-8 h-8 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                        OCR con IA Activo
                      </span>
                      <span className="text-xs text-purple-200 font-mono">Reconocimiento Automático</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black tracking-tight mt-1">
                      Digitalizar Planilla de Firmas con la Cámara del Celular / Foto
                    </h3>
                    <p className="text-xs text-indigo-200 max-w-2xl leading-relaxed mt-0.5">
                      Sácale foto a la hoja donde firman las personas que recogen agua de tu oficina. La IA leerá automáticamente <strong>Nombres, Apellidos, Área</strong> (Administración, Mantenimiento Urbano/Rural, Transmisión, RRHH, Comercial, etc.) y <strong>Cantidades</strong>.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowAiModal(true)}
                  className="w-full md:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs sm:text-sm px-6 py-3.5 rounded-2xl shadow-xl transition transform hover:scale-[1.03] shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-purple-950" />
                  <span>TOMAR FOTO / ESCANEAR PLANILLA</span>
                </button>
              </div>

              {/* CONTROL DE FRECUENCIA DE RETIROS POR ÁREA (SEMANAL Y MENSUAL) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase">
                      Control de Frecuencia de Retiros por Área (Semanal / Mensual)
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Monitoreo de cuántas veces a la semana viene cada área a recoger agua
                  </span>
                </div>

                {inventoryBalance.sectorStats.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">Aún no hay retiros registrados para calcular frecuencias por área.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                    {inventoryBalance.sectorStats.map((st: any, i: number) => (
                      <div 
                        key={i} 
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between space-y-2 hover:border-indigo-300 transition"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-extrabold text-xs text-slate-800 uppercase truncate">
                            {st.sector}
                          </span>
                          <span className="font-mono font-black text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                            {st.totalBottles} bot.
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 font-medium">
                          <span>Esta semana: <strong className="text-slate-900">{st.weeklyCount || 0} visitas</strong></span>
                          <span>Este mes: <strong className="text-slate-900">{st.monthlyCount || 0}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* TABLA DE SALIDAS DETALLADAS */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase">
                      Historial Detallado de Retiros de Agua ({withdrawals.length} registros)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Nombres, áreas y firmas de quienes recogieron botellones en la oficina.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowManualWithdrawalModal(true)}
                      className="flex items-center gap-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-xl transition"
                    >
                      <Plus className="w-3.5 h-3.5 text-indigo-600" />
                      <span>+ Anotar Retiro Manual</span>
                    </button>
                    <button
                      onClick={loadAllData}
                      disabled={loading}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition"
                      title="Actualizar"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {withdrawals.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs font-bold border-2 border-dashed border-slate-200 rounded-2xl">
                    No hay retiros registrados este mes. Usa <strong>"📷 Escanear Planilla con IA"</strong> o <strong>"+ Anotar Retiro Manual"</strong>.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                    <table className="w-full text-left text-xs divide-y divide-slate-200 min-w-[700px]">
                      <thead className="bg-slate-50 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="p-3 w-10 text-center">N°</th>
                          <th className="p-3 w-28">Fecha</th>
                          <th className="p-3">Nombre y Apellido</th>
                          <th className="p-3">Área / Sector</th>
                          <th className="p-3 text-center w-24">Cant. (20L)</th>
                          <th className="p-3 text-center w-24">Firma</th>
                          <th className="p-3 text-center w-20">Foto Respaldo</th>
                          <th className="p-3 text-center w-12">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {withdrawals.map((w, idx) => (
                          <tr key={w.id} className="hover:bg-slate-50 transition">
                            <td className="p-3 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-3 font-mono font-bold text-slate-900">{w.withdrawal_date}</td>
                            <td className="p-3 uppercase font-extrabold text-slate-800">{w.recipient_name}</td>
                            <td className="p-3">
                              <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded text-[11px] font-bold">
                                {w.sector}
                              </span>
                            </td>
                            <td className="p-3 text-center font-mono font-black text-slate-900 text-sm">
                              {w.bottles_quantity}
                            </td>
                            <td className="p-3 text-center">
                              {w.signature_present ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" /> Firmado
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">Sin firma</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {w.photo_url ? (
                                <button
                                  onClick={() => setPreviewPhotoUrl(w.photo_url)}
                                  className="text-indigo-600 hover:text-indigo-800 p-1 hover:bg-indigo-50 rounded transition"
                                  title="Ver foto de la planilla"
                                >
                                  <Eye className="w-4 h-4 mx-auto" />
                                </button>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleDeleteWithdrawal(w.id, w.recipient_name)}
                                className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg transition"
                                title="Eliminar salida"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

          {/* ========================================================================= */}
          {/* SUB-PESTAÑA 2: RECEPCIONES DE AQUABEL (INGRESOS DE PROVEEDOR)             */}
          {/* ========================================================================= */}
          {subTab === 'recepciones' && (
            <div className="space-y-4">
              
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs font-bold text-slate-600 uppercase">Período:</label>
                  <button
                    type="button"
                    onClick={() => setFilterMonth('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                      filterMonth === 'all'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    🌐 Todos los Meses
                  </button>
                  <input
                    type="month"
                    value={filterMonth === 'all' ? '' : filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value || 'all')}
                    className="border border-slate-300 rounded-xl px-3 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 bg-slate-50"
                  />
                  {filterMonth !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setFilterMonth('all')}
                      className="text-xs text-blue-600 font-bold hover:underline"
                    >
                      Mostrar Todo
                    </button>
                  )}
                  <button
                    onClick={loadAllData}
                    disabled={loading}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition"
                    title="Actualizar"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('print')}
                    disabled={deliveries.length === 0}
                    className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-extrabold px-3.5 py-2 rounded-xl transition shadow"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Imprimir Acta Mensual</span>
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-12 text-xs font-bold text-slate-500">Cargando recepciones de Aquabel...</div>
              ) : deliveries.length === 0 ? (
                <div className="text-center py-14 text-slate-500 text-xs font-bold border-2 border-dashed border-slate-200 rounded-2xl bg-white space-y-3 p-6">
                  <p>No hay recepciones de Aquabel registradas en el mes seleccionado ({filterMonth}).</p>
                  <button
                    type="button"
                    onClick={() => setFilterMonth('all')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-extrabold text-xs shadow transition inline-flex items-center gap-1.5"
                  >
                    🌐 Ver todas las recepciones registradas (Historial Completo)
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
                  <table className="w-full text-left text-xs divide-y divide-slate-200 min-w-[700px]">
                    <thead className="bg-slate-50 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3 w-10 text-center">N°</th>
                        <th className="p-3">Fecha Recepción</th>
                        <th className="p-3">Empresa Proveedora</th>
                        <th className="p-3 text-center">Recibidos en Físico</th>
                        <th className="p-3 text-center">Cuota Contrato</th>
                        <th className="p-3 text-center">Diferencia</th>
                        <th className="p-3">Condición Envases</th>
                        <th className="p-3">Recibido Por</th>
                        <th className="p-3 text-center w-12">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {deliveries.map((del, idx) => (
                        <tr key={del.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-mono font-bold text-slate-900">{del.delivery_date}</td>
                          <td className="p-3 font-bold text-blue-700">{del.supplier_name || 'AQUABEL'}</td>
                          <td className="p-3 text-center font-mono font-black text-blue-700 bg-blue-50/50">
                            {del.bottles_received}
                          </td>
                          <td className="p-3 text-center font-mono text-slate-600">{del.bottles_contracted}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-mono font-bold text-[10px] ${
                              del.difference === 0 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : del.difference < 0 
                                ? 'bg-rose-50 text-rose-700' 
                                : 'bg-amber-50 text-amber-700'
                            }`}>
                              {del.difference > 0 ? `+${del.difference}` : del.difference}
                            </span>
                          </td>
                          <td className="p-3 text-[11px] text-slate-600">{del.container_condition}</td>
                          <td className="p-3 uppercase text-[11px] font-bold text-slate-800">{del.received_by}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleDeleteDelivery(del.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg transition"
                              title="Eliminar entrega"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-PESTAÑA 3: MATRIZ ANUAL OFICIAL (440 BIDONES FEBRERO A DICIEMBRE)     */}
          {/* ========================================================================= */}
          {subTab === 'matriz' && (
            <div className="space-y-6">
              
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-black uppercase text-slate-900 tracking-tight">
                      Matriz Oficial de Cronograma y Control Anual de Recargas (20L)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Consolidado oficial de Febrero a Diciembre (Total Contratado: 440 Recargas).
                    </p>
                  </div>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Imprimir Matriz</span>
                  </button>
                </div>

                {/* TABLA IDÉNTICA AL EXCEL DE LA IMAGEN */}
                <div className="overflow-x-auto border border-slate-300 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                    <thead>
                      <tr className="bg-slate-900 text-white font-black uppercase text-[11px]">
                        <th className="p-3 border-r border-slate-800">Mes</th>
                        <th className="p-3 border-r border-slate-800 text-center">Cronograma de recargas</th>
                        <th className="p-3 border-r border-slate-800 text-center">Recargas recibidas</th>
                        <th className="p-3 border-r border-slate-800 text-center">Saldo disponible</th>
                        <th className="p-3 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium">
                      {annualData.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-bold text-slate-900 border-r border-slate-200">
                            {row.monthName}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-slate-800 border-r border-slate-200">
                            {row.contractQuota}
                          </td>
                          <td className="p-3 text-center font-mono font-black text-slate-900 border-r border-slate-200 bg-slate-50/50">
                            {row.received}
                          </td>
                          <td className={`p-3 text-center font-mono font-black border-r border-slate-200 ${
                            row.balance < 0 ? 'text-rose-600' : row.balance > 0 ? 'text-emerald-700' : 'text-slate-700'
                          }`}>
                            {row.balance > 0 ? `+${row.balance}` : row.balance}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                              row.status === 'Disponible' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : row.status === 'Excedido'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}

                      {/* FILA DE TOTAL ANUAL */}
                      <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-900">
                        <td className="p-3 border-r border-slate-300 font-extrabold uppercase">
                          Total
                        </td>
                        <td className="p-3 text-center font-mono text-sm border-r border-slate-300">
                          {annualData.summary.totalContractYear}
                        </td>
                        <td className="p-3 text-center font-mono text-sm border-r border-slate-300 text-blue-800">
                          {annualData.summary.totalReceivedYear}
                        </td>
                        <td className="p-3 text-center font-mono text-sm border-r border-slate-300 text-emerald-700">
                          {annualData.summary.totalRemainingContract}
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-[10px] font-extrabold uppercase shadow-2xs">
                            Disponible
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* CUADRO INFERIOR IDÉNTICO AL EXCEL */}
                <div className="max-w-md ml-auto pt-2">
                  <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs divide-y divide-slate-200 text-xs">
                    <div className="flex justify-between p-2.5 bg-slate-50 font-bold text-slate-700">
                      <span>Total cronograma de recargas hasta el mes de agosto</span>
                      <span className="font-mono font-black text-slate-900">
                        {annualData.summary.cumulativeAugustQuota}
                      </span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-white font-bold text-slate-700">
                      <span>Total recargas recibidas hasta el mes de agosto</span>
                      <span className="font-mono font-black text-slate-900">
                        {annualData.summary.cumulativeAugustReceived}
                      </span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-amber-50 font-black text-amber-900">
                      <span>Cantidad de recargas en exceso</span>
                      <span className="font-mono font-black text-amber-700">
                        {annualData.summary.cumulativeExcessAugust}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* VISTA 2: FORMULARIO DE RECEPCIÓN DE AQUABEL (SIN N° DE GUÍA, DIFERENCIA EN VIVO) */}
      {viewMode === 'form' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 max-w-3xl mx-auto">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 uppercase">
                Recepción de Botellones de Agua - AQUABEL
              </h3>
              <p className="text-xs text-slate-500">
                Control de ingreso de botellones físicos y auditoría contra contrato
              </p>
            </div>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg transition"
            >
              Cancelar
            </button>
          </div>

          <form onSubmit={handleSubmitDelivery} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Fecha de Recepción *</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Empresa Proveedora</label>
                <input
                  type="text"
                  value="AQUABEL"
                  readOnly
                  className="w-full border border-slate-200 bg-slate-100 text-blue-900 font-black rounded-xl px-3 py-2 text-xs cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Botellones Recibidos en Físico *</label>
                <input
                  type="number"
                  min="0"
                  value={bottlesReceived}
                  onChange={(e) => setBottlesReceived(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-base font-mono font-black text-blue-700 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">
                  Botellones Estipulados por Contrato (Mes)
                </label>
                <input
                  type="number"
                  min="0"
                  value={bottlesContracted}
                  onChange={(e) => setBottlesContracted(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-base font-mono font-black text-slate-700 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              {/* DIFERENCIA AUTOMÁTICA EN VIVO */}
              <div className="sm:col-span-2 bg-blue-50/60 border border-blue-200 p-3.5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-blue-900 uppercase block">Diferencia Automática Calculada:</span>
                  <span className="text-xs text-blue-700">Físicos Recibidos ({bottlesReceived}) - Cuota de Contrato ({bottlesContracted})</span>
                </div>
                <span className={`text-base font-mono font-black px-3 py-1 rounded-lg ${
                  liveDiff === 0 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : liveDiff > 0 
                    ? 'bg-amber-100 text-amber-900' 
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {liveDiff > 0 ? `+${liveDiff} (Exceso)` : liveDiff < 0 ? `${liveDiff} (Faltante)` : '0 (Exacto)'}
                </span>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Funcionario que Recibe *</label>
                <input
                  type="text"
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 uppercase"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Estado / Condición de Envases</label>
                <select
                  value={containerCondition}
                  onChange={(e) => setContainerCondition(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-blue-600"
                >
                  <option value="Conforme y Sellado">Conforme y Sellado</option>
                  <option value="Conforme (Algunos envases con desgaste)">Conforme (Envases con desgaste)</option>
                  <option value="Observado / Con fuga">Observado / Con fuga</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Observaciones</label>
                <textarea
                  rows={2}
                  placeholder="Notas de conformidad o novedades en la entrega de Aquabel..."
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                />
              </div>

            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmittingDelivery}
                className="px-6 py-2.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow transition"
              >
                {isSubmittingDelivery ? 'Guardando...' : 'Guardar Recepción Aquabel'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VISTA 3: IMPRESIÓN DEL ACTA MENSUAL */}
      {viewMode === 'print' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
            <button
              onClick={() => setViewMode('list')}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al Listado</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-xs sm:text-sm font-black shadow-lg transition"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>IMPRIMIR ACTA MENSUAL</span>
            </button>
          </div>

          <div className="print-area bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-xl max-w-5xl mx-auto print:shadow-none print:border-none print:w-full print:p-0 font-sans">
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
              <div className="flex items-center gap-4">
                <img 
                  src="/logo-ende.png" 
                  alt="ENDE DEORURO" 
                  className="h-12 w-auto object-contain"
                />
                <div>
                  <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 tracking-tight">ENDE DEORURO - DEPARTAMENTO DE SEGURIDAD INDUSTRIAL</h2>
                  <p className="text-xs font-extrabold text-blue-800 uppercase tracking-wide">ACTA MENSUAL DE CONFORMIDAD Y CONTROL DE SUMINISTRO DE AGUA DE MESA (20L)</p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block bg-slate-900 text-white font-mono font-bold text-xs px-3 py-1.5 rounded uppercase">
                  MES: {filterMonth}
                </span>
                <p className="text-[10px] text-slate-500 font-bold mt-1 font-mono">
                  EMISIÓN: {new Date().toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6 text-xs">
              <div className="border border-slate-300 p-3 rounded-xl bg-slate-50">
                <span className="text-slate-500 font-bold block text-[10px] uppercase">Total Recibido en Mes</span>
                <span className="text-base font-black font-mono text-slate-900">{summary.totalReceived} Bidones</span>
              </div>
              <div className="border border-slate-300 p-3 rounded-xl bg-slate-50">
                <span className="text-slate-500 font-bold block text-[10px] uppercase">Cuota Contratada</span>
                <span className="text-base font-black font-mono text-slate-900">{summary.totalContracted} Bidones</span>
              </div>
              <div className="border border-slate-300 p-3 rounded-xl bg-slate-50">
                <span className="text-slate-500 font-bold block text-[10px] uppercase">Estado de Cumplimiento</span>
                <span className={`text-base font-black font-mono ${
                  summary.totalDifference === 0 ? 'text-emerald-700' : summary.totalDifference < 0 ? 'text-rose-600' : 'text-amber-700'
                }`}>
                  {summary.totalDifference === 0 ? '100% Conforme' : summary.totalDifference < 0 ? `${summary.totalDifference} Faltante` : `+${summary.totalDifference} Excedente`}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto mb-8">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-black uppercase text-left">
                    <th className="p-2 text-center w-8 border border-slate-900">N°</th>
                    <th className="p-2 text-center w-24 border border-slate-900">Fecha</th>
                    <th className="p-2 w-28 border border-slate-900">Proveedor</th>
                    <th className="p-2 text-center w-20 border border-slate-900">Recibidos</th>
                    <th className="p-2 text-center w-20 border border-slate-900">Contratados</th>
                    <th className="p-2 text-center w-20 border border-slate-900">Diferencia</th>
                    <th className="p-2 border border-slate-900">Condición Envases</th>
                    <th className="p-2 border border-slate-900">Recibido Por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 border border-slate-300 font-bold">
                  {deliveries.map((del, idx) => (
                    <tr key={del.id} className="hover:bg-slate-50">
                      <td className="p-2 text-center font-mono font-black border-r border-slate-300">{idx + 1}</td>
                      <td className="p-2 text-center font-mono text-xs border-r border-slate-300">{del.delivery_date}</td>
                      <td className="p-2 font-mono font-bold text-xs border-r border-slate-300">{del.supplier_name || 'AQUABEL'}</td>
                      <td className="p-2 text-center font-mono font-black text-xs border-r border-slate-300">{del.bottles_received}</td>
                      <td className="p-2 text-center font-mono text-xs border-r border-slate-300">{del.bottles_contracted}</td>
                      <td className="p-2 text-center font-mono font-black text-xs border-r border-slate-300">
                        {del.difference === 0 ? '0' : del.difference < 0 ? `${del.difference}` : `+${del.difference}`}
                      </td>
                      <td className="p-2 text-[11px] border-r border-slate-300">{del.container_condition}</td>
                      <td className="p-2 uppercase text-[11px] border-r border-slate-300">{del.received_by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-12 pt-10 text-center text-xs sm:text-sm">
              <div>
                <div className="border-b-2 border-slate-400 w-3/4 mx-auto mb-2"></div>
                <p className="font-black text-slate-900 uppercase">RESPONSABLE DE SEGURIDAD INDUSTRIAL</p>
                <p className="text-xs text-slate-600 font-bold uppercase">ENDE DEORURO</p>
              </div>
              <div>
                <div className="border-b-2 border-slate-400 w-3/4 mx-auto mb-2"></div>
                <p className="font-black text-slate-900 uppercase">REPRESENTANTE EMPRESA PROVEEDORA</p>
                <p className="text-xs text-slate-600 font-bold uppercase">AQUABEL</p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: REGISTRO MANUAL DE SALIDA A ÁREA */}
      {showManualWithdrawalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-800 to-slate-900 text-white p-4 flex justify-between items-center">
              <h4 className="text-sm font-black uppercase">Registrar Retiro de Botellón por Área</h4>
              <button onClick={() => setShowManualWithdrawalModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitManualWithdrawal} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Fecha del Retiro *</label>
                <input
                  type="date"
                  value={withdrawalDate}
                  onChange={(e) => setWithdrawalDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Nombre y Apellido de Quien Retira *</label>
                <input
                  type="text"
                  placeholder="Ej. Juan Carlos Perez"
                  value={withdrawalRecipient}
                  onChange={(e) => setWithdrawalRecipient(e.target.value.toUpperCase())}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold uppercase"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Área o Sector de Destino *</label>
                <select
                  value={withdrawalSector}
                  onChange={(e) => setWithdrawalSector(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold bg-white"
                >
                  {ENDE_AREAS.map((ar) => (
                    <option key={ar} value={ar}>{ar}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Cantidad de Botellones (20L) *</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={withdrawalQuantity}
                  onChange={(e) => setWithdrawalQuantity(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-black text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Nota / Motivo (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej. Recarga para dispensador principal"
                  value={withdrawalNotes}
                  onChange={(e) => setWithdrawalNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowManualWithdrawalModal(false)}
                  className="px-3 py-1.5 font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWithdrawal}
                  className="px-4 py-1.5 font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow"
                >
                  {isSubmittingWithdrawal ? 'Guardando...' : 'Guardar Retiro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ESCANEAR PLANILLA CON IA */}
      <WaterAiScannerModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onSuccess={loadAllData}
      />

      {/* MODAL: VISTA PREVIA DE FOTO */}
      {previewPhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in">
          <div className="bg-slate-900 p-4 rounded-2xl max-w-2xl w-full space-y-3">
            <div className="flex justify-between items-center text-white">
              <span className="text-xs font-bold uppercase">Foto de Respaldo de Planilla</span>
              <button onClick={() => setPreviewPhotoUrl(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-black rounded-xl p-2">
              <img src={previewPhotoUrl} alt="Respaldo" className="max-h-[70vh] object-contain rounded" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
