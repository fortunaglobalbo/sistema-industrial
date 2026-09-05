import { createClient } from '@supabase/supabase-js';

// Credenciales oficiales de Supabase para ENDE ORURO
const DEFAULT_SUPABASE_URL = 'https://csrvhmxmcnxlmvwnrksm.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzcnZobXhtY254bG12d25ya3NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0Njg5MjUsImV4cCI6MjEwMTA0NDkyNX0.LpjYAmdubbLu76mz2kBkxTs3Qx6TF-bIQwxd3ttxCpU';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const cleanUrl = rawUrl?.trim().replace(/^["']|["']$/g, '');
const cleanKey = rawKey?.trim().replace(/^["']|["']$/g, '');

const isUrlValid = Boolean(cleanUrl && cleanUrl.startsWith('https://') && !cleanUrl.includes('placeholder') && !cleanUrl.includes('tu-proyecto'));
const isKeyValid = Boolean(cleanKey && cleanKey.length > 30 && !cleanKey.includes('placeholder') && !cleanKey.includes('tu-anon-key'));

export const supabase = createClient(
  isUrlValid ? cleanUrl! : DEFAULT_SUPABASE_URL,
  isKeyValid ? cleanKey! : DEFAULT_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);
