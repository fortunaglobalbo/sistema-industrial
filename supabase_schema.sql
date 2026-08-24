-- SCRIPT DE INICIALIZACIÓN Y MIGRACIÓN DE BASE DE DATOS (Supabase PostgreSQL)
-- Ejecutar en el SQL Editor de tu proyecto de Supabase para solucionar el error de ENUM.

-- 1. Si los tipos ENUM existen en tu base de datos de Supabase, agregar los nuevos valores:
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type_enum') THEN
        ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS 'dotacion';
        ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS 'desuso';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'condition_reason_enum') THEN
        ALTER TYPE condition_reason_enum ADD VALUE IF NOT EXISTS 'nuevo';
        ALTER TYPE condition_reason_enum ADD VALUE IF NOT EXISTS 'en_desuso';
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END
$$;

-- 2. Convertir las columnas a TEXT para evitar restricciones estáticas de ENUM en el futuro:
DO $$
BEGIN
    -- Convertir columna transaction_type en transactions
    ALTER TABLE transactions ALTER COLUMN transaction_type TYPE TEXT USING transaction_type::TEXT;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    -- Convertir columnas en inventory_items y transaction_items
    ALTER TABLE inventory_items ALTER COLUMN category TYPE TEXT USING category::TEXT;
    ALTER TABLE inventory_items ALTER COLUMN current_stock TYPE NUMERIC(10,2);
    ALTER TABLE transaction_items ALTER COLUMN category TYPE TEXT USING category::TEXT;
    ALTER TABLE transaction_items ALTER COLUMN condition_reason TYPE TEXT USING condition_reason::TEXT;
    ALTER TABLE transaction_items ALTER COLUMN quantity TYPE NUMERIC(10,2);
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 3. Crear tabla de Categorías (categories)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Crear tabla de Trabajadores (workers)
CREATE TABLE IF NOT EXISTS workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    ci TEXT NOT NULL UNIQUE,
    position TEXT NOT NULL,
    department TEXT NOT NULL,
    supervisor_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workers_ci ON workers(ci);
CREATE INDEX IF NOT EXISTS idx_workers_full_name ON workers(full_name);

-- 5. Crear tabla de Inventario (inventory_items)
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    current_stock NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Crear tabla de Transacciones (transactions)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE RESTRICT,
    supervisor_name TEXT NOT NULL,
    transaction_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    signature_url TEXT NOT NULL
);

-- 7. Crear tabla de Items por Transacción (transaction_items)
CREATE TABLE IF NOT EXISTS transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
    condition_reason TEXT NOT NULL,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Configurar RLS (Row Level Security) y Políticas de Acceso
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo a todos en categories" ON categories;
CREATE POLICY "Permitir todo a todos en categories" ON categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a todos en workers" ON workers;
CREATE POLICY "Permitir todo a todos en workers" ON workers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a todos en inventory_items" ON inventory_items;
CREATE POLICY "Permitir todo a todos en inventory_items" ON inventory_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a todos en transactions" ON transactions;
CREATE POLICY "Permitir todo a todos en transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a todos en transaction_items" ON transaction_items;
CREATE POLICY "Permitir todo a todos en transaction_items" ON transaction_items FOR ALL USING (true) WITH CHECK (true);

-- 9. Categorías iniciales por defecto
INSERT INTO categories (name) VALUES
('EPP (Protección)'),
('Botiquines / Primeros Auxilios'),
('Ropa de Trabajo'),
('Herramientas')
ON CONFLICT (name) DO NOTHING;

-- 10. Datos de muestra e Insumos Frecuentes
INSERT INTO workers (full_name, ci, position, department, supervisor_name) VALUES
('Juan Carlos Perez', '1234567', 'Operador de Planta', 'Producción', 'Ing. Mario Gomez'),
('Ana Maria Rodriguez', '7654321', 'Soldador Calificado', 'Mantenimiento', 'Ing. Carlos Sanchez'),
('Luis Fernando Lopez', '9876543', 'Técnico Eléctrico', 'Mantenimiento', 'Ing. Carlos Sanchez')
ON CONFLICT (ci) DO NOTHING;

INSERT INTO inventory_items (name, category, current_stock) VALUES
('Guantes de cuero delgados (par)', 'EPP (Protección)', 50.00),
('Guantes de cuero cortos (par)', 'EPP (Protección)', 30.00),
('Guantes de nitrilo (color verde) (par)', 'EPP (Protección)', 100.00),
('Lentes de protección (transparente) (pza)', 'EPP (Protección)', 80.00),
('Overoles desechables (blancos) (pza)', 'Ropa de Trabajo', 50.00),
('Botiquín de Primeros Auxilios (Dotación)', 'Botiquines / Primeros Auxilios', 15.00),
('Casco de Seguridad Amarillo', 'EPP (Protección)', 50.00),
('Botas de Seguridad de Cuero Punta de Acero', 'EPP (Protección)', 35.00),
('Arnés de Seguridad Multipropósito', 'EPP (Protección)', 15.00),
('Overol de Trabajo Azul (Talla M)', 'Ropa de Trabajo', 40.00),
('Overol de Trabajo Azul (Talla L)', 'Ropa de Trabajo', 45.00),
('Camisa de Trabajo Manga Larga (Talla M)', 'Ropa de Trabajo', 60.00),
('Camotera Térmica Impermeable', 'Ropa de Trabajo', 25.00),
('Juego de Llaves Combinadas (12 piezas)', 'Herramientas', 8.00),
('Rotomartillo Industrial Bosch', 'Herramientas', 5.00),
('Amoladora Angular 4.5" DeWalt', 'Herramientas', 10.00)
ON CONFLICT (name) DO NOTHING;

-- 11. Crear Secuencia de Folio para Requerimientos de Herramientas
CREATE SEQUENCE IF NOT EXISTS tool_request_folio_seq START WITH 1001;

-- 12. Tabla de Solicitudes Masivas de Herramientas (tool_requests)
CREATE TABLE IF NOT EXISTS tool_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio INTEGER DEFAULT nextval('tool_request_folio_seq') UNIQUE,
    request_code TEXT NOT NULL UNIQUE,
    supervisor_name TEXT NOT NULL,
    area TEXT NOT NULL,
    justification TEXT,
    priority TEXT DEFAULT 'Normal',
    status TEXT DEFAULT 'Pendiente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Tabla de Ítems por Solicitud de Herramientas (tool_request_items)
CREATE TABLE IF NOT EXISTS tool_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES tool_requests(id) ON DELETE CASCADE,
    item_number INTEGER NOT NULL,
    tool_type TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
    area TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. Habilitar RLS y Políticas de Acceso para Requerimientos de Herramientas
ALTER TABLE tool_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_request_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo a todos en tool_requests" ON tool_requests;
CREATE POLICY "Permitir todo a todos en tool_requests" ON tool_requests FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a todos en tool_request_items" ON tool_request_items;
CREATE POLICY "Permitir todo a todos en tool_request_items" ON tool_request_items FOR ALL USING (true) WITH CHECK (true);

-- 15. Crear Secuencia de Folio para Registro de Tallas de Botines
CREATE SEQUENCE IF NOT EXISTS boot_size_folio_seq START WITH 1001;

-- 16. Tabla de Registros de Tallas de Botines (boot_size_requests)
CREATE TABLE IF NOT EXISTS boot_size_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio INTEGER DEFAULT nextval('boot_size_folio_seq') UNIQUE,
    registration_code TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    area TEXT NOT NULL, -- 'ÁREA ADMINISTRATIVA' o 'ÁREA TÉCNICA'
    position TEXT NOT NULL, -- Cargo / Puesto
    gender TEXT NOT NULL, -- 'MASCULINO' o 'FEMENINO'
    boot_size INTEGER NOT NULL CHECK (boot_size >= 35 AND boot_size <= 45),
    status TEXT DEFAULT 'Registrado',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 17. Habilitar RLS y Políticas de Acceso para Tallas de Botines
ALTER TABLE boot_size_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo a todos en boot_size_requests" ON boot_size_requests;
CREATE POLICY "Permitir todo a todos en boot_size_requests" ON boot_size_requests FOR ALL USING (true) WITH CHECK (true);

-- 18. Tabla de Relevamiento e Inspección de Extintores (fire_extinguishers)
CREATE TABLE IF NOT EXISTS fire_extinguishers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    location TEXT NOT NULL,
    agent_type TEXT NOT NULL, -- PQS, CO2, Agua Presurizada, Acetato de Potasio
    capacity TEXT NOT NULL,   -- 4 kg, 6 kg, 10 kg, 12 kg, etc.
    last_recharge_date DATE NOT NULL,
    expiration_date DATE NOT NULL,
    pressure_status TEXT DEFAULT 'Correcto (En Verde)',
    seal_status TEXT DEFAULT 'Intacto',
    hose_status TEXT DEFAULT 'Buen Estado',
    signage_status TEXT DEFAULT 'Visible y Reglamentaria',
    observations TEXT,
    inspector_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE fire_extinguishers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo a todos en fire_extinguishers" ON fire_extinguishers;
CREATE POLICY "Permitir todo a todos en fire_extinguishers" ON fire_extinguishers FOR ALL USING (true) WITH CHECK (true);

-- 19. Tabla de Control y Auditoría de Suministro de Agua (water_supplies)
CREATE TABLE IF NOT EXISTS water_supplies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_date DATE NOT NULL,
    receipt_number TEXT,
    supplier_name TEXT DEFAULT 'EMPRESA PROVEEDORA DE AGUA',
    bottles_received INTEGER NOT NULL CHECK (bottles_received >= 0),
    bottles_contracted INTEGER NOT NULL CHECK (bottles_contracted >= 0),
    bottle_capacity TEXT DEFAULT '20 Litros',
    container_condition TEXT DEFAULT 'Conforme y Sellado',
    received_by TEXT NOT NULL,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE water_supplies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo a todos en water_supplies" ON water_supplies;
CREATE POLICY "Permitir todo a todos en water_supplies" ON water_supplies FOR ALL USING (true) WITH CHECK (true);

-- 20. Secuencia y Tabla de Control de CITES (Correspondencia a Gerencia)
CREATE SEQUENCE IF NOT EXISTS cite_correlative_seq START WITH 1;

CREATE TABLE IF NOT EXISTS official_cites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correlative_number INTEGER DEFAULT nextval('cite_correlative_seq') UNIQUE,
    issue_date DATE NOT NULL,
    doc_number TEXT NOT NULL,      -- Ej: CITE-SI-045/2026
    reference TEXT NOT NULL,       -- Asunto / Referencia
    recipient_a TEXT NOT NULL,     -- A (Destinatario / Gerencia)
    signer_firm TEXT DEFAULT '',   -- Espacio de firma física al imprimir
    status TEXT DEFAULT 'Enviado', -- Enviado, Firmado, En Trámite, Archivado
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE official_cites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo a todos en official_cites" ON official_cites;
CREATE POLICY "Permitir todo a todos en official_cites" ON official_cites FOR ALL USING (true) WITH CHECK (true);

-- 21. Tabla de Configuración y Armado de Kits de Medicamentos (medicine_kits)
CREATE TABLE IF NOT EXISTS medicine_kits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,       -- Ej: 'Kit Básico Primeros Auxilios', 'Kit Cuadrilla', etc.
    description TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Lista de medicamentos con cantidades [{ name, quantity, unit }]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE medicine_kits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo a todos en medicine_kits" ON medicine_kits;
CREATE POLICY "Permitir todo a todos en medicine_kits" ON medicine_kits FOR ALL USING (true) WITH CHECK (true);







