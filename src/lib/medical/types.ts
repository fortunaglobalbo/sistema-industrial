export type MedicalWorker = {
  names?: string;
  paternal?: string;
  maternal?: string;
  id: string;
  full_name: string;
  ci: string;
  position: string;
  department: string;
};
export type EncounterInput = {
  workerId: string;
  requestId: string;
  correctionOf?: string;
  occurredAt: string;
  kind: "consulta" | "reconsulta";
  reason: string;
  illness: string;
  personalHistory: string;
  occupationalHistory: string;
  familyHistory: string;
  examination: string;
  bloodPressure: string;
  heartRate: string;
  respiratoryRate: string;
  temperature: string;
  diagnosis: string;
  treatment: string;
  referral: string;
  recommendations: string;
};
export type Encounter = {
  id: string;
  worker_id: string;
  worker_snapshot: MedicalWorker;
  author_name: string;
  created_at: string;
  data: EncounterInput;
};
export type MedicalCase = { worker: MedicalWorker; encounters: Encounter[] };
export type SharedData = {
  acts: {
    id: string;
    created_at: string;
    transaction_type: string;
    worker_id: string;
  }[];
  kits: {
    id: string;
    name: string;
    description: string;
    items: { name: string; quantity: number; unit: string }[];
  }[];
};
