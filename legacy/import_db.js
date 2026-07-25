import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Helper para parsear archivos .env manualmente en Node.js sin dependencias
function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  content.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      env[key] = value;
    }
  });
  return env;
}

const env = loadEnv('.env.local');
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: No se encontraron VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.local');
  process.exit(1);
}

console.log(`Conectando al nuevo Supabase Sandbox: ${SUPABASE_URL}`);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function importData() {
  console.log('Iniciando restauración e importación de datos en la base de datos sandbox...');
  
  try {
    // 1. Validar existencia de los archivos de backup
    if (!fs.existsSync('legacy/torres_backup.json') || !fs.existsSync('legacy/inventario_backup.json')) {
      console.error('Error: Faltan archivos de backup en la carpeta legacy/ (torres_backup.json o inventario_backup.json)');
      process.exit(1);
    }

    const torres = JSON.parse(fs.readFileSync('legacy/torres_backup.json', 'utf8'));
    const inventario = JSON.parse(fs.readFileSync('legacy/inventario_backup.json', 'utf8'));

    console.log(`Leídos ${torres.length} torres y ${inventario.length} flejes de las copias de seguridad locales.`);

    // 2. Procesar e Inyectar ORDEN de las Torres (Orden alfabético natural P01, P02... P34)
    console.log('Calculando columna "orden" para las torres...');
    torres.sort((a, b) => a.posicion.localeCompare(b.posicion, undefined, { numeric: true, sensitivity: 'base' }));
    torres.forEach((torre, index) => {
      torre.orden = index + 1;
    });

    // 3. Procesar e Inyectar SECUENCIA de los Flejes (created_at desc -> 1 es base más nueva, N es tope más antiguo)
    console.log('Calculando columna "secuencia" para los flejes apilados...');
    
    // Separar flejes asignados a una torre y flejes en el piso
    const flejesConTorre = inventario.filter(f => f.torre_id);
    const flejesEnPiso = inventario.filter(f => !f.torre_id);

    // Agrupar flejes con torre por torre_id
    const groups = {};
    flejesConTorre.forEach(fleje => {
      const tid = fleje.torre_id;
      if (!groups[tid]) {
        groups[tid] = [];
      }
      groups[tid].push(fleje);
    });

    // Ordenar y secuenciar cada torre
    Object.keys(groups).forEach(tid => {
      const group = groups[tid];
      // Ordenar de más nuevo (created_at desc) a más antiguo
      group.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      group.forEach((fleje, index) => {
        fleje.secuencia = index + 1; // 1 = base (más reciente), N = tope (más antiguo)
      });
    });

    // Aplanar inventario de torres secuenciado
    const processedInventarioConTorre = Object.values(groups).flat();

    // Los flejes en el piso no tienen secuencia
    flejesEnPiso.forEach(f => {
      f.secuencia = null;
    });

    const finalInventario = [...processedInventarioConTorre, ...flejesEnPiso];

    // 4. Limpiar datos existentes en el sandbox
    console.log('Limpiando datos existentes en el sandbox...');
    await supabase.from('inventario').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('torres').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 5. Insertar Torres procesadas
    console.log('Insertando torres con ordenamiento precalculado...');
    const { error: eTorres } = await supabase.from('torres').insert(torres);
    if (eTorres) throw eTorres;
    console.log('¡Torres importadas correctamente!');

    // 6. Insertar Inventario procesado
    console.log('Insertando flejes de inventario con secuencia de apilamiento calculada...');
    const { error: eInventario } = await supabase.from('inventario').insert(finalInventario);
    if (eInventario) throw eInventario;
    console.log('¡Flejes de inventario importados correctamente!');

    console.log('==================================================');
    console.log('¡IMPORTACIÓN COMPLETADA CON ÉXITO EN EL SANDBOX!');
    console.log('Las columnas "orden" y "secuencia" han sido calculadas e inyectadas.');
    console.log('==================================================');

  } catch (error) {
    console.error('Error durante la importación de datos:', error);
  }
}

importData();
