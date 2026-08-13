export interface ToolRequestItemInput {
  itemNumber: number;
  toolType: string;
  description: string;
  quantity: number;
  area: string;
}

export interface ToolRequestInput {
  supervisorName: string;
  area: string;
  justification?: string;
  priority?: string;
  items: ToolRequestItemInput[];
}

export interface ToolRequestItemData {
  id: string;
  requestId: string;
  itemNumber: number;
  toolType: string;
  description: string;
  quantity: number;
  area: string;
  createdAt: string;
}

export interface ToolRequestData {
  id: string;
  folio: number;
  requestCode: string;
  supervisorName: string;
  area: string;
  justification: string;
  priority: string;
  status: string;
  createdAt: string;
  itemCount?: number;
  items?: ToolRequestItemData[];
}

export const TECHNICAL_AREAS = [
  'AREA DE GESTION DE ACTIVOS',
  'MANTENIMIENTO DE REDES',
  'LINEAS DE TRANSMISION',
  'INGENIERIA Y DESARROLLO',
  'SISTEMA RURAL',
  'EPP'
] as const;

export interface ConsolidatedReportItem {
  toolType: string;
  description: string;
  totalQuantity: number;
  requestCount: number;
  areas: string[];
}

export const TOOL_TYPES_PRESETS = [
  'Herramienta Manual',
  'Herramienta Eléctrica',
  'Herramienta Inalámbrica',
  'Instrumento de Medición y Prueba',
  'Equipo de Protección Especial (EPP)',
  'Equipo de Maniobra / Altura',
  'Insumo / Consumible Técnico',
  'Otro'
] as const;
