import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase.from('ubicaciones').select('*').limit(1)
  if (error) {
    console.log('Error o tabla no existe:', error.message)
  } else {
    console.log('La tabla ubicaciones existe. Registros:', data)
  }
}
check()
