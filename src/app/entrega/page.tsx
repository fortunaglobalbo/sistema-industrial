import type { Metadata } from 'next';
import DeliveryForm from '@/components/delivery/DeliveryForm';

export const metadata: Metadata = {
  title: 'Entregas y devoluciones de herramientas y EPP | ENDE',
  description: 'Actas con folio, cuatro firmas, historial, devoluciones y supervisión.',
};

export default function Page() { return <DeliveryForm />; }
