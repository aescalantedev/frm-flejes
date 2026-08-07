import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function fetchAll(table) {
  let allData = []
  let from = 0
  const size = 1000

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + size - 1)

    if (error) {
      console.error(`Error fetching ${table}:`, error)
      break
    }

    if (data.length === 0) break
    allData = allData.concat(data)
    from += size
  }
  return allData
}

async function runBackup() {
  console.log('Iniciando backup de la base de datos...')
  const backup = {}
  const tables = ['torres', 'inventario', 'historial', 'catalogo_costos']

  for (const table of tables) {
    console.log(`Descargando ${table}...`)
    backup[table] = await fetchAll(table)
    console.log(`${table}: ${backup[table].length} registros descargados.`)
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `backup_db_${timestamp}.json`
  fs.writeFileSync(filename, JSON.stringify(backup, null, 2))
  console.log(`Backup completado y guardado en ${filename}`)
}

runBackup()
