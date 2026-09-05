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
