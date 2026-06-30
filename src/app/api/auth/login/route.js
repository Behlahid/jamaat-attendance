import { createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// ── Rate limiter with automatic eviction ──
const IS_DEV = process.env.NODE_ENV !== 'production';
const RATE = { max: 50, windowMs: 15 * 60 * 1000 };
const attempts = new Map();

function isRateLimited(ip) {
  if (IS_DEV) return false;
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now > entry.reset) {
    attempts.set(ip, { count: 1, reset: now + RATE.windowMs });
    return false;
  }

  // Evict stale entries periodically to prevent memory leak
  if (attempts.size > 10_000) {
    for (const [key, val] of attempts) {
      if (now > val.reset) attempts.delete(key);
    }
  }

  return ++entry.count > RATE.max;
}

const json = (data, status = 200) => NextResponse.json(data, { status });
const fail = (error, status) => json({ error }, status);

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) {
    return fail('Too many login attempts. Try again in 15 minutes.', 429);
  }

  let body;
  try { body = await request.json(); }
  catch { return fail('Invalid JSON body', 400); }

  const { email, password } = body;
  if (!email || !password) return fail('Email and password are required', 400);

  try {
    // Create an ephemeral anon client for login so we don't mutate the singleton service client
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Auth + profile fetch: run sequentially
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return fail(error.message, 401);

    // Now we can use the service_role client to safely bypass RLS if needed, or just use the user's client
    const serverClient = createServerClient();
    const { data: profile, error: profileError } = await serverClient
      .from('profiles')
      .select('id, display_name, role, created_at')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return fail('Login succeeded but profile not found', 500);
    }

    const sessionToken = randomUUID();
    await serverClient
      .from('profiles')
      .update({ current_session_token: sessionToken })
      .eq('id', data.user.id);

    profile.current_session_token = sessionToken;

    return json({ success: true, session: data.session, user: data.user, profile, session_token: sessionToken });
  } catch (err) {
    console.error('Login error:', err);
    return fail(err.message || 'Login failed', 500);
  }
}
