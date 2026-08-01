# Guía de Migración a la Base de Datos Real de Producción

Esta guía contiene la secuencia exacta de pasos y consultas SQL que debes ejecutar en el **SQL Editor** del proyecto de Supabase real del cliente. Sigue este orden para evitar problemas de dependencias y asegurar que la base de datos de producción quede idéntica a nuestro sandbox de desarrollo.

---

## PASO 1: Alteración y Ajuste de Columnas Existentes
Si el cliente ya cuenta con la base de datos previa en producción, debemos añadir las nuevas columnas de secuencia física, orden de torres y trazabilidad de historial.

Ejecuta el siguiente bloque SQL:

```sql
-- 1. Añadir columna 'orden' a la tabla torres (si no existe)
ALTER TABLE public.torres ADD COLUMN IF NOT EXISTS orden INTEGER;

-- 2. Añadir columna 'secuencia' a la tabla inventario (si no existe)
ALTER TABLE public.inventario ADD COLUMN IF NOT EXISTS secuencia INTEGER;

-- 3. Añadir columna 'recepcion_id' a la tabla inventario para trazabilidad de entrada
ALTER TABLE public.inventario ADD COLUMN IF NOT EXISTS recepcion_id UUID REFERENCES public.recepciones(id) ON DELETE SET NULL;

-- 4. Añadir columna 'motivo' a la tabla despachos
ALTER TABLE public.despachos ADD COLUMN IF NOT EXISTS motivo TEXT DEFAULT 'Consumo';

-- 5. Añadir columnas de fotos de auditoría (arrays de URLs) a las sesiones
ALTER TABLE public.recepciones ADD COLUMN IF NOT EXISTS fotos TEXT[] DEFAULT '{}';
ALTER TABLE public.despachos ADD COLUMN IF NOT EXISTS fotos TEXT[] DEFAULT '{}';

-- 6. Añadir columnas de trazabilidad al historial de movimientos
ALTER TABLE public.historial ADD COLUMN IF NOT EXISTS recepcion_id UUID REFERENCES public.recepciones(id) ON DELETE SET NULL;
ALTER TABLE public.historial ADD COLUMN IF NOT EXISTS despacho_id UUID REFERENCES public.despachos(id) ON DELETE SET NULL;
```

---

## PASO 2: Creación de Nuevas Tablas de Control
Ejecuta el siguiente código para crear las tablas de borrador temporal y de perfiles de usuario:

```sql
-- 1. Tabla de sesiones/borradores activos para sincronización y soporte multidispositivo
CREATE TABLE IF NOT EXISTS public.active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL, -- 'reception' | 'dispatch'
  operador TEXT NOT NULL, -- Nombre del operador
  datos JSONB NOT NULL, -- Estructura de la sesión
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tipo, operador)
);

-- 2. Tabla de perfiles para control de roles y permisos
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'Operador', -- 'Administrador' o 'Operador'
  aprobado BOOLEAN NOT NULL DEFAULT false, -- Aprobación por parte de un administrador
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## PASO 3: Triggers de Gravedad Física (Automatización de Secuencia)
Estos disparadores recalculan de forma atómica y transparente las posiciones de apilamiento en la torre tras cualquier inserción o borrado.

Ejecuta el siguiente bloque SQL:

```sql
-- Trigger de Inserción: Desplaza hacia arriba (secuencia = secuencia + 1) e inserta en la base (secuencia = 1)
CREATE OR REPLACE FUNCTION public.trg_inventario_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.inventario
  SET secuencia = secuencia + 1
  WHERE torre_id = NEW.torre_id;
  
  NEW.secuencia := 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER before_inventario_insert
BEFORE INSERT ON public.inventario
FOR EACH ROW
EXECUTE FUNCTION public.trg_inventario_insert();


-- Trigger de Eliminación: Desplaza hacia abajo las secuencias superiores (rellena el vacío)
CREATE OR REPLACE FUNCTION public.trg_inventario_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.torre_id IS NOT NULL AND OLD.secuencia IS NOT NULL THEN
    UPDATE public.inventario
    SET secuencia = secuencia - 1
    WHERE torre_id = OLD.torre_id AND secuencia > OLD.secuencia;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER after_inventario_delete
AFTER DELETE ON public.inventario
FOR EACH ROW
EXECUTE FUNCTION public.trg_inventario_delete();
```

---

## PASO 4: Trigger de Creación Automática de Perfiles
Este disparador asocia cada cuenta registrada en Supabase Auth con su perfil público y rol por defecto.

Ejecuta el siguiente bloque SQL:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, rol)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'Operador de Planta'),
    new.email,
    COALESCE(new.raw_user_meta_data->>'rol', 'Operador')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## PASO 5: Políticas de Seguridad a Nivel de Fila (RLS)
Habilita la seguridad en las nuevas tablas y define sus accesos públicos/privados:

```sql
-- Habilitar RLS
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso para desarrollo (Libre lectura/escritura)
CREATE POLICY "Permitir todo a active_sessions" ON public.active_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
```

---

## PASO 6: Inicialización de Torres Existentes en DB Real
Si tu base de datos de producción real ya tiene las torres ingresadas pero la columna `orden` está vacía (en `null`), debes inicializarla para que el frontend pueda ordenar las torres de la `P01` a la `P34` correctamente.

Ejecuta esta consulta para auto-generar los índices en base a su posición alfabética:

```sql
WITH ordenadas AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY posicion ASC) as row_num
  FROM public.torres
)
UPDATE public.torres
SET orden = ordenadas.row_num
FROM ordenadas
WHERE public.torres.id = ordenadas.id;
```

---

## PASO 7: Configuración de Almacenamiento (Storage de Fotos)
Para que la subida y compresión de fotos de camiones funcione:

1. Ve a la consola de Supabase del cliente.
2. Selecciona **Storage** en la barra lateral.
3. Crea un nuevo **Bucket** (New Bucket).
4. Configura el nombre exactamente como **`fotos`**.
5. Asegúrate de marcar la casilla **Public Bucket** (para que las URLs de auditoría se puedan visualizar de forma directa en el historial del administrador).

---

## PASO 8: Módulo de Gestión de Transportes (Empresas, Placas y Conductores)
Para habilitar el catálogo de flotas autorizadas, ejecuta las siguientes instrucciones en tu SQL Editor:

```sql
-- 1. Crear tabla de Empresas
CREATE TABLE IF NOT EXISTS public.empresas_transporte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Crear tabla de Placas
CREATE TABLE IF NOT EXISTS public.placas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas_transporte(id) ON DELETE CASCADE NOT NULL,
  placa_remolque TEXT NOT NULL,
  placa_semiremolque TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(placa_remolque, placa_semiremolque)
);

-- 3. Crear tabla de Conductores
CREATE TABLE IF NOT EXISTS public.conductores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas_transporte(id) ON DELETE CASCADE NOT NULL,
  dni TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Ampliar tabla de recepciones
ALTER TABLE public.recepciones ADD COLUMN IF NOT EXISTS empresa_transporte TEXT;
ALTER TABLE public.recepciones ADD COLUMN IF NOT EXISTS placa_remolque TEXT;
ALTER TABLE public.recepciones ADD COLUMN IF NOT EXISTS placa_semiremolque TEXT;
ALTER TABLE public.recepciones ADD COLUMN IF NOT EXISTS conductor_dni TEXT;

-- 5. Habilitar RLS en las nuevas tablas
ALTER TABLE public.empresas_transporte ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conductores ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de lectura pública para autenticados
CREATE POLICY "Permitir lectura a autenticados en empresas" ON public.empresas_transporte FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura a autenticados en placas" ON public.placas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura a autenticados en conductores" ON public.conductores FOR SELECT TO authenticated USING (true);

-- 7. Políticas de escritura exclusivas para Administradores
CREATE POLICY "Permitir todo a Administradores en empresas" ON public.empresas_transporte FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'Administrador'));

CREATE POLICY "Permitir todo a Administradores en placas" ON public.placas FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'Administrador'));

CREATE POLICY "Permitir todo a Administradores en conductores" ON public.conductores FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'Administrador'));

-- 8. Registrar Datos Iniciales (Población desde la lista autorizada)
INSERT INTO public.empresas_transporte (nombre)
VALUES 
  ('JRM'),
  ('GRUPO REC')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.placas (empresa_id, placa_remolque, placa_semiremolque)
VALUES
  ((SELECT id FROM public.empresas_transporte WHERE nombre = 'JRM'), 'BCW838', 'ARB976'),
  ((SELECT id FROM public.empresas_transporte WHERE nombre = 'GRUPO REC'), 'D5H756', 'W2Y765'),
  ((SELECT id FROM public.empresas_transporte WHERE nombre = 'GRUPO REC'), 'B1B-820', 'B1Q-983')
ON CONFLICT (placa_remolque, placa_semiremolque) DO NOTHING;

INSERT INTO public.conductores (empresa_id, dni, nombre)
VALUES
  ((SELECT id FROM public.empresas_transporte WHERE nombre = 'GRUPO REC'), 'Q20006531', 'MANUEL JAIME GUTARRA HUAMAN'),
  ((SELECT id FROM public.empresas_transporte WHERE nombre = 'GRUPO REC'), 'Q45254576', 'JHAIR SAMUEL HUACHOS ORIHUELA'),
  ((SELECT id FROM public.empresas_transporte WHERE nombre = 'GRUPO REC'), 'Q44017007', 'ELISEO IGNACIO TENORIO SOLIS'),
  ((SELECT id FROM public.empresas_transporte WHERE nombre = 'JRM'), 'Q42212220', 'JESUS MANUEL')
ON CONFLICT (dni) DO NOTHING;
```
