import { createClient } from '@supabase/supabase-js';

// Usamos placeholders válidos sintácticamente si las variables de entorno no están configuradas.
// Esto evita que la compilación estática de Next.js (prerendering) falle en Vercel antes de configurar las variables de entorno.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL || 
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('tu-proyecto')
) {
  // Solo advertir en el navegador para no saturar los logs de compilación
  if (typeof window !== 'undefined') {
    console.warn(
      'Supabase: Las variables de entorno no están configuradas. Por favor, configúralas en tu archivo .env.local o en Vercel Dashboard.'
    );
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
