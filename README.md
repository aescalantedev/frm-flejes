# Sistema de Flejes v2.0 - Planta Chilca

Plataforma Web PWA de escritorio y móvil optimizada para la gestión de inventario, pesaje, apilamiento en torres físicas, y trazabilidad colaborativa de flejes de acero, conectada en tiempo real a **Supabase**.

---

## 🚀 Características Clave

### 1. Monitoreo Físico y Gravedad en Torres (Panorama)
* **Visualización de Celdas/Torres**: Mapa visual interactivo de las torres físicas de almacenamiento (de la `P01` a la `P34`).
* **Triggers de Gravedad PL/pgSQL**: El orden de apilamiento se controla de forma automática y atómica en el servidor. Al eliminar un fleje inferior, las secuencias superiores caen una posición. Al insertar uno nuevo, se apila en la base empujando el resto hacia arriba.

### 2. Trazabilidad por Lotes de Ingresos y Despachos
* **Recepción (Ingreso)**: Control de choferes, número de guía/solicitud, observaciones y evidencia fotográfica.
* **Despacho (Salidas / Consumo)**: Carrito de despacho táctil a pantalla completa, selección ágil de flejes por lote, y auditoría en tiempo real.
* **Salidas Directas Normalizadas**: Incluso las salidas o consumos rápidos de flejes individuales se registran como mini-despachos vinculados a las tablas maestras, garantizando consistencia de tiempos (inicio/fin) y duraciones.

### 3. Sincronización en Nube Contra Desconexiones
* **Persistencia Inmune a F5**: El borrador en curso de recepción o despacho se guarda al instante en `localStorage` del navegador y en la tabla `active_sessions` de Supabase.
* **Soporte Multidispositivo**: Si el teléfono del operador se apaga o sufre un accidente físico en la planta, puede iniciar sesión en otro dispositivo y recuperar automáticamente su sesión de trabajo exactamente donde la dejó.

### 4. Monitoreo en Tiempo Real para el Administrador
* **Dashboard Admin**: Panel de control con luces rojas pulsantes que muestran en tiempo real qué operador está trabajando en la planta, qué chofer/destino está procesando, cuántos flejes lleva cargados y cuántos minutos lleva activo en su turno (polling automatizado cada 5 segundos).

### 5. Control de Usuarios y Roles
* **Gestión Integrada**: Dos niveles de rol: **Administrador** (PC) y **Operador** (Teléfonos móviles).
* **Mantenimiento Autónomo**: Los administradores pueden cambiar roles de operadores o aprobar nuevos usuarios directamente desde la interfaz de la aplicación, sin necesidad de interactuar con la consola de Supabase.
* **Seguridad Reactiva**: Redirección automática de operadores que intenten forzar URL/vistas de administración y bloqueo de menús de backup o borrado.

### 6. Servicio de Compresión de Imágenes
* **WebP Compactor**: Servicio en el cliente que detecta imágenes pesadas de cámaras de celulares (ej. 5MB) y las comprime a formato WebP optimizado (~100KB) antes de subirlas al bucket de Supabase, optimizando ancho de banda y espacio de almacenamiento.

---

## 🛠️ Tecnologías Utilizadas

* **Frontend**: React 18, Vite 8, Tailwind CSS, Lucide React (Iconografía)
* **Backend de Datos**: Supabase (PostgreSQL, Auth, RLS y Storage)
* **Manejador de Estado**: TanStack React Query (Gestión optimizada de caché y refresco reactivo)

---

## 📂 Estructura del Código

```text
├── src/
│   ├── App.jsx             # Punto de entrada de la app, escuchas de auth, gestores de modales y sync
│   ├── main.jsx            # Configuración de renderizado y React Query Client
│   ├── components/         # Componentes y Vistas Modulares
│   │   ├── AppBar.jsx          # Barra de cabecera con buscador integrado y menú de usuario
│   │   ├── Sidebar.jsx         # Menú lateral colapsable de escritorio (con seguridad de roles)
│   │   ├── LoginScreen.jsx     # Formulario de login/registro con alertas de estado de verificación
│   │   ├── PanoramaView.jsx    # Tablero interactivo de torres y bobinas
│   │   ├── HistorialView.jsx   # Listado transaccional y visor dinámico de duración y fotos
│   │   ├── ConfigView.jsx      # Configuración de temas, backups y panel de usuarios/roles para admin
│   │   ├── DetailDrawer.jsx    # Slideover lateral de inventario y acciones por lote en torre
│   │   └── TrasladoModal.jsx   # Modal de salida individual estandarizado con campo Destino
│   ├── lib/
│   │   ├── supabase.js         # Cliente API configurado para la conexión remota
│   │   └── theme.js            # Sistema dinámico de temas visuales minimalistas
```

---

## 💻 Desarrollo Local

### 1. Pre-requisitos
Tener instalado Node.js (v18+) y un gestor de paquetes como `pnpm` o `npm`.

### 2. Configurar Variables de Entorno
Crea un archivo llamado `.env.local` en la raíz del proyecto y agrega tus claves del proyecto Supabase:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-de-supabase
```

### 3. Instalar dependencias e iniciar
Ejecuta las siguientes instrucciones en tu terminal:

```bash
# Instalar paquetes
pnpm install

# Iniciar servidor de desarrollo con HMR
pnpm run dev
```

La aplicación estará corriendo localmente en: `http://localhost:5173`.

---

## 🗄️ Inicialización de Base de Datos (Producción)

Los scripts SQL de creación de tablas, triggers relacionales de pila física, disparadores de autenticación y políticas RLS se encuentran documentados secuencialmente en el archivo [produccion_migration_guide.md](./produccion_migration_guide.md). 

Sigue ese manual paso a paso al momento de conectar la base de datos real del cliente en producción.
