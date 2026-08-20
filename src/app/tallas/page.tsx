import React from 'react';
import FormularioTallasBotines from '@/components/FormularioTallasBotines';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Registro Tallas de Botines | ENDE ORURO",
  description: "Formulario oficial de registro de tallas de botines de seguridad para personal de área administrativa y área técnica en ENDE Oruro.",
};

export default function TallasPage() {
  return <FormularioTallasBotines />;
}
