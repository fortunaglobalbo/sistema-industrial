import { createClient } from '@supabase/supabase-js';

// Credenciales oficiales de Supabase para ENDE ORURO
const DEFAULT_SUPABASE_URL = 'https://csrvhmxmcnxlmvwnrksm.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzcnZobXhtY254bG12d25ya3NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0Njg5MjUsImV4cCI6MjEwMTA0NDkyNX0.LpjYAmdubbLu76mz2kBkxTs3Qx6TF-bIQwxd3ttxCpU';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Si en Vercel no se configuró o quedó con placeholder, usar la URL y Clave reales del proyecto
const supabaseUrl = (rawUrl && !rawUrl.includes('placeholder') && !rawUrl.includes('tu-proyecto'))
  ? rawUrl
  : DEFAULT_SUPABASE_URL;

const supabaseAnonKey = (rawKey && !rawKey.includes('placeholder') && !rawKey.includes('tu-anon-key'))
  ? rawKey
  : DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
