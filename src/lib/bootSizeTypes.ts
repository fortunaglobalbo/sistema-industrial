export interface BootSizeRequestInput {
  fullName: string;
  area: 'ÁREA ADMINISTRATIVA' | 'ÁREA TÉCNICA' | string;
  position: string;
  gender: 'MASCULINO' | 'FEMENINO' | string;
  bootSize: number;
}

export interface BootSizeRequestData {
  id: string;
  folio: number;
  registration_code: string;
  full_name: string;
  area: string;
  position: string;
  gender: string;
  boot_size: number;
  status: string;
  created_at: string;
}

export const BOOT_AREAS = [
  'ÁREA ADMINISTRATIVA',
  'ÁREA TÉCNICA'
] as const;

export const BOOT_SIZES = [35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45] as const;
