'use client';

import React, { useState, useEffect } from 'react';
import { 
  Flame, Plus, RefreshCw, Printer, Trash2, Edit2, 
  CheckCircle2, AlertTriangle, XCircle, ShieldCheck, 
  ArrowLeft, Search, Filter, Calendar, MapPin
} from 'lucide-react';
import Swal from 'sweetalert2';
import { 
  saveExtinguisher, 
  getExtinguishers, 
  deleteExtinguisher, 
  getExtinguisherSummary 
} from '@/app/actions/extinguisher';
import { 
  AGENT_TYPES, 
  CAPACITIES, 
  FireExtinguisherInput, 
  FireExtinguisherData 
} from '@/lib/extinguisherTypes';

interface ModuloExtintoresProps {
  showTabs?: boolean;
}

export default function ModuloExtintores({ showTabs = true }: ModuloExtintoresProps) {
  const [extinguishers, setExtinguishers] = useState<any[]>([]);
  const [summary, setSummary] = useState({ total: 0, vigentes: 0, porVencer: 0, vencidos: 0 });
  const [loading, setLoading] = useState(false);

  // Filtros
  const [filterLocation, setFilterLocation] = useState('TODAS');
  const [filterStatus, setFilterStatus] = useState('TODOS');
  const [searchTerm, setSearchTerm] = useState('');

  // Vistas: 'list' | 'form' | 'print'
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'print'>('list');

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');
  const [agentType, setAgentType] = useState<string>(AGENT_TYPES[0]);
  const [capacity, setCapacity] = useState<string>(CAPACITIES[3]); // 6 kg
  const [lastRechargeDate, setLastRechargeDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expirationDate, setExpirationDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1); // 1 año de vigencia por defecto
    return d.toISOString().split('T')[0];
  });
  const [pressureStatus, setPressureStatus] = useState('Correcto (En Verde)');
  const [sealStatus, setSealStatus] = useState('Intacto');
  const [hoseStatus, setHoseStatus] = useState('Buen Estado');
  const [signageStatus, setSignageStatus] = useState('Visible y Reglamentaria');
  const [inspectorName, setInspectorName] = useState('');
  const [observations, setObservations] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [filterLocation, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    const list = await getExtinguishers(filterLocation, filterStatus);
    const sum = await getExtinguisherSummary();
    setExtinguishers(list);
    setSummary(sum);
    setLoading(false);
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setCode('');
    setLocation('');
    setAgentType(AGENT_TYPES[0]);
    setCapacity(CAPACITIES[3]);
    const todayStr = new Date().toISOString().split('T')[0];
    setLastRechargeDate(todayStr);
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    setExpirationDate(d.toISOString().split('T')[0]);
    setPressureStatus('Correcto (En Verde)');
    setSealStatus('Intacto');
    setHoseStatus('Buen Estado');
    setSignageStatus('Visible y Reglamentaria');
    setInspectorName('');
    setObservations('');
    setViewMode('form');
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setCode(item.code);
    setLocation(item.location);
    setAgentType(item.agent_type);
    setCapacity(item.capacity);
    setLastRechargeDate(item.last_recharge_date);
    setExpirationDate(item.expiration_date);
    setPressureStatus(item.pressure_status);
    setSealStatus(item.seal_status);
    setHoseStatus(item.hose_status);
    setSignageStatus(item.signage_status);
    setInspectorName(item.inspector_name || '');
    setObservations(item.observations || '');
    setViewMode('form');
  };

  const handleLastRechargeChange = (val: string) => {
    setLastRechargeDate(val);
    if (val) {
      const parts = val.split('-');
      if (parts.length === 3) {
        const nextYear = parseInt(parts[0]) + 1;
        setExpirationDate(`${nextYear}-${parts[1]}-${parts[2]}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      Swal.fire({ icon: 'warning', title: 'Código Obligatorio', text: 'Ingrese el código del extintor (ej. EXT-01).' });
      return;
    }
    if (!location.trim()) {
      Swal.fire({ icon: 'warning', title: 'Ubicación Obligatoria', text: 'Especifique la ubicación del extintor.' });
      return;
    }

    setIsSubmitting(true);
    const payload: FireExtinguisherInput = {
      code,
      location,
      agentType,
      capacity,
      lastRechargeDate,
      expirationDate,
      pressureStatus,
      sealStatus,
      hoseStatus,
      signageStatus,
      inspectorName,
      observations
    };

    const res = await saveExtinguisher(payload, editingId || undefined);
    setIsSubmitting(false);

    if (res.success) {
      Swal.fire({
        icon: 'success',
        title: editingId ? 'Extintor Actualizado' : 'Extintor Registrado',
        text: `El extintor ${code.toUpperCase()} se guardó con éxito en el inventario.`,
        timer: 1800,
        showConfirmButton: false
      });
      setViewMode('list');
      loadData();
    } else {
      Swal.fire({ icon: 'error', title: 'Error al Guardar', text: res.error });
    }
  };

  const handleDelete = async (id: string, extCode: string) => {
    const confirm = await Swal.fire({
      title: `¿Eliminar ${extCode}?`,
      text: 'Se eliminará este extintor del inventario oficial.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
      const res = await deleteExtinguisher(id);
      if (res.success) {
        Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1500, showConfirmButton: false });
        loadData();
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: res.error });
      }
    }
  };

  const filteredList = extinguishers.filter((e) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      e.code.toLowerCase().includes(term) ||
      e.location.toLowerCase().includes(term) ||
      e.agent_type.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* VISTA 1: LISTADO Y DASHBOARD DE EXTINTORES */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          
          {/* SEMÁFORO DE VENCIMIENTOS Y ALERTAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-blue-100 text-blue-700 rounded-2xl">
                <Flame className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Total Relevados</p>
                <p className="text-2xl font-black font-mono text-slate-900">{summary.total}</p>
                <p className="text-[11px] text-slate-500 font-semibold">Extintores en inventario</p>
              </div>
            </div>

            <div className="bg-emerald-50/80 p-5 rounded-2xl border border-emerald-200 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-emerald-600 text-white rounded-2xl shadow">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-800 uppercase">Vigentes (Operativos)</p>
                <p className="text-2xl font-black font-mono text-emerald-950">{summary.vigentes}</p>
                <p className="text-[11px] text-emerald-700 font-bold">Carga válida en regla</p>
              </div>
            </div>

            <div className="bg-amber-50/80 p-5 rounded-2xl border border-amber-200 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-amber-500 text-white rounded-2xl shadow">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-800 uppercase">Por Vencer (&lt; 30 días)</p>
                <p className="text-2xl font-black font-mono text-amber-950">{summary.porVencer}</p>
                <p className="text-[11px] text-amber-700 font-bold">Programar recarga pronto</p>
              </div>
            </div>

            <div className="bg-rose-50/80 p-5 rounded-2xl border border-rose-200 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-rose-600 text-white rounded-2xl shadow">
                <XCircle className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-rose-800 uppercase">Vencidos (Alerta)</p>
                <p className="text-2xl font-black font-mono text-rose-950">{summary.vencidos}</p>
                <p className="text-[11px] text-rose-700 font-bold">Riesgo en inspecciones</p>
              </div>
            </div>

          </div>

          {/* BARRA DE ACCIONES, BÚSQUEDA Y FILTROS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
            
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por código, ubicación o agente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-black text-slate-800 uppercase"
              >
                <option value="TODOS">TODOS LOS ESTADOS</option>
                <option value="Vigente">🟢 VIGENTES</option>
                <option value="Por Vencer">🟡 POR VENCER (&lt; 30 DÍAS)</option>
                <option value="Vencido">🔴 VENCIDOS</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('print')}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-4 py-3 rounded-xl transition shadow"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Imprimir Planilla Oficial</span>
              </button>

              <button
                onClick={handleOpenNew}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-4 py-3 rounded-xl transition shadow-lg"
              >
                <Plus className="w-4 h-4 text-amber-300" />
                <span>+ Registrar Extintor</span>
              </button>
            </div>

          </div>

          {/* TABLA DE EXTINTORES */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                <Flame className="w-5 h-5 text-blue-600" />
                Inventario General de Extintores Relevados ({filteredList.length})
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
              <div className="text-center py-12 text-xs font-bold text-slate-500">Cargando extintores...</div>
            ) : filteredList.length === 0 ? (
              <div className="text-center py-14 text-slate-400 text-xs font-bold border-2 border-dashed border-slate-200 rounded-2xl">
                No se encontraron extintores registrados con los filtros seleccionados.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full border-collapse text-xs sm:text-sm text-left">
                  <thead>
                    <tr className="bg-slate-900 text-white font-black uppercase text-xs">
                      <th className="p-3 text-center">Código</th>
                      <th className="p-3">Ubicación / Sector</th>
                      <th className="p-3">Agente / Capacidad</th>
                      <th className="p-3 text-center">Última Recarga</th>
                      <th className="p-3 text-center">Vencimiento</th>
                      <th className="p-3 text-center">Días Restantes</th>
                      <th className="p-3 text-center">Estado Carga</th>
                      <th className="p-3 text-center">Manómetro / Precinto</th>
                      <th className="p-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-bold">
                    {filteredList.map((ext) => (
                      <tr key={ext.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 text-center font-mono font-black text-blue-700 bg-blue-50/50">
                          {ext.code}
                        </td>
                        <td className="p-3 font-black text-slate-900 uppercase">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{ext.location}</span>
                          </div>
                        </td>
                        <td className="p-3 text-slate-800 text-xs uppercase">
                          <div>
                            <p className="font-black">{ext.agent_type}</p>
                            <p className="text-[11px] text-slate-500 font-mono">Capacidad: {ext.capacity}</p>
                          </div>
                        </td>
                        <td className="p-3 text-center font-mono text-slate-700 text-xs">
                          {ext.last_recharge_date}
                        </td>
                        <td className="p-3 text-center font-mono font-black text-slate-900 text-xs">
                          {ext.expiration_date}
                        </td>
                        <td className="p-3 text-center font-mono text-xs font-black">
                          {ext.daysToExpiration < 0 ? (
                            <span className="text-rose-600">Vencido hace {Math.abs(ext.daysToExpiration)} d</span>
                          ) : (
                            <span className={ext.daysToExpiration <= 30 ? 'text-amber-600' : 'text-emerald-700'}>
                              {ext.daysToExpiration} días
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                            ext.calculatedStatus === 'Vigente' 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                              : ext.calculatedStatus === 'Por Vencer' 
                              ? 'bg-amber-50 text-amber-900 border-amber-300' 
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}>
                            {ext.calculatedStatus === 'Vigente' ? '🟢 Vigente' : ext.calculatedStatus === 'Por Vencer' ? '🟡 Por Vencer' : '🔴 Vencido'}
                          </span>
                        </td>
                        <td className="p-3 text-center text-[11px] text-slate-600 font-semibold">
                          <p>{ext.pressure_status}</p>
                          <p className="text-[10px] text-slate-400">Precinto: {ext.seal_status}</p>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleEdit(ext)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition border border-blue-200"
                              title="Editar Extintor"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(ext.id, ext.code)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition border border-red-200"
                              title="Eliminar Extintor"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* VISTA 2: FORMULARIO DE REGISTRO / EDICIÓN */}
      {viewMode === 'form' && (
        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-300 shadow-xl space-y-6">
          
          <div className="flex justify-between items-center border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase">
                  {editingId ? `Editar Extintor ${code}` : 'Nuevo Relevamiento de Extintor'}
                </h2>
                <p className="text-xs text-slate-500 font-bold">
                  Complete los datos de la placa y la inspección física del equipo
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
                Código del Extintor <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="EJ. EXT-01, EXT-ALM-02..."
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm font-black uppercase rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-xs font-black text-slate-900 uppercase">
                Ubicación / Sector Específico <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="EJ. PASILLO PLANTA ALTA - OFICINA TÉCNICA..."
                value={location}
                onChange={(e) => setLocation(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm font-black uppercase rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-900 uppercase">
                Tipo de Agente Extintor <span className="text-red-600">*</span>
              </label>
              <select
                value={agentType}
                onChange={(e) => setAgentType(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-xs sm:text-sm font-black uppercase rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600"
              >
                {AGENT_TYPES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-900 uppercase">
                Capacidad de Carga <span className="text-red-600">*</span>
              </label>
              <select
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-xs sm:text-sm font-black uppercase rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600"
              >
                {CAPACITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-900 uppercase">
                Nombre del Inspector / Relevador
              </label>
              <input
                type="text"
                placeholder="EJ. ING. JUAN PÉREZ..."
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm font-black uppercase rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-900 uppercase">
                Fecha de Última Recarga <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                required
                value={lastRechargeDate}
                onChange={(e) => handleLastRechargeChange(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm font-black rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-900 uppercase">
                Fecha de Próximo Vencimiento <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                required
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm font-black rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-900 uppercase">
                Estado del Manómetro
              </label>
              <select
                value={pressureStatus}
                onChange={(e) => setPressureStatus(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-300 text-slate-900 text-xs sm:text-sm font-black rounded-xl px-4 py-3 uppercase"
              >
                <option value="Correcto (En Verde)">🟢 Correcto (En Verde)</option>
                <option value="Baja Presión (Descargado)">🔴 Baja Presión (Descargado)</option>
                <option value="Sobrecarga">🟡 Sobrecarga</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-900 uppercase">
                Precinto y Pasador de Seguridad
              </label>
              <select
                value={sealStatus}
                onChange={(e) => setSealStatus(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-300 text-slate-900 text-xs sm:text-sm font-black rounded-xl px-4 py-3 uppercase"
              >
                <option value="Intacto">Intacto / Sellado</option>
                <option value="Roto / Faltante">Roto / Faltante</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-900 uppercase">
                Estado de Manguera y Tobera
              </label>
              <select
                value={hoseStatus}
                onChange={(e) => setHoseStatus(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-300 text-slate-900 text-xs sm:text-sm font-black rounded-xl px-4 py-3 uppercase"
              >
                <option value="Buen Estado">Buen Estado</option>
                <option value="Agrietada / Deteriorada">Agrietada / Deteriorada</option>
                <option value="Obstruida">Obstruida</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-900 uppercase">
                Señalética Reglamentaria y Altura
              </label>
              <select
                value={signageStatus}
                onChange={(e) => setSignageStatus(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-300 text-slate-900 text-xs sm:text-sm font-black rounded-xl px-4 py-3 uppercase"
              >
                <option value="Visible y Reglamentaria">Visible y Reglamentaria</option>
                <option value="Faltante">Faltante</option>
                <option value="Obstruida">Obstruida</option>
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-3">
              <label className="block text-xs font-black text-slate-900 uppercase">
                Observaciones Adicionales
              </label>
              <input
                type="text"
                placeholder="EJ. SOPORTE DE PARED FLOJO, REQUIERE LIMPIEZA EXTERNA..."
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
                <span>Guardar Extintor</span>
              )}
            </button>
          </div>

        </form>
      )}

      {/* VISTA 3: PLANILLA OFICIAL IMPRIMIBLE CON CLASE print-area */}
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
              <span>IMPRIMIR PLANILLA OFICIAL</span>
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
                  <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 tracking-tight">ENDE DEORURO - DEPARTAMENTO DE SEGURIDAD INDUSTRIAL</h2>
                  <p className="text-xs font-extrabold text-blue-800 uppercase tracking-wide">PLANILLA OFICIAL DE RELEVAMIENTO E INSPECCIÓN TÉCNICA DE EXTINTORES</p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block bg-slate-900 text-white font-mono font-bold text-xs px-3 py-1.5 rounded uppercase">
                  INSPECCIÓN TÉCNICA
                </span>
                <p className="text-[10px] text-slate-500 font-bold mt-1 font-mono">
                  FECHA EMISIÓN: {new Date().toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs mb-6 text-center">
              <div>
                <span className="text-slate-500 font-bold block uppercase text-[10px]">Total Extintores:</span>
                <span className="text-base font-black font-mono text-slate-900">{summary.total}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block uppercase text-[10px]">Vigentes:</span>
                <span className="text-base font-black font-mono text-emerald-700">{summary.vigentes}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block uppercase text-[10px]">Por Vencer:</span>
                <span className="text-base font-black font-mono text-amber-600">{summary.porVencer}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block uppercase text-[10px]">Vencidos:</span>
                <span className="text-base font-black font-mono text-rose-600">{summary.vencidos}</span>
              </div>
            </div>

            <div className="overflow-x-auto mb-8">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-900 text-white font-black uppercase text-left">
                    <th className="p-2 text-center w-8 border border-slate-900">N°</th>
                    <th className="p-2 text-center w-16 border border-slate-900">CÓDIGO</th>
                    <th className="p-2 border border-slate-900">UBICACIÓN / SECTOR</th>
                    <th className="p-2 border border-slate-900">AGENTE</th>
                    <th className="p-2 text-center border border-slate-900">CAPACIDAD</th>
                    <th className="p-2 text-center border border-slate-900">ÚLT. RECARGA</th>
                    <th className="p-2 text-center border border-slate-900 bg-blue-950">VENCIMIENTO</th>
                    <th className="p-2 text-center border border-slate-900">ESTADO</th>
                    <th className="p-2 text-center border border-slate-900">MANÓMETRO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 border border-slate-300 font-bold">
                  {extinguishers.map((ext, idx) => (
                    <tr key={ext.id} className="hover:bg-slate-50">
                      <td className="p-2 text-center font-mono border-r border-slate-300">{idx + 1}</td>
                      <td className="p-2 text-center font-mono font-black text-blue-900 border-r border-slate-300">{ext.code}</td>
                      <td className="p-2 uppercase border-r border-slate-300">{ext.location}</td>
                      <td className="p-2 uppercase text-[10px] border-r border-slate-300">{ext.agent_type}</td>
                      <td className="p-2 text-center font-mono border-r border-slate-300">{ext.capacity}</td>
                      <td className="p-2 text-center font-mono border-r border-slate-300">{ext.last_recharge_date}</td>
                      <td className="p-2 text-center font-mono font-black text-blue-950 border-r border-slate-300 bg-blue-50/40">{ext.expiration_date}</td>
                      <td className="p-2 text-center border-r border-slate-300 uppercase text-[10px]">
                        {ext.calculatedStatus}
                      </td>
                      <td className="p-2 text-center border-r border-slate-300 text-[10px]">
                        {ext.pressure_status}
                      </td>
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
                <p className="font-black text-slate-900 uppercase">JEFATURA DE MANTENIMIENTO E INFRAESTRUCTURA</p>
                <p className="text-xs text-slate-600 font-bold uppercase">ENDE DEORURO</p>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
