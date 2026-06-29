import { createClient } from '@supabase/supabase-js';
import { validateSupabaseEnv } from '@/lib/supabase-config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

validateSupabaseEnv(supabaseUrl, supabaseAnonKey, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
