'use client';

import React from 'react';
import { Printer, ArrowLeft, ShieldAlert } from 'lucide-react';

interface Worker {
  fullName: string;
  ci: string;
  position: string;
  department: string;
  supervisorName: string;
}

interface TransactionItem {
  id: string;
  itemName: string;
  category: 'ropa' | 'epp' | 'herramientas';
  quantity: number;
  conditionReason: string;
  photoUrl?: string | null;
}

interface Transaction {
  id: string;
  folio: string;
  createdAt: string;
  supervisorName: string;
  transactionType: 'devolucion' | 'entrega' | 'intercambio';
  signatureUrl: string;
  worker: Worker;
}

interface PrintReceiptProps {
  transaction: Transaction;
  items: TransactionItem[];
  onBack: () => void;
}

export default function PrintReceipt({ transaction, items, onBack }: PrintReceiptProps) {
  const handlePrint = () => {
    window.print();
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const translateType = (type: string) => {
    switch (type) {
      case 'entrega': return 'ENTREGA DE EPP/INSUMOS';
      case 'devolucion': return 'DEVOLUCIÓN DE DESCARGO';
      case 'intercambio': return 'INTERCAMBIO POR REPOSICIÓN';
      default: return type.toUpperCase();
    }
  };

  const translateReason = (reason: string) => {
    switch (reason) {
      case 'desgaste_natural': return 'Desgaste Natural';
      case 'dano_operativo': return 'Daño Operativo';
      case 'defecto_fabrica': return 'Defecto de Fábrica';
      case 'cambio_talla': return 'Cambio de Talla';
      case 'nuevo': return 'Ingreso Nuevo';
      default: return reason;
    }
  };

  // Renderiza una sola copia del acta (se duplicará para Almacén y Trabajador)
  const renderSingleCopy = (copyTitle: string) => (
    <div className="w-full bg-white text-black p-6 font-sans text-xs border border-slate-300 rounded shadow-sm print:shadow-none print:border-none">
      {/* Encabezado */}
      <div className="flex justify-between items-start border-b border-black pb-3">
        <div>
          <img 
            src="/logo-ende.png" 
            alt="ENDE ORURO" 
            className="h-10 w-auto object-contain mix-blend-multiply" 
          />
        </div>
        <div className="text-right">
          <span className="inline-block bg-slate-100 px-2.5 py-1 font-bold text-sm text-slate-800 border border-slate-300 rounded">
            N° FOLIO: {transaction.folio}
          </span>
          <p className="text-[9px] text-slate-500 mt-1 font-semibold">{copyTitle}</p>
        </div>
      </div>

      {/* Título Principal */}
      <h2 className="text-center font-bold text-sm my-3 tracking-wide">
        ACTA DE CONFORMIDAD - {translateType(transaction.transactionType)}
      </h2>

      {/* Datos del Trabajador */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 bg-slate-50 p-2.5 rounded border border-slate-200 mb-3">
        <div>
          <span className="font-semibold text-slate-600 block">Trabajador:</span>
          <span className="font-bold text-slate-900">{transaction.worker.fullName}</span>
        </div>
        <div>
          <span className="font-semibold text-slate-600 block">Cédula de Identidad (C.I.):</span>
          <span className="font-bold text-slate-900">{transaction.worker.ci}</span>
        </div>
        <div>
          <span className="font-semibold text-slate-600 block">Cargo / Puesto:</span>
          <span className="text-slate-800">{transaction.worker.position}</span>
        </div>
        <div>
          <span className="font-semibold text-slate-600 block">Área / Departamento:</span>
          <span className="text-slate-800">{transaction.worker.department}</span>
        </div>
        <div>
          <span className="font-semibold text-slate-600 block">Inmediato Superior (Autoriza):</span>
          <span className="text-slate-800 font-semibold">{transaction.supervisorName}</span>
        </div>
        <div>
          <span className="font-semibold text-slate-600 block">Fecha y Hora de Registro:</span>
          <span className="text-slate-800">{formatDate(transaction.createdAt)}</span>
        </div>
      </div>

      {/* Tabla de Items */}
      <table className="w-full border-collapse border border-slate-300 mb-4">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-300 p-1.5 text-center w-12">Cant.</th>
            <th className="border border-slate-300 p-1.5 text-left">Categoría</th>
            <th className="border border-slate-300 p-1.5 text-left">Descripción del Insumo / Herramienta</th>
            <th className="border border-slate-300 p-1.5 text-center w-24">Operación</th>
            <th className="border border-slate-300 p-1.5 text-left w-32">Estado / Motivo</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50/50">
              <td className="border border-slate-300 p-1.5 text-center font-bold">{item.quantity}</td>
              <td className="border border-slate-300 p-1.5 capitalize">{item.category}</td>
              <td className="border border-slate-300 p-1.5 font-medium">{item.itemName}</td>
              <td className="border border-slate-300 p-1.5 text-center capitalize font-semibold">
                {transaction.transactionType === 'intercambio' ? 'Entrega/Dev.' : transaction.transactionType}
              </td>
              <td className="border border-slate-300 p-1.5 text-[10px] text-slate-700">
                {translateReason(item.conditionReason)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Bloque de Firmas y Términos */}
      <p className="text-[9px] text-slate-500 leading-relaxed mb-4 text-justify">
        * Al firmar este documento, el trabajador declara haber recibido a conformidad y en perfecto estado los elementos de protección personal, ropa de trabajo o herramientas descritos en la lista, comprometiéndose a darles un uso correcto y adecuado en cumplimiento de las normativas vigentes de seguridad industrial e higiene ocupacional de la empresa.
      </p>

      <div className="grid grid-cols-2 gap-6 mt-6">
        {/* Firma del Trabajador */}
        <div className="flex flex-col items-center justify-end text-center">
          <div className="h-20 flex items-center justify-center border-b border-black w-48 mb-1">
            {/* Espacio para firma física */}
          </div>
          <span className="font-bold text-[10px]">{transaction.worker.fullName}</span>
          <span className="text-[9px] text-slate-500">C.I. {transaction.worker.ci}</span>
          <span className="text-[9px] text-slate-500 font-bold">Firma del Trabajador</span>
        </div>

        {/* Firma del Encargado */}
        <div className="flex flex-col items-center justify-end text-center">
          <div className="h-20 border-b border-black w-48 mb-1 flex items-end justify-center pb-2">
            <span className="text-[10px] text-slate-300 font-serif italic select-none">Autorizado</span>
          </div>
          <span className="font-bold text-[10px]">Encargado de Seguridad / Almacén</span>
          <span className="text-[9px] text-slate-500">Firma, Sello y Fecha</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Barra de herramientas superior (oculta en impresión) */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 print:hidden">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Formulario
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2 rounded-lg shadow-sm transition"
        >
          <Printer className="w-4 h-4" />
          Imprimir Acta (Carta)
        </button>
      </div>

      {/* Contenedor de impresión (Una sola copia en tamaño Carta) */}
      <div className="print-area">
        {renderSingleCopy('ACTA DE CONFORMIDAD Y DESCARGO')}
      </div>
    </div>
  );
}
