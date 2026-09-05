export interface WaterSupplyInput {
  deliveryDate: string;
  receiptNumber?: string;
  supplierName?: string;
  bottlesReceived: number;
  bottlesContracted: number;
  bottleCapacity?: string;
  containerCondition?: string;
  receivedBy: string;
  observations?: string;
}

export interface WaterSupplyData {
  id: string;
  delivery_date: string;
  receipt_number: string | null;
  supplier_name: string;
  bottles_received: number;
  bottles_contracted: number;
  bottle_capacity: string;
  container_condition: string;
  received_by: string;
  observations: string | null;
  created_at: string;
}

export interface WaterWithdrawalInput {
  withdrawalDate: string;
  recipientName: string;
  sector: string;
  bottlesQuantity: number;
  signaturePresent?: boolean;
  photoUrl?: string | null;
  notes?: string;
}

export interface WaterWithdrawalData {
  id: string;
  withdrawal_date: string;
  recipient_name: string;
  sector: string;
  bottles_quantity: number;
  signature_present: boolean;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface WaterAnnualMonthRow {
  monthName: string;
  monthNum: number;
  contractQuota: number; // Cronograma de recargas
  received: number;      // Recargas recibidas
  balance: number;       // Saldo disponible (contractQuota - received)
  status: 'Disponible' | 'Excedido' | 'Cumplido';
}

// Cronograma Oficial del Contrato (Febrero a Diciembre - Total 440 Bidones de 20L)
export const OFFICIAL_CONTRACT_SCHEDULE = [
  { monthName: 'Febrero', monthNum: 2, quota: 70 },
  { monthName: 'Marzo', monthNum: 3, quota: 30 },
  { monthName: 'Abril', monthNum: 4, quota: 35 },
  { monthName: 'Mayo', monthNum: 5, quota: 30 },
  { monthName: 'Junio', monthNum: 6, quota: 30 },
  { monthName: 'Julio', monthNum: 7, quota: 30 },
  { monthName: 'Agosto', monthNum: 8, quota: 30 },
  { monthName: 'Septiembre', monthNum: 9, quota: 40 },
  { monthName: 'Octubre', monthNum: 10, quota: 45 },
  { monthName: 'Noviembre', monthNum: 11, quota: 50 },
  { monthName: 'Diciembre', monthNum: 12, quota: 50 },
];

// Valores base históricos auditados en la planilla oficial (Febrero a Agosto)
export const HISTORICAL_RECEIVED_BASE: { [key: number]: number } = {
  2: 59, // Febrero
  3: 35, // Marzo
  4: 59, // Abril
  5: 33, // Mayo
  6: 41, // Junio
  7: 28, // Julio
  8: 31, // Agosto
  9: 0,  // Septiembre
  10: 0, // Octubre
  11: 0, // Noviembre
  12: 0  // Diciembre
};
