import React from 'react';
import FormularioHerramientas from '@/components/FormularioHerramientas';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Requerimiento Masivo de Herramientas | ENDE ORURO",
  description: "Formulario oficial para recabar requerimientos de herramientas y equipos de trabajo por áreas técnicas en ENDE Oruro.",
};

export default function FormularioPage() {
  return <FormularioHerramientas />;
}
