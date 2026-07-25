import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Lee las credenciales del archivo supabase.js para asegurar consistencia
const supabaseFileContent = fs.readFileSync('src/lib/supabase.js', 'utf8');
const urlMatch = supabaseFileContent.match(/const SUPABASE_URL = '([^']+)';/);
const keyMatch = supabaseFileContent.match(/const SUPABASE_KEY = '([^']+)';/);

if (!urlMatch || !keyMatch) {
  console.error('No se pudieron extraer las credenciales de src/lib/supabase.js');
  process.exit(1);
}

const SUPABASE_URL = urlMatch[1];
const SUPABASE_KEY = keyMatch[1];

console.log(`Conectando al nuevo Supabase: ${SUPABASE_URL}`);
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

    // 2. Limpiar tablas existentes para evitar conflictos si se ejecuta de nuevo
    console.log('Limpiando datos existentes en el sandbox...');
    await supabase.from('inventario').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('torres').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 3. Insertar Torres
    console.log('Insertando torres...');
    // Supabase permite inserciones en lote.
    const { error: eTorres } = await supabase.from('torres').insert(torres);
    if (eTorres) throw eTorres;
    console.log('¡Torres importadas correctamente!');

    // 4. Insertar Inventario
    console.log('Insertando flejes de inventario...');
    // Insertamos los flejes. Es recomendable separar en lotes de 100 si son muchos, pero 183 caben en uno solo.
    const { error: eInventario } = await supabase.from('inventario').insert(inventario);
    if (eInventario) throw eInventario;
    console.log('¡Flejes de inventario importados correctamente!');

    console.log('==================================================');
    console.log('¡IMPORTACIÓN COMPLETADA CON ÉXITO EN EL SANDBOX!');
    console.log('El proyecto local ya está listo para ser utilizado.');
    console.log('==================================================');

  } catch (error) {
    console.error('Error durante la importación de datos:', error);
  }
}

importData();
