import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key
// This has FULL access — only use in API routes, never in the browser
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Helper: verify access token and get user + profile
export async function getAuthUser(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, profile: null, error: 'No authorization token' };
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { user: null, profile: null, error: 'Invalid token' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { user, profile: null, error: 'Profile not found' };
  }

  return { user, profile, error: null };
}

// Helper: require admin role
export async function requireAdmin(request) {
  const { user, profile, error } = await getAuthUser(request);
  if (error) {
    return { user: null, profile: null, error };
  }
  if (profile.role !== 'admin') {
    return { user, profile, error: 'Admin access required' };
  }
  return { user, profile, error: null };
}

// Helper: require any authenticated user
export async function requireAuth(request) {
  const { user, profile, error } = await getAuthUser(request);
  if (error) {
    return { user: null, profile: null, error };
  }
  return { user, profile, error: null };
}
