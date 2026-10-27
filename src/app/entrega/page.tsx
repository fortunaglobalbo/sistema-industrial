import type { Metadata } from 'next';
import DeliveryForm from '@/components/delivery/DeliveryForm';

export const metadata: Metadata = {
  title: 'Acta de entrega de herramientas y EPP | ENDE',
  description: 'Llenado e impresión de actas con visto bueno y recepción.',
};

export default function Page() { return <DeliveryForm />; }
