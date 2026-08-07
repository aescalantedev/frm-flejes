import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) env[key.trim()] = val.join('=').trim();
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const rawData = `8/04/2026;122.2.160.0170;FLE LAC 0.170 X 1.60 MM A-50;1.00 ;2.30 
8/04/2026;122.1.250.0284;FLE LAC 0.284 X 2.50 MM A-36;1.00 ;2.33 
8/04/2026;122.2.200.0030;FLE LAC 0.030 X 2.00 MM A-50;1.00 ;2.37 
8/04/2026;122.2.200.0094;FLE LAC 0.094 X 2.00 MM A-50;1.00 ;2.38 
8/04/2026;122.2.200.0170;FLE LAC 0.170 X 2.00 MM A-50;1.00 ;2.38 
8/04/2026;122.2.160.0250;FLE LAC 0.250 X 1.60 MM A-50;1.00 ;2.40 
8/04/2026;122.2.160.0200;FLE LAC 0.200 X 1.60 MM A-50;1.00 ;2.44 
8/04/2026;122.2.160.0224;FLE LAC 0.224 X 1.60 MM A-50;1.00 ;2.44 
8/04/2026;122.2.200.0054;FLE LAC 0.054 X 2.00 MM A-50;1.00 ;2.44 
8/04/2026;122.2.200.0224;FLE LAC 0.224 X 2.00 MM A-50;1.00 ;2.53 
8/04/2026;122.2.200.0264;FLE LAC 0.264 X 2.00 MM A-50;1.00 ;2.54 
8/04/2026;122.2.200.0200;FLE LAC 0.200 X 2.00 MM A-50;1.00 ;2.59 
8/04/2026;122.2.200.0284;FLE LAC 0.284 X 2.00 MM A-50;1.00 ;2.62 
8/04/2026;122.2.160.0100;FLE LAC 0.100 X 1.60 MM A-50;1.00 ;2.63 
8/04/2026;122.2.200.0034;FLE LAC 0.034 X 2.00 MM A-50;1.00 ;2.71 
10/04/2026;122.2.200.0100;FLE LAC 0.100 X 2.00 MM A-50;1.00 ;2.20 
10/04/2026;122.2.290.0284;FLE LAC 0.284 X 2.90 MM A-50;1.00 ;2.47 
10/04/2026;122.2.200.0304;FLE LAC 0.304 X 2.00 MM A-50;1.00 ;2.64 
10/04/2026;122.2.250.0284;FLE LAC 0.284 X 2.50 MM A-50;1.00 ;2.69 
10/04/2026;122.1.290.0304;FLE LAC 0.304 X 2.90 MM A-36;1.00 ;2.71 
10/04/2026;122.2.250.0170;FLE LAC 0.170 X 2.50 MM A-50;1.00 ;2.76 
10/04/2026;122.1.190.0100;FLE LAC 0.100 X 1.90 MM A-36;1.00 ;2.84 
10/04/2026;122.2.250.0160;FLE LAC 0.160 X 2.50 MM A-50;1.00 ;2.88 
17/04/2026;122.2.200.0040;FLE LAC 0.040 X 2.00 MM A-50;1.00 ;2.80 
17/04/2026;122.2.200.0286;FLE LAC 0.286 X 2.00 MM A-50;1.00 ;2.81 
17/04/2026;122.2.200.0060;FLE LAC 0.060 X 2.00 MM A-50;1.00 ;2.82 
4/05/2026;122.2.160.0030;FLE LAC 0.030 X 1.60 MM A-50;1.00 ;2.24 
4/05/2026;122.2.250.0224;FLE LAC 0.224 X 2.50 MM A-50;1.00 ;2.66 
25/05/2026;122.2.230.0284;FLE LAC 0.284 X 2.30 MM A-50;1.00 ;2.78 
25/05/2026;122.2.230.0304;FLE LAC 0.304 X 2.30 MM A-50;1.00 ;2.98 
3/06/2026;12.12.0100.250;FLE LAC-A50 0.100 X 2.50 MM;1.00 ;3.39 
11/06/2026;122.2.200.0250;FLE LAC 0.250 X 2.00 MM A-50;1.00 ;2.71 
30/06/2026;122.2.290.0264;FLE LAC 0.264 X 2.90 MM A-50;1.00 ;2.69 
8/07/2026;122.1.200.0089;FLE LAC 0.089 X 2.00 MM A-36;1.00 ;1.61 
8/07/2026;122.1.250.0304;FLE LAC 0.304 X 2.50 MM A-36;1.00 ;2.33 
8/07/2026;122.1.240.0304;FLE LAC 0.304 X 2.4 MM A-36;1.00 ;2.38 
8/07/2026;122.1.240.0284;FLE LAC 0.284 X 2.4 MM A-36;1.00 ;2.38 
8/07/2026;122.2.250.064;FLE LAC 0.064 X 2.50 MM A-50;1.00 ;2.63 
8/07/2026;122.1.250.0045;FLE LAC 0.045 X 2.50 MM A-36;1.00 ;2.65 
8/07/2026;122.2.250.0264;FLE LAC 0.264 X 2.50 MM A-50;1.00 ;2.68 
8/07/2026;122.2.250.0060;FLE LAC 0.060 X 2.50 MM A-50;1.00 ;2.68 
8/07/2026;122.2.290.0044;FLE LAC 0.044 X 2.90 MM A-50;1.00 ;2.69 
8/07/2026;122.2.290.0100;FLE LAC 0.100 X 2.90 MM A-50;1.00 ;2.69 
8/07/2026;122.1.200.0304;FLE LAC 0.304 X 2.00 MM A-36;1.00 ;2.69 
8/07/2026;122.1.200.0170;FLE LAC 0.170 X 2.00 MM A-36;1.00 ;2.70 
8/07/2026;122.2.250.0064;FLE LAC 0.064 X 2.50 MM A-50;1.00 ;2.70 
8/07/2026;122.2.250.0250;FLE LAC 0.250 X 2.50 MM A-50;1.00 ;2.71 
8/07/2026;122.2.250.0200;FLE LAC 0.200 X 2.50 MM A-50;1.00 ;2.71 
8/07/2026;122.1.190.0200;FLE LAC 0.200 X 1.90 MM A-36;1.00 ;2.71 
8/07/2026;122.1.250.0250;FLE LAC 0.250 X 2.50 MM A-36;1.00 ;2.71 
8/07/2026;122.2.250.0100;FLE LAC 0.100 X 2.50 MM A-50;1.00 ;2.71 
8/07/2026;122.1.200.0264;FLE LAC 0.264 X 2.00 MM A-36;1.00 ;2.71 
8/07/2026;122.2.240.0304;FLE LAC 0.304 X 2.40 MM A-50;1.00 ;2.72 
8/07/2026;122.2.240.0284;FLE LAC 0.284 X 2.40 MM A-50;1.00 ;2.72 
8/07/2026;122.1.200.0044;FLE LAC 0.044 X 2.00 MM A-36;1.00 ;2.72 
8/07/2026;122.1.190.0044;FLE LAC 0.044 X 1.90 MM A-36;1.00 ;2.72 
8/07/2026;122.1.190.0264;FLE LAC 0.264 X 1.90 MM A-36;1.00 ;2.72 
8/07/2026;122.1.190.0284;FLE LAC 0.284  X 1.90 MM A-36;1.00 ;2.73 
8/07/2026;122.1.200.0360;FLE LAC 0.360 X 2.00 MM A-36;1.00 ;2.75 
8/07/2026;122.1.200.0224;FLE LAC 0.224 X 2.00 MM A-36;1.00 ;2.76 
8/07/2026;122.1.200.0100;FLE LAC 0.100 X 2.00 MM A-36;1.00 ;2.77 
8/07/2026;122.2.230.0064;FLE LAC 0.064 X 2.30 MM A-50;1.00 ;2.78 
8/07/2026;122.1.190.0250;FLE LAC 0.250 X 1.90 MM A-36;1.00 ;2.79 
8/07/2026;122.2.250.0304;FLE LAC 0.304 X 2.50 MM A-50;1.00 ;2.81 
8/07/2026;122.1.150.0100;FLE LAC 0.100 X 1.50 MM A-36;1.00 ;2.82 
8/07/2026;122.1.200.0200;FLE LAC 0.200 X 2.00 MM A-36;1.00 ;2.83 
8/07/2026;122.1.200.0284;FLE LAC 0.284 X 2.00 MM A-36;1.00 ;2.84 
8/07/2026;122.1.150.0170;FLE LAC 0.170 X 1.50 MM A-36;1.00 ;2.85 
8/07/2026;122.1.200.0064;FLE LAC 0.064 X 2.00 MM A-36;1.00 ;2.86 
8/07/2026;122.1.290.0100;FLE LAC 0.100 X 2.90 MM A-36;1.00 ;2.86 
8/07/2026;122.1.290.0264;FLE LAC 0.264 X 2.90 MM A-36;1.00 ;2.91 
8/07/2026;122.1.190.0170;FLE LAC 0.170 X 1.90 MM A-36;1.00 ;2.92 
8/07/2026;122.2.190.0100;FLE LAC 0.100 X 1.90 MM A-50;1.00 ;2.93 
8/07/2026;122.2.190.0170;FLE LAC 0.170 X 1.90 MM A-50;1.00 ;2.93 
8/07/2026;122.2.190.0250;FLE LAC 0.250 X 1.90 MM A-50;1.00 ;2.93 
8/07/2026;122.2.180.0250;FLE LAC 0.250 X 1.80  MM A-50;1.00 ;2.93 
8/07/2026;122.2.180.0200;FLE LAC 0.200 X 1.80 MM A-50;1.00 ;2.93 
8/07/2026;122.2.190.0200;FLE LAC 0.200 X 1.90 MM A-50;1.00 ;2.93 
8/07/2026;122.1.240.0064;FLE LAC 0.064 X 2.4 MM A-36;1.00 ;2.95 
8/07/2026;122.2.180.0170;FLE LAC 0.170 X 1.8  MM A-50;1.00 ;2.95 
8/07/2026;122.1.230.0064;FLE LAC 0.064 X 2.30 MM A-36;1.00 ;2.96 
8/07/2026;122.1.230.0284;FLE LAC 0.284 X 2.30 MM A-36;1.00 ;2.96 
8/07/2026;122.2.160.00445;FLE LAC 0.045 X 1.60 MM A-50;1.00 ;2.96 
8/07/2026;122.2.160.0045;FLE LAC 0.045 X 1.60 MM A-50;1.00 ;2.98 
8/07/2026;122.1.200.0250;FLE LAC 0.250 X 2.00 MM A-36;1.00 ;2.98 
8/07/2026;122.1.230.0100;FLE LAC 0.100 X 2.30 MM A-36;1.00 ;2.99 
8/07/2026;122.1.230.0264;FLE LAC 0.264 X 2.30 MM A-36;1.00 ;2.99 
8/07/2026;122.2.200.0064;FLE LAC 0.064 X 2.00 MM A-50;1.00 ;3.00 
8/07/2026;122.1.290.0044;FLE LAC 0.044 X 2.90 MM A-36;1.00 ;3.01 
8/07/2026;122.2.190.0064;FLE LAC 0.064 X 1.90 MM A-50;1.00 ;3.18 
8/07/2026;122.2.190.0264;FLE LAC 0.264 X 1.9  MM A-50;1.00 ;3.19 
8/07/2026;122.2.190.0060;FLE LAC 0.060 X 1.90 MM A-50;1.00 ;3.19 
8/07/2026;122.2.190.0284;FLE LAC 0.284 X 1.9  MM A-50;1.00 ;3.21 
8/07/2026;122.2.190.0044;FLE LAC 0.044 X 1.90 MM A-50;1.00 ;3.23 
8/07/2026;122.2.190.060;FLE LAC 0.60 X 1.9 MM A-50;1.00 ;3.24 
8/07/2026;122.2.190.0304;FLE LAC 0.304 X 1.90 MM A-50;1.00 ;3.26 
8/07/2026;122.2.290.0304;FLE LAC 0.304 X 2.90 MM A-50;1.00 ;3.98 
15/07/2026;122.2.200.0044;FLE LAC 0.044 X 2.00 MM A-50;1.00 ;3.40`;

function extractMedida(glosa) {
  // Ej: FLE LAC 0.170 X 1.60 MM A-50
  const match = glosa.match(/(\d+\.\d+)\s*[xX]\s*(\d+\.\d+)/);
  if (match) {
    let w = parseFloat(match[1]);
    if (w < 1) w = Math.round(w * 1000); // 0.100 -> 100, 0.045 -> 45
    const h = parseFloat(match[2]); // 1.60 -> 1.6
    return `${w}X${h}`;
  }
  return '';
}

async function run() {
  const lines = rawData.trim().split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split(';');
    if (parts.length < 5) continue;
    
    // 8/04/2026 -> 2026-04-08
    const dateParts = parts[0].trim().split('/');
    const d = new Date(dateParts[2], parseInt(dateParts[1])-1, dateParts[0]);
    const fecha = d.toISOString();
    
    const codigo = parts[1].trim();
    const glosa = parts[2].trim();
    const costo = parseFloat(parts[4].trim());
    const medida_corta = extractMedida(glosa);
    
    // 1. Insert/Update into catalogo_productos
    let { data: prodData, error: prodErr } = await supabase
      .from('catalogo_productos')
      .select('id')
      .eq('codigo', codigo)
      .single();
      
    if (prodErr && prodErr.code === 'PGRST116') {
      // not found
      const { data: newProd, error: insertErr } = await supabase
        .from('catalogo_productos')
        .insert({ codigo, glosa, medida_corta })
        .select('id')
        .single();
      if (insertErr) {
        console.error("Error inserting product:", codigo, insertErr);
        continue;
      }
      prodData = newProd;
    } else if (prodErr) {
      console.error("Error fetching product:", codigo, prodErr);
      continue;
    }

    const producto_id = prodData.id;
    
    // 2. Insert into kardex_costos
    // First check if exact same cost exists
    const { data: kData, error: kErr } = await supabase
      .from('kardex_costos')
      .select('id, costo_kg')
      .eq('producto_id', producto_id)
      .single();
      
    if (kErr && kErr.code === 'PGRST116') {
      // Not found, insert
      const { error: insertErr } = await supabase.from('kardex_costos').insert({
        producto_id,
        costo_kg: costo,
        fecha_vigencia: fecha
      });
      if (insertErr) {
        console.error(`Error inserting cost for ${codigo}:`, insertErr);
      } else {
        console.log(`Inserted new cost for ${codigo} -> ${costo}`);
      }
    } else if (kData) {
      // Exists, update cost just in case it's the latest
      await supabase.from('kardex_costos')
        .update({ costo_kg: costo })
        .eq('id', kData.id);
      console.log(`Updated cost for ${codigo} -> ${costo}`);
    }
  }
  console.log("Done seeding products & costs.");
}

run();
