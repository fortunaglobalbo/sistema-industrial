import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('tu-proyecto')) {
  console.warn(
    'Supabase: Las variables de entorno NEXT_PUBLIC_SUPABASE_URL y/O NEXT_PUBLIC_SUPABASE_ANON_KEY no están configuradas correctamente. Asegúrate de configurar tu archivo .env.local.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
