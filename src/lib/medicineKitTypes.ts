export interface MedicineItem {
  id?: string;
  name: string;
  quantity: number;
  unit: string; // 'Tabletas', 'Sobres', 'Frasco', 'Rollos', 'Unidades', 'Caja', 'Tubo', 'Paquete'
}

export interface MedicineKitInput {
  name: string;
  description?: string;
  items: MedicineItem[];
}

export interface MedicineKitData {
  id: string;
  name: string;
  description: string | null;
  items: MedicineItem[];
  created_at: string;
}

export const PREDEFINED_KITS: MedicineKitInput[] = [
  {
    name: 'Kit Básico de Primeros Auxilios',
    description: 'Dotación básica para puestos de trabajo y oficinas',
    items: [
      { name: 'Paracetamol 500mg (Analgésico / Antipirético)', quantity: 10, unit: 'Tabletas' },
      { name: 'Ibuprofeno 400mg (Antiinflamatorio)', quantity: 10, unit: 'Tabletas' },
      { name: 'Alcohol Medicinal al 70%', quantity: 1, unit: 'Frasco' },
      { name: 'Povidona Yodada (Antiséptico)', quantity: 1, unit: 'Frasco' },
      { name: 'Gasas Esterilizadas', quantity: 5, unit: 'Sobres' },
      { name: 'Venda Elástica 10cm', quantity: 1, unit: 'Rollo' },
      { name: 'Curitas Adhesivas', quantity: 20, unit: 'Unidades' },
      { name: 'Algodón Hidrófilo', quantity: 1, unit: 'Paquete' }
    ]
  },
  {
    name: 'Kit Cuadrilla Técnica y Emergencias',
    description: 'Dotación completa para trabajos en campo, subestaciones y líneas',
    items: [
      { name: 'Paracetamol 500mg', quantity: 20, unit: 'Tabletas' },
      { name: 'Ibuprofeno 400mg', quantity: 20, unit: 'Tabletas' },
      { name: 'Sales de Rehidratación Oral', quantity: 6, unit: 'Sobres' },
      { name: 'Povidona Yodada (Antiséptico)', quantity: 1, unit: 'Frasco' },
      { name: 'Agua Oxigenada', quantity: 1, unit: 'Frasco' },
      { name: 'Gasas Esterilizadas', quantity: 10, unit: 'Sobres' },
      { name: 'Vendas Elásticas 10cm / 15cm', quantity: 3, unit: 'Rollos' },
      { name: 'Esparadrapo Quirúrgico', quantity: 1, unit: 'Rollo' },
      { name: 'Pomada para Quemaduras / Cicatrizante', quantity: 1, unit: 'Tubo' },
      { name: 'Colirio Ocular / Solución Fisiológica', quantity: 2, unit: 'Frascos' },
      { name: 'Tijera Quirúrgica / Pinza', quantity: 1, unit: 'Unidad' }
    ]
  },
  {
    name: 'Kit Botiquín Vehicular / Brigada Móvil',
    description: 'Dotación estándar para camionetas y vehículos de maniobra',
    items: [
      { name: 'Paracetamol 500mg', quantity: 10, unit: 'Tabletas' },
      { name: 'Alcohol al 70%', quantity: 1, unit: 'Frasco' },
      { name: 'Gasas Esterilizadas', quantity: 5, unit: 'Sobres' },
      { name: 'Venda Elástica', quantity: 2, unit: 'Rollos' },
      { name: 'Curitas Adhesivas', quantity: 15, unit: 'Unidades' },
      { name: 'Esparadrapo', quantity: 1, unit: 'Rollo' },
      { name: 'Solución Antiséptica', quantity: 1, unit: 'Frasco' }
    ]
  }
];
