import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://dputuuxqazhdrbxhiuqz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwdXR1dXhxYXpoZHJieGhpdXF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NzA3MjAsImV4cCI6MjEwMDE0NjcyMH0.3D_q24Fvtk6LeZxf8vGCVWNM6WVujgouyE1Lnso7xhM';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function exportData() {
  console.log('Iniciando exportación de datos...');
  
  try {
    // 1. Export torres
    const { data: torres, error: eTorres } = await supabase.from('torres').select('*');
    if (eTorres) throw eTorres;
    console.log(`Torres recuperadas: ${torres.length}`);
    fs.writeFileSync('legacy/torres_backup.json', JSON.stringify(torres, null, 2));

    // 2. Export inventario
    const { data: inventario, error: eInventario } = await supabase.from('inventario').select('*');
    if (eInventario) throw eInventario;
    console.log(`Inventarios recuperados: ${inventario.length}`);
    fs.writeFileSync('legacy/inventario_backup.json', JSON.stringify(inventario, null, 2));

    // 3. Export historial
    const { data: historial, error: eHistorial } = await supabase.from('historial').select('*');
    if (eHistorial) throw eHistorial;
    console.log(`Historial recuperado: ${historial.length}`);
    fs.writeFileSync('legacy/historial_backup.json', JSON.stringify(historial, null, 2));

    console.log('¡Exportación completada con éxito!');
  } catch (error) {
    console.error('Error al exportar los datos:', error);
  }
}

exportData();
