-- SCRIPT DE INICIALIZACIÓN DE BASE DE DATOS (Supabase PostgreSQL)
-- Ejecutar en el SQL Editor de tu proyecto de Supabase.

-- 1. Crear tipos ENUM (si no existen)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'category_type') THEN
        CREATE TYPE category_type AS ENUM ('ropa', 'epp', 'herramientas');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type_enum') THEN
        CREATE TYPE transaction_type_enum AS ENUM ('devolucion', 'entrega', 'intercambio');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'condition_reason_enum') THEN
        CREATE TYPE condition_reason_enum AS ENUM ('desgaste_natural', 'dano_operativo', 'defecto_fabrica', 'cambio_talla', 'nuevo');
    END IF;
END
$$;

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

-- Indexar CI para búsquedas rápidas (autocompletado)
CREATE INDEX IF NOT EXISTS idx_workers_ci ON workers(ci);
CREATE INDEX IF NOT EXISTS idx_workers_full_name ON workers(full_name);

-- 3. Crear tabla de Inventario (inventory_items)
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    category category_type NOT NULL,
    current_stock INT NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Crear tabla de Transacciones (transactions)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE RESTRICT,
    supervisor_name TEXT NOT NULL,
    transaction_type transaction_type_enum NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    signature_url TEXT NOT NULL -- URL en Supabase Storage
);

-- 5. Crear tabla de Items por Transacción (transaction_items)
CREATE TABLE IF NOT EXISTS transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    category category_type NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    condition_reason condition_reason_enum NOT NULL,
    photo_url TEXT, -- Opcional, URL en Supabase Storage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Configurar RLS (Row Level Security) y Políticas de Acceso
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

-- Crear políticas para permitir todas las operaciones (desarrollo y prototipo interno)
-- NOTA: En un entorno de producción real con autenticación de usuarios, estas políticas se restringirían a `auth.uid()`.
DROP POLICY IF EXISTS "Permitir todo a todos en workers" ON workers;
CREATE POLICY "Permitir todo a todos en workers" ON workers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a todos en inventory_items" ON inventory_items;
CREATE POLICY "Permitir todo a todos en inventory_items" ON inventory_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a todos en transactions" ON transactions;
CREATE POLICY "Permitir todo a todos en transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a todos en transaction_items" ON transaction_items;
CREATE POLICY "Permitir todo a todos en transaction_items" ON transaction_items FOR ALL USING (true) WITH CHECK (true);

-- 7. Datos de muestra iniciales (Seed Data)
INSERT INTO workers (full_name, ci, position, department, supervisor_name) VALUES
('Juan Carlos Perez', '1234567', 'Operador de Planta', 'Producción', 'Ing. Mario Gomez'),
('Ana Maria Rodriguez', '7654321', 'Soldador Calificado', 'Mantenimiento', 'Ing. Carlos Sanchez'),
('Luis Fernando Lopez', '9876543', 'Técnico Eléctrico', 'Mantenimiento', 'Ing. Carlos Sanchez')
ON CONFLICT (ci) DO NOTHING;

INSERT INTO inventory_items (name, category, current_stock) VALUES
('Casco de Seguridad Amarillo', 'epp', 50),
('Lentes de Seguridad Anti-empañantes', 'epp', 120),
('Guantes de Cuero de Gato (par)', 'epp', 200),
('Botas de Seguridad de Cuero Punta de Acero', 'epp', 35),
('Arnés de Seguridad Multipropósito', 'epp', 15),
('Overol de Trabajo Azul (Talla M)', 'ropa', 40),
('Overol de Trabajo Azul (Talla L)', 'ropa', 45),
('Camisa de Trabajo Manga Larga (Talla M)', 'ropa', 60),
('Camotera Térmica Impermeable', 'ropa', 25),
('Juego de Llaves Combinadas (12 piezas)', 'herramientas', 8),
('Rotomartillo Industrial Bosch', 'herramientas', 5),
('Amoladora Angular 4.5" DeWalt', 'herramientas', 10),
('Pinza Amperimétrica Fluke', 'herramientas', 4)
ON CONFLICT (name) DO NOTHING;

-- 8. Configuración de Almacenamiento (Supabase Storage)
-- Para crear los buckets en Supabase Storage de manera automática vía SQL, podemos usar la extensión storage.
-- Si la extensión no está habilitada o no hay permisos directos, estos buckets también pueden ser creados desde la interfaz web de Supabase.
-- De todos modos, incluimos el SQL para crearlos e insertar las políticas de acceso público correspondientes:

INSERT INTO storage.buckets (id, name, public) 
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('evidences', 'evidences', true)
ON CONFLICT (id) DO NOTHING;

-- Crear políticas para permitir lectura pública y subida sin autenticación en 'signatures'
CREATE POLICY "Acceso público lectura firmas" ON storage.objects FOR SELECT USING (bucket_id = 'signatures');
CREATE POLICY "Permitir subida firmas" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'signatures');

-- Crear políticas para permitir lectura pública y subida sin autenticación en 'evidences'
CREATE POLICY "Acceso público lectura evidencias" ON storage.objects FOR SELECT USING (bucket_id = 'evidences');
CREATE POLICY "Permitir subida evidencias" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'evidences');
