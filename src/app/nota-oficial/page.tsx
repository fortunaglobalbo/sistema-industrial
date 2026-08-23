import React from 'react';
import GeneradorNotaOficial from '@/components/GeneradorNotaOficial';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Nota Oficial de Compra (Carpeta 5) | ENDE ORURO",
  description: "Generador inteligente con IA de Notas Oficiales de Solicitud de Inicio de Proceso de Compra para ENDE Deoruro S.A.",
};

export default function NotaOficialPage() {
  return <GeneradorNotaOficial />;
}
