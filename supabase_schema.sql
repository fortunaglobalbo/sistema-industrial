-- SCRIPT DE INICIALIZACIÓN DE BASE DE DATOS (Supabase PostgreSQL)
-- Ejecutar en el SQL Editor de tu proyecto de Supabase.

-- 1. Crear o actualizar tipos ENUM
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'category_type') THEN
        CREATE TYPE category_type AS ENUM ('ropa', 'epp', 'herramientas', 'botiquin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type_enum') THEN
        CREATE TYPE transaction_type_enum AS ENUM ('devolucion', 'entrega', 'intercambio', 'dotacion', 'desuso');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'condition_reason_enum') THEN
        CREATE TYPE condition_reason_enum AS ENUM ('desgaste_natural', 'dano_operativo', 'defecto_fabrica', 'cambio_talla', 'nuevo', 'en_desuso');
    END IF;
END
$$;

-- Alternativa para actualizar tipos ENUM si ya existen en Supabase:
ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS 'dotacion';
ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS 'desuso';
ALTER TYPE condition_reason_enum ADD VALUE IF NOT EXISTS 'nuevo';
ALTER TYPE condition_reason_enum ADD VALUE IF NOT EXISTS 'en_desuso';

-- 2. Crear tabla de Trabajadores (workers)
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

-- 3. Crear tabla de Inventario (inventory_items) - Soporta decimales (ej. 22.5 pares)
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    category category_type NOT NULL,
    current_stock NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Si la tabla ya existe, asegurarse de alterar la columna a NUMERIC:
ALTER TABLE inventory_items ALTER COLUMN current_stock TYPE NUMERIC(10,2);

-- 4. Crear tabla de Transacciones (transactions)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE RESTRICT,
    supervisor_name TEXT NOT NULL,
    transaction_type transaction_type_enum NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    signature_url TEXT NOT NULL -- URL en Supabase Storage
);

-- 5. Crear tabla de Items por Transacción (transaction_items) - Soporta decimales
CREATE TABLE IF NOT EXISTS transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    category category_type NOT NULL,
    quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
    condition_reason condition_reason_enum NOT NULL,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Si la tabla ya existe, asegurarse de alterar la columna a NUMERIC:
ALTER TABLE transaction_items ALTER COLUMN quantity TYPE NUMERIC(10,2);

-- 6. Configurar RLS (Row Level Security) y Políticas de Acceso
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo a todos en workers" ON workers;
CREATE POLICY "Permitir todo a todos en workers" ON workers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a todos en inventory_items" ON inventory_items;
CREATE POLICY "Permitir todo a todos en inventory_items" ON inventory_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a todos en transactions" ON transactions;
CREATE POLICY "Permitir todo a todos en transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a todos en transaction_items" ON transaction_items;
CREATE POLICY "Permitir todo a todos en transaction_items" ON transaction_items FOR ALL USING (true) WITH CHECK (true);

-- 7. Datos de muestra iniciales e Insumos Frecuentes / Botiquines
INSERT INTO workers (full_name, ci, position, department, supervisor_name) VALUES
('Juan Carlos Perez', '1234567', 'Operador de Planta', 'Producción', 'Ing. Mario Gomez'),
('Ana Maria Rodriguez', '7654321', 'Soldador Calificado', 'Mantenimiento', 'Ing. Carlos Sanchez'),
('Luis Fernando Lopez', '9876543', 'Técnico Eléctrico', 'Mantenimiento', 'Ing. Carlos Sanchez')
ON CONFLICT (ci) DO NOTHING;

INSERT INTO inventory_items (name, category, current_stock) VALUES
('Guantes de cuero delgados (par)', 'epp', 50.00),
('Guantes de cuero cortos (par)', 'epp', 30.00),
('Guantes de nitrilo (color verde) (par)', 'epp', 100.00),
('Lentes de protección (transparente) (pza)', 'epp', 80.00),
('Overoles desechables (blancos) (pza)', 'ropa', 50.00),
('Botiquín de Primeros Auxilios (Dotación)', 'epp', 15.00),
('Casco de Seguridad Amarillo', 'epp', 50.00),
('Botas de Seguridad de Cuero Punta de Acero', 'epp', 35.00),
('Arnés de Seguridad Multipropósito', 'epp', 15.00),
('Overol de Trabajo Azul (Talla M)', 'ropa', 40.00),
('Overol de Trabajo Azul (Talla L)', 'ropa', 45.00),
('Camisa de Trabajo Manga Larga (Talla M)', 'ropa', 60.00),
('Camotera Térmica Impermeable', 'ropa', 25.00),
('Juego de Llaves Combinadas (12 piezas)', 'herramientas', 8.00),
('Rotomartillo Industrial Bosch', 'herramientas', 5.00),
('Amoladora Angular 4.5" DeWalt', 'herramientas', 10.00)
ON CONFLICT (name) DO NOTHING;
