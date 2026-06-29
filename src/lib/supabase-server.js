import { createClient } from '@supabase/supabase-js';

// Singleton: reuse across requests to avoid per-request allocation
let _serverClient = null;

/** Service-role client — bypasses RLS. API routes only, never in browser. */
export function createServerClient() {
  if (_serverClient) return _serverClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  _serverClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return _serverClient;
}

const AUTH_RESULT = (user, profile, error) => ({ user, profile, error });

/** Extract Bearer token → verify → return { user, profile, error } */
export async function getAuthUser(request) {
  const header = request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return AUTH_RESULT(null, null, 'No authorization token');
  }

  const supabase = createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser(header.slice(7));

  if (error || !user) return AUTH_RESULT(null, null, 'Invalid token');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, role, created_at')
    .eq('id', user.id)
    .single();

  if (!profile) return AUTH_RESULT(user, null, 'Profile not found');

  return AUTH_RESULT(user, profile, null);
}

/** Guard: require any authenticated user */
export async function requireAuth(request) {
  return getAuthUser(request);
}

/** Guard: require admin role */
export async function requireAdmin(request) {
  const result = await getAuthUser(request);
  if (result.error) return result;
  if (result.profile.role !== 'admin') {
    return AUTH_RESULT(result.user, result.profile, 'Admin access required');
  }
  return result;
}
