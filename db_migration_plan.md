# Plan de Configuración de Base de Datos Sandbox (Supabase)

Este documento detalla el plan para crear y poblar una base de datos **Sandbox personal en Supabase**, permitiéndonos desarrollar e implementar los flujos avanzados de **Recepción**, **Despacho** y **Ordenamiento físico** sin estar bloqueados por el acceso de producción.

---

## 1. Script de Estructura de Base de Datos (SQL Completo)

Ejecuta el siguiente bloque SQL en el **SQL Editor** de tu nuevo proyecto de Supabase. Hemos actualizado el campo `chofer` a `entregado_por` (para mayor generalidad) e incorporado columnas de tipo `TEXT[]` (arrays de cadenas) para almacenar las URLs de las fotos de auditoría:

```sql
-- ========================================================
-- 1. TABLA DE RECEPCIONES (Sesión de Ingreso / Entrada)
-- ========================================================
CREATE TABLE recepciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entregado_por TEXT, -- Nombre de la persona o transportista que entrega
  usuario_receptor TEXT, -- Operador en sesión que recibe
  hora_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  hora_fin TIMESTAMPTZ,
  estado TEXT DEFAULT 'RECIBIENDO', -- 'RECIBIENDO', 'COMPLETADO'
  observaciones TEXT,
  fotos TEXT[] DEFAULT '{}', -- Array de URLs de fotos cargadas a Supabase Storage
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================================
-- 2. TABLA DE DESPACHOS (Sesión de Salida / Consumo)
-- ========================================================
CREATE TABLE despachos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destino TEXT,
  num_solicitud TEXT,
  motivo TEXT DEFAULT 'Consumo', -- 'Consumo', 'Devolución'
  usuario_despachador TEXT, -- Operador en sesión que despacha
  hora_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  hora_fin TIMESTAMPTZ,
  estado TEXT DEFAULT 'DESPACHANDO', -- 'DESPACHANDO', 'ENTREGADO'
  observaciones TEXT,
  fotos TEXT[] DEFAULT '{}', -- Array de URLs de fotos (ej. guía firmada, camión cargado)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================================
-- 3. TABLA DE TORRES (Configuración de Almacenamiento)
-- ========================================================
CREATE TABLE torres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posicion TEXT UNIQUE NOT NULL,
  nombre_medida TEXT NOT NULL,
  cantidad_maxima INTEGER NOT NULL DEFAULT 5,
  orden INTEGER, -- Columna para controlar el ordenamiento manual de las torres
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================================
-- 4. TABLA DE INVENTARIO (Flejes Almacenados en Activo)
-- ========================================================
CREATE TABLE inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  torre_id UUID REFERENCES torres(id) ON DELETE CASCADE,
  peso NUMERIC NOT NULL,
  secuencia INTEGER, -- Posición en la pila (1 = base, capMax = tope)
  recepcion_id UUID REFERENCES recepciones(id) ON DELETE SET NULL, -- Trazabilidad de recepción
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================================
-- 5. TABLA DE HISTORIAL (Bitácora de Salidas y Movimientos)
-- ========================================================
CREATE TABLE historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  torre_id UUID,
  posicion TEXT,
  medida TEXT,
  peso_fleje NUMERIC,
  motivo TEXT,
  num_solicitud TEXT,
  despachador TEXT,
  hora_inicio TIMESTAMPTZ,
  recepcion_id UUID REFERENCES recepciones(id) ON DELETE SET NULL, -- De qué recepción de camión provino originalmente el fleje
  despacho_id UUID REFERENCES despachos(id) ON DELETE SET NULL, -- En qué solicitud de despacho salió
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================================
-- 6. TABLA DE OPERACIONES EN CURSO (Sesiones Activas en Tiempo Real)
-- ========================================================
CREATE TABLE active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL, -- 'reception' | 'dispatch'
  operador TEXT NOT NULL, -- Nombre del operador
  datos JSONB NOT NULL, -- Borrador de la sesión (chofer, guía, fotos, items)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tipo, operador)
);

-- ========================================================
-- 7. POLÍTICAS DE ACCESO PÚBLICO (RLS) PARA DESARROLLO
-- ========================================================
ALTER TABLE recepciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE despachos ENABLE ROW LEVEL SECURITY;
ALTER TABLE torres ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir todo a recepciones" ON recepciones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a despachos" ON despachos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a torres" ON torres FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a inventario" ON inventario FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a historial" ON historial FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a active_sessions" ON active_sessions FOR ALL USING (true) WITH CHECK (true);

-- ========================================================
-- 8. TABLAS DE GESTIÓN DE TRANSPORTES (Empresas, Placas, Conductores)
-- ========================================================
CREATE TABLE empresas_transporte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE placas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas_transporte(id) ON DELETE CASCADE NOT NULL,
  placa_remolque TEXT NOT NULL,
  placa_semiremolque TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(placa_remolque, placa_semiremolque)
);

CREATE TABLE conductores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas_transporte(id) ON DELETE CASCADE NOT NULL,
  dni TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ampliación de recepciones
ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS empresa_transporte TEXT;
ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS placa_remolque TEXT;
ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS placa_semiremolque TEXT;
ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS conductor_dni TEXT;

-- RLS y políticas
ALTER TABLE empresas_transporte ENABLE ROW LEVEL SECURITY;
ALTER TABLE placas ENABLE ROW LEVEL SECURITY;
ALTER TABLE conductores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir todo a empresas_transporte" ON empresas_transporte FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a placas" ON placas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a conductores" ON conductores FOR ALL USING (true) WITH CHECK (true);

-- ========================================================
-- 9. DATOS DE FLOTA INICIALES (Población desde la lista autorizada)
-- ========================================================
INSERT INTO empresas_transporte (nombre)
VALUES 
  ('JRM'),
  ('GRUPO REC')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO placas (empresa_id, placa_remolque, placa_semiremolque)
VALUES
  ((SELECT id FROM empresas_transporte WHERE nombre = 'JRM'), 'BCW838', 'ARB976'),
  ((SELECT id FROM empresas_transporte WHERE nombre = 'GRUPO REC'), 'D5H756', 'W2Y765'),
  ((SELECT id FROM empresas_transporte WHERE nombre = 'GRUPO REC'), 'B1B-820', 'B1Q-983')
ON CONFLICT (placa_remolque, placa_semiremolque) DO NOTHING;

INSERT INTO conductores (empresa_id, dni, nombre)
VALUES
  ((SELECT id FROM empresas_transporte WHERE nombre = 'GRUPO REC'), 'Q20006531', 'MANUEL JAIME GUTARRA HUAMAN'),
  ((SELECT id FROM empresas_transporte WHERE nombre = 'GRUPO REC'), 'Q45254576', 'JHAIR SAMUEL HUACHOS ORIHUELA'),
  ((SELECT id FROM empresas_transporte WHERE nombre = 'GRUPO REC'), 'Q44017007', 'ELISEO IGNACIO TENORIO SOLIS'),
  ((SELECT id FROM empresas_transporte WHERE nombre = 'JRM'), 'Q42212220', 'JESUS MANUEL')
ON CONFLICT (dni) DO NOTHING;
```

---

## 2. Configuración de Supabase Storage (Para las Fotos)

Para poder subir imágenes directamente desde la aplicación y obtener sus URLs públicas, necesitamos crear un "Bucket" de almacenamiento en Supabase:

1. En el panel lateral de Supabase, ve a la sección **Storage** (icono de cubo/carpeta).
2. Haz clic en **New Bucket**.
3. Nómbralo exactamente: **`fotos`**.
4. **IMPORTANTE**: Activa la casilla **Public bucket**. Esto permitirá que la app lea y muestre las imágenes directamente usando la URL pública de cada archivo sin requerir tokens privados de sesión.
5. Haz clic en **Create bucket**.

---

## 3. Script de Automatización de Gravedad (Triggers SQL)

Una vez que los datos iniciales han sido cargados con el script de importación, ejecuta este bloque en el **SQL Editor** para que Supabase maneje la secuencia (gravedad física) de forma 100% automática en el futuro:

```sql
-- ========================================================
-- 7. TRIGGERS PARA CONTROL AUTOMÁTICO DE GRAVEDAD
-- ========================================================

-- Trigger de Inserción: Coloca el nuevo fleje en la cima de la torre (secuencia más alta + 1)
CREATE OR REPLACE FUNCTION trg_inventario_insert()
RETURNS TRIGGER AS $$
DECLARE
  max_secuencia INTEGER;
BEGIN
  IF NEW.torre_id IS NULL THEN
    NEW.secuencia := NULL;
  ELSE
    -- El nuevo fleje siempre entra en la cima (sobre los existentes)
    SELECT COALESCE(MAX(secuencia), 0) INTO max_secuencia
    FROM inventario
    WHERE torre_id = NEW.torre_id;
    
    NEW.secuencia := max_secuencia + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_inventario_insert
BEFORE INSERT ON inventario
FOR EACH ROW
EXECUTE FUNCTION trg_inventario_insert();


-- Trigger de Eliminación: Desplaza hacia abajo las secuencias superiores (rellena el vacío)
CREATE OR REPLACE FUNCTION trg_inventario_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.torre_id IS NOT NULL AND OLD.secuencia IS NOT NULL THEN
    UPDATE inventario
    SET secuencia = secuencia - 1
    WHERE torre_id = OLD.torre_id AND secuencia > OLD.secuencia;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_inventario_delete
AFTER DELETE ON inventario
FOR EACH ROW
EXECUTE FUNCTION trg_inventario_delete();
```

---

## 4. Instrucciones de Migración Paso a Paso

Sigue este orden exacto para inicializar y poblar tu base de datos:

1. **Estructura Inicial**: Ejecuta el primer SQL (Sección 1) en tu **SQL Editor** de Supabase para crear las tablas vacías.
2. **Crear Bucket**: Configura el bucket de almacenamiento público llamado **`fotos`** en Supabase Storage (Sección 2).
3. **Configurar Entorno**: Coloca la URL y Key anon de tu nuevo proyecto en tu archivo local [.env.local](file:///c:/Users/anthony/Downloads/supabase/supabase/.env.local).
4. **Importación Inicial**: Ejecuta el script en tu terminal para poblar las torres y flejes con la secuencia correcta precalculada:
   ```bash
   node legacy/import_db.js
   ```
5. **Activar Automatización**: Vuelve al **SQL Editor** en Supabase y ejecuta el SQL de los Triggers (Sección 3). A partir de este momento, cualquier inserción o eliminación mantendrá el orden de la pila de forma automática y transparente.
