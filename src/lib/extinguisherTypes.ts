export interface FireExtinguisherInput {
  code: string;
  location: string;
  agentType: string;
  capacity: string;
  lastRechargeDate: string;
  expirationDate: string;
  pressureStatus?: string;
  sealStatus?: string;
  hoseStatus?: string;
  signageStatus?: string;
  observations?: string;
  inspectorName?: string;
}

export interface FireExtinguisherData {
  id: string;
  code: string;
  location: string;
  agent_type: string;
  capacity: string;
  last_recharge_date: string;
  expiration_date: string;
  pressure_status: string;
  seal_status: string;
  hose_status: string;
  signage_status: string;
  observations: string | null;
  inspector_name: string | null;
  created_at: string;
}

export const AGENT_TYPES = [
  'PQS (Polvo Químico Seco ABC)',
  'CO2 (Dióxido de Carbono BC)',
  'Agua Presurizada (Clase A)',
  'Acetato de Potasio (Clase K / Cocinas)'
] as const;

export const CAPACITIES = [
  '0.5 kg',
  '1 kg (Vehicular)',
  '2 kg',
  '4 kg',
  '6 kg',
  '8 kg',
  '9 kg',
  '10 kg',
  '12 kg',
  '50 kg (Rodante)'
] as const;
