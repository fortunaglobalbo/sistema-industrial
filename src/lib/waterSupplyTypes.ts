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
