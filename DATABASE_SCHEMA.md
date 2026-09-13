# Documentación de Base de Datos (Supabase)

Esta es la estructura actualizada de la base de datos de producción para el sistema de control de flejes.

## 1. Inventario Físico

### tabla: `flejes`
Almacena el inventario físico actual de los flejes en almacén.
- `id` (UUID): Identificador principal.
- `ubicacion_id` (UUID): FK a `ubicaciones` (torre donde se encuentra).
- `peso_kg` (NUMERIC): Peso del fleje.
- `costo_kg_ingreso` (NUMERIC): Valor de costo al momento de ingreso.
- `lote` (TEXT): Número de lote/colada.
- `producto_id` (UUID): FK a `catalogo_productos`.
- `fecha_ingreso` (TIMESTAMPTZ): Fecha de llegada.
- `secuencia` (INTEGER): Posición física de apilamiento en la torre (Gravedad. El más alto = cima).

### tabla: `ubicaciones`
Catálogo de torres de almacenamiento físico.
- `id` (UUID): PK.
- `codigo_posicion` (TEXT): Ej. 'P01', 'P02'.
- `tipo` (TEXT): Tipo de almacenamiento.
- `estado` (TEXT): 'Lleno', 'Parcial', 'Vacío'.
- `capacidad_maxima` (INTEGER): Número máximo de flejes que soporta.

### tabla: `catalogo_productos`
Maestro de materiales.
- `id` (UUID): PK.
- `codigo` (TEXT): Código interno del material.
- `descripcion` (TEXT): Nombre descriptivo.
- `calibre` (NUMERIC): Espesor.
- `ancho` (NUMERIC): Ancho del fleje.

## 2. Transacciones y Flujos

### tabla: `recepciones`
Cabecera de ingresos (llegada de camiones).
- `id` (UUID): PK.
- `empresa_transporte`, `entregado_por`, `conductor_dni`, `placa_remolque`, `placa_semiremolque`: Datos logísticos.
- `usuario_receptor` (TEXT): Operador que recibe.
- `estado` (TEXT): 'RECIBIENDO', 'COMPLETADO'.
- `fotos` (TEXT[]): URLs de auditoría fotográfica.

### tabla: `despachos`
Cabecera de salidas (consumo a planta o cliente).
- `id` (UUID): PK.
- `destino` (TEXT): A dónde va el material.
- `motivo` (TEXT): 'Despacho', 'Consumo'.
- `usuario_despachador` (TEXT): Operador a cargo.
- `estado` (TEXT): 'DESPACHANDO', 'ENTREGADO'.
- `fotos` (TEXT[]): URLs de evidencia.

## 3. Trazabilidad y Auditoría

### tabla: `historial_movimientos`
Bitácora inmutable de todo lo que ocurre con los flejes. Registra Ingresos, Salidas, Ajustes y Traslados Internos.
- `id` (UUID): PK.
- `fleje_id` (UUID): Fleje que fue movido.
- `ubicacion_id` (UUID): Dónde ocurrió.
- `peso_kg`, `costo_kg_aplicado`: Snapshot financiero en el instante.
- `motivo` (TEXT): Razón ('Ingreso', 'Consumo', 'Traslado Interno (Desde P01)').
- `usuario` (TEXT): Quién ejecutó el movimiento.
- `recepcion_id`, `despacho_id` (UUID): Enlaces opcionales a la cabecera de la transacción de origen.

## 4. Control de Usuarios y Sistema

### tabla: `profiles`
Roles y perfiles de usuarios vinculados a `auth.users` de Supabase.
- `id` (UUID): FK a auth.users.
- `name` (TEXT): Nombre para mostrar.
- `rol` (TEXT): 'Administrador' o 'Operador'.
- `aprobado` (BOOLEAN): Control de acceso.

### tabla: `active_sessions`
Recuperación de borradores en caso de pérdida de conexión.
- `tipo` (TEXT): 'reception', 'dispatch', 'transfer'.
- `operador` (TEXT): Usuario activo.
- `datos` (JSONB): Payload del carrito de trabajo actual.
