export interface OfficialCiteInput {
  issueDate: string;
  docNumber: string;
  reference: string;
  recipientA: string;
  signerFirm?: string;
  status?: string;
  observations?: string;
}

export interface OfficialCiteData {
  id: string;
  correlative_number: number;
  issue_date: string;
  doc_number: string;
  reference: string;
  recipient_a: string;
  signer_firm?: string | null;
  status: string;
  observations: string | null;
  created_at: string;
}

export const CITE_STATUS_OPTIONS = [
  'Enviado',
  'Firmado',
  'En Trámite',
  'Archivado'
] as const;
