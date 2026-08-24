'use client';

import React, { useState, useEffect } from 'react';
import { 
  Droplets, Plus, RefreshCw, Printer, Trash2, 
  CheckCircle2, AlertCircle, ArrowLeft, Calendar, 
  User, FileText, TrendingDown, TrendingUp
} from 'lucide-react';
import Swal from 'sweetalert2';
import { 
  createWaterDelivery, 
  getWaterDeliveries, 
  deleteWaterDelivery, 
  getWaterMonthlySummary 
} from '@/app/actions/waterSupply';
import { WaterSupplyInput, WaterSupplyData } from '@/lib/waterSupplyTypes';

interface ModuloControlAguaProps {
  showTabs?: boolean;
}

export default function ModuloControlAgua({ showTabs = true }: ModuloControlAguaProps) {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalReceived: 0,
    totalContracted: 0,
    totalDifference: 0,
    deliveriesCount: 0
  });
  const [loading, setLoading] = useState(false);

  // Filtro de Mes/Año (YYYY-MM)
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Vistas: 'list' | 'form' | 'print'
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'print'>('list');

  // Form State
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [supplierName, setSupplierName] = useState('PROVEEDOR OFICIAL DE AGUA');
  const [bottlesReceived, setBottlesReceived] = useState<number>(20);
  const [bottlesContracted, setBottlesContracted] = useState<number>(20);
  const [bottleCapacity, setBottleCapacity] = useState('20 Litros');
  const [containerCondition, setContainerCondition] = useState('Conforme y Sellado');
  const [receivedBy, setReceivedBy] = useState('');
  const [observations, setObservations] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [filterMonth]);

  const loadData = async () => {
    setLoading(true);
    const list = await getWaterDeliveries(filterMonth);
    const sum = await getWaterMonthlySummary(filterMonth);
    setDeliveries(list);
    setSummary(sum as any);
    setLoading(false);
  };

  const handleOpenNew = () => {
    setDeliveryDate(new Date().toISOString().split('T')[0]);
    setReceiptNumber('');
    setSupplierName('PROVEEDOR OFICIAL DE AGUA');
    setBottlesReceived(20);
    setBottlesContracted(20);
    setBottleCapacity('20 Litros');
    setContainerCondition('Conforme y Sellado');
    setReceivedBy('');
    setObservations('');
    setViewMode('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryDate) {
      Swal.fire({ icon: 'warning', title: 'Fecha Obligatoria', text: 'Ingrese la fecha de recepción de agua.' });
      return;
    }
    if (!receivedBy.trim()) {
      Swal.fire({ icon: 'warning', title: 'Responsable Obligatorio', text: 'Especifique el nombre de quien recibe la entrega.' });
      return;
    }

    setIsSubmitting(true);
    const payload: WaterSupplyInput = {
      deliveryDate,
      receiptNumber,
      supplierName,
      bottlesReceived: Number(bottlesReceived),
      bottlesContracted: Number(bottlesContracted),
      bottleCapacity,
      containerCondition,
      receivedBy,
      observations
    };

    const res = await createWaterDelivery(payload);
    setIsSubmitting(false);

    if (res.success) {
      Swal.fire({
        icon: 'success',
        title: 'Entrega de Agua Registrada',
        text: 'La entrega semanal ha sido auditada y guardada correctamente.',
        timer: 1800,
        showConfirmButton: false
      });
      setViewMode('list');
      loadData();
    } else {
      Swal.fire({ icon: 'error', title: 'Error al Guardar', text: res.error });
    }
  };

  const handleDelete = async (id: string) => {
    const confirm = await Swal.fire({
      title: '¿Eliminar Entrega?',
      text: 'Se eliminará este registro de recepción de agua.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
      const res = await deleteWaterDelivery(id);
      if (res.success) {
        Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1500, showConfirmButton: false });
        loadData();
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: res.error });
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* VISTA 1: LISTADO Y AUDITORÍA DE ENTREGAS */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          
          {/* TARJETAS DE MÉTRICAS DEL CONTRATO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-blue-100 text-blue-700 rounded-2xl">
                <Droplets className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Entregas del Mes</p>
                <p className="text-2xl font-black font-mono text-slate-900">{summary.deliveriesCount}</p>
                <p className="text-[11px] text-slate-500 font-semibold">Remisiones recibidas</p>
              </div>
            </div>

            <div className="bg-blue-50/80 p-5 rounded-2xl border border-blue-200 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-blue-600 text-white rounded-2xl shadow">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-900 uppercase">Total Recibidos</p>
                <p className="text-2xl font-black font-mono text-blue-950">{summary.totalReceived} <span className="text-xs font-normal">bidones</span></p>
                <p className="text-[11px] text-blue-700 font-bold">Botellones de 20 Lts</p>
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-slate-800 text-white rounded-2xl shadow">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 uppercase">Pactado en Contrato</p>
                <p className="text-2xl font-black font-mono text-slate-900">{summary.totalContracted} <span className="text-xs font-normal">bidones</span></p>
                <p className="text-[11px] text-slate-500 font-semibold">Cuota periódica oficial</p>
              </div>
            </div>

            <div className={`p-5 rounded-2xl border shadow-sm flex items-center gap-4 ${
              summary.totalDifference < 0 
                ? 'bg-rose-50 border-rose-200 text-rose-900' 
                : summary.totalDifference > 0 
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <div className={`p-3.5 text-white rounded-2xl shadow ${
                summary.totalDifference < 0 ? 'bg-rose-600' : summary.totalDifference > 0 ? 'bg-amber-500' : 'bg-emerald-600'
              }`}>
                {summary.totalDifference < 0 ? <TrendingDown className="w-7 h-7" /> : <TrendingUp className="w-7 h-7" />}
              </div>
              <div>
                <p className="text-xs font-bold uppercase">Balance / Saldo</p>
                <p className="text-2xl font-black font-mono">
                  {summary.totalDifference > 0 ? `+${summary.totalDifference}` : summary.totalDifference} <span className="text-xs font-normal">bidones</span>
                </p>
                <p className="text-[11px] font-bold">
                  {summary.totalDifference === 0 ? 'Cumplimiento Exacto' : summary.totalDifference < 0 ? 'Faltante de entrega' : 'Excedente entregado'}
                </p>
              </div>
            </div>

          </div>

          {/* BARRA DE ACCIONES Y SELECTOR DE MES */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            
            <div className="flex items-center gap-3">
              <label className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                Filtrar Mes de Auditoría:
              </label>
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-900"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('print')}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-4 py-3 rounded-xl transition shadow"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Imprimir Acta de Conformidad</span>
              </button>

              <button
                onClick={handleOpenNew}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-4 py-3 rounded-xl transition shadow-lg"
              >
                <Plus className="w-4 h-4 text-amber-300" />
                <span>+ Registrar Entrega Semanal</span>
              </button>
            </div>

          </div>

          {/* TABLA HISTÓRICA DE ENTREGAS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                <Droplets className="w-5 h-5 text-blue-600" />
                Historial de Remisiones y Entregas Semanales ({deliveries.length})
              </h3>

              <button
                onClick={loadData}
                disabled={loading}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition"
                title="Actualizar"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-xs font-bold text-slate-500">Cargando entregas de agua...</div>
            ) : deliveries.length === 0 ? (
              <div className="text-center py-14 text-slate-400 text-xs font-bold border-2 border-dashed border-slate-200 rounded-2xl">
                No hay registros de entrega de agua en el mes seleccionado ({filterMonth}).
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full border-collapse text-xs sm:text-sm text-left">
                  <thead>
                    <tr className="bg-slate-900 text-white font-black uppercase text-xs">
                      <th className="p-3 text-center">Fecha Entrega</th>
                      <th className="p-3">N° Guía / Remisión</th>
                      <th className="p-3 text-center">Recibidos</th>
                      <th className="p-3 text-center">Contratados</th>
                      <th className="p-3 text-center">Diferencia</th>
                      <th className="p-3">Estado de Envases</th>
                      <th className="p-3">Recibido Por</th>
                      <th className="p-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-bold">
                    {deliveries.map((del) => (
                      <tr key={del.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 text-center font-mono font-black text-blue-700">
                          {del.delivery_date}
                        </td>
                        <td className="p-3 font-mono font-black text-slate-900">
                          {del.receipt_number || 'S/N'}
                        </td>
                        <td className="p-3 text-center font-mono text-base font-black text-blue-900 bg-blue-50/40">
                          {del.bottles_received}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-700">
                          {del.bottles_contracted}
                        </td>
                        <td className="p-3 text-center font-mono font-black text-sm">
                          {del.difference === 0 ? (
                            <span className="text-emerald-700">0 (Exacto)</span>
                          ) : del.difference < 0 ? (
                            <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">{del.difference} Faltante</span>
                          ) : (
                            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">+{del.difference} Extra</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-700 text-xs">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                            {del.container_condition}
                          </span>
                        </td>
                        <td className="p-3 uppercase text-slate-900 text-xs font-black">
                          {del.received_by}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleDelete(del.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition border border-red-200"
                            title="Eliminar registro"
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

      {/* VISTA 2: FORMULARIO DE REGISTRO */}
      {viewMode === 'form' && (
        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-300 shadow-xl space-y-6">
          
          <div className="flex justify-between items-center border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl">
                <Droplets className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase">
                  Registro de Entrega Semanal de Agua
                </h2>
                <p className="text-xs text-slate-500 font-bold">
                  Auditoría física de recepción de botellones según contrato
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs px-4 py-2 rounded-xl transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-900 uppercase">
                Fecha de Recepción <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                required
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm font-black rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-900 uppercase">
                N° de Guía / Remisión del Proveedor
              </label>
              <input
                type="text"
                placeholder="EJ. REM-2026-8941..."
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm font-black uppercase rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-900 uppercase">
                Empresa Proveedora
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm font-black uppercase rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-900 uppercase">
                Botellones Recibidos (Físico) <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                min="0"
                required
                value={bottlesReceived}
                onChange={(e) => setBottlesReceived(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-lg font-black font-mono rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-900 uppercase">
                Botellones Estipulados (Contrato) <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                min="0"
                required
                value={bottlesContracted}
                onChange={(e) => setBottlesContracted(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-lg font-black font-mono rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-900 uppercase">
                Diferencia Automática
              </label>
              <div className="bg-slate-100 border-2 border-slate-300 rounded-xl px-4 py-3 text-lg font-black font-mono text-center">
                {bottlesReceived - bottlesContracted === 0 ? (
                  <span className="text-emerald-700">0 (Conforme)</span>
                ) : bottlesReceived - bottlesContracted < 0 ? (
                  <span className="text-rose-600">{bottlesReceived - bottlesContracted} (Faltante)</span>
                ) : (
                  <span className="text-amber-700">+{bottlesReceived - bottlesContracted} (Excedente)</span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-900 uppercase">
                Estado y Sellado de los Envases
              </label>
              <select
                value={containerCondition}
                onChange={(e) => setContainerCondition(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-300 text-slate-900 text-xs sm:text-sm font-black rounded-xl px-4 py-3 uppercase"
              >
                <option value="Conforme y Sellado">🟢 Conforme y Sellado</option>
                <option value="Envases Sucios / Deteriorados">🟡 Envases Sucios / Deteriorados</option>
                <option value="Sin Precinto de Seguridad">🔴 Sin Precinto de Seguridad</option>
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-xs font-black text-slate-900 uppercase">
                Funcionario que Recibe y Verifica <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="EJ. JUAN CARLOS CONDORI - ENCARGADO DE ALMACÉN..."
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm font-black uppercase rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-3">
              <label className="block text-xs font-black text-slate-900 uppercase">
                Observaciones de la Entrega
              </label>
              <input
                type="text"
                placeholder="EJ. PROVEEDOR SE COMPROMETE A REPONER FALTANTES EL DÍA VIERNES..."
                value={observations}
                onChange={(e) => setObservations(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm font-black uppercase rounded-xl px-4 py-3"
              />
            </div>

          </div>

          <div className="pt-4 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-black px-5 py-3 rounded-xl transition text-xs sm:text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-slate-900 hover:bg-slate-800 text-white font-black px-7 py-3 rounded-xl transition shadow-lg text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Guardar Entrega</span>
              )}
            </button>
          </div>

        </form>
      )}

      {/* VISTA 3: ACTA OFICIAL IMPRIMIBLE CON CLASE print-area */}
      {viewMode === 'print' && (
        <div className="space-y-4">
          
          <div className="flex justify-between items-center bg-blue-50 border border-blue-200 p-4 rounded-2xl shadow-sm print:hidden">
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
              <span>IMPRIMIR ACTA DE CONFORMIDAD</span>
            </button>
          </div>

          {/* DOCUMENTO OFICIAL IMPRIMIBLE */}
          <div className="print-area bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-xl max-w-4xl mx-auto print:shadow-none print:border-none print:w-full print:p-0 font-sans">
            
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
              <div className="flex items-center gap-4">
                <img 
                  src="/logo-ende.png" 
                  alt="ENDE DEORURO" 
                  className="h-12 w-auto object-contain"
                />
                <div>
                  <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 tracking-tight">ENDE DEORURO - DEPARTAMENTO DE SERVICIOS GENERALES</h2>
                  <p className="text-xs font-extrabold text-blue-800 uppercase tracking-wide">ACTA MENSUAL DE AUDITORÍA Y CONFORMIDAD DE SUMINISTRO DE AGUA</p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block bg-slate-900 text-white font-mono font-bold text-xs px-3 py-1.5 rounded uppercase">
                  PERÍODO: {filterMonth}
                </span>
                <p className="text-[10px] text-slate-500 font-bold mt-1 font-mono">
                  EMISIÓN: {new Date().toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs mb-6 text-center">
              <div>
                <span className="text-slate-500 font-bold block uppercase text-[10px]">Entregas Realizadas:</span>
                <span className="text-base font-black font-mono text-slate-900">{summary.deliveriesCount}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block uppercase text-[10px]">Total Recibidos:</span>
                <span className="text-base font-black font-mono text-blue-900">{summary.totalReceived} bidones</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block uppercase text-[10px]">Total Contratados:</span>
                <span className="text-base font-black font-mono text-slate-900">{summary.totalContracted} bidones</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block uppercase text-[10px]">Diferencia / Balance:</span>
                <span className={`text-base font-black font-mono ${summary.totalDifference < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {summary.totalDifference > 0 ? `+${summary.totalDifference}` : summary.totalDifference} bidones
                </span>
              </div>
            </div>

            <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-900 mb-3 border-l-4 border-blue-600 pl-2">
              DETALLE MENSUAL DE REMISIONES ENTREGADAS POR EL PROVEEDOR
            </h3>

            <div className="overflow-x-auto mb-8">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-black uppercase text-left">
                    <th className="p-2.5 text-center w-10 border border-slate-900">N°</th>
                    <th className="p-2.5 text-center w-24 border border-slate-900">FECHA</th>
                    <th className="p-2.5 border border-slate-900">N° GUÍA / REMISIÓN</th>
                    <th className="p-2.5 text-center border border-slate-900 bg-blue-950">RECIBIDOS (20L)</th>
                    <th className="p-2.5 text-center border border-slate-900">CONTRATADOS</th>
                    <th className="p-2.5 text-center border border-slate-900">DIFERENCIA</th>
                    <th className="p-2.5 border border-slate-900">RECIBIDO POR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 border border-slate-300 font-bold">
                  {deliveries.map((del, idx) => (
                    <tr key={del.id} className="hover:bg-slate-50">
                      <td className="p-2.5 text-center font-mono border-r border-slate-300">{idx + 1}</td>
                      <td className="p-2.5 text-center font-mono border-r border-slate-300">{del.delivery_date}</td>
                      <td className="p-2.5 font-mono border-r border-slate-300">{del.receipt_number || 'S/N'}</td>
                      <td className="p-2.5 text-center font-mono font-black text-blue-950 text-sm border-r border-slate-300 bg-blue-50/40">{del.bottles_received}</td>
                      <td className="p-2.5 text-center font-mono border-r border-slate-300">{del.bottles_contracted}</td>
                      <td className="p-2.5 text-center font-mono border-r border-slate-300">
                        {del.difference === 0 ? '0' : del.difference < 0 ? `${del.difference}` : `+${del.difference}`}
                      </td>
                      <td className="p-2.5 uppercase text-xs border-r border-slate-300">{del.received_by}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-900 text-white font-black">
                    <td colSpan={3} className="p-3 text-center uppercase border border-slate-900">TOTAL CONSOLIDADO MENSUAL</td>
                    <td className="p-3 text-center font-mono text-emerald-400 text-base border border-slate-900">{summary.totalReceived} BIDONES</td>
                    <td className="p-3 text-center font-mono border border-slate-900">{summary.totalContracted} BIDONES</td>
                    <td className="p-3 text-center font-mono border border-slate-900">
                      {summary.totalDifference > 0 ? `+${summary.totalDifference}` : summary.totalDifference}
                    </td>
                    <td className="p-3 border border-slate-900"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-12 pt-12 text-center text-xs sm:text-sm">
              <div>
                <div className="border-b-2 border-slate-400 w-3/4 mx-auto mb-2"></div>
                <p className="font-black text-slate-900 uppercase">RESPONSABLE DE RECEPCIÓN Y ALMACÉN</p>
                <p className="text-xs text-slate-600 font-bold uppercase">ENDE DEORURO</p>
              </div>
              <div>
                <div className="border-b-2 border-slate-400 w-3/4 mx-auto mb-2"></div>
                <p className="font-black text-slate-900 uppercase">SUPERVISIÓN ADMINISTRATIVA Y FINANCIERA</p>
                <p className="text-xs text-slate-600 font-bold uppercase">ENDE DEORURO</p>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
