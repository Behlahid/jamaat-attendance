import { createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// ── Rate limiter with automatic eviction ──
const RATE = { max: 5, windowMs: 15 * 60 * 1000 };
const attempts = new Map();

function isRateLimited(ip) {
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
    const supabase = createServerClient();

    // Auth + profile fetch: run sequentially (profile depends on user ID)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return fail(error.message, 401);

    // Fetch only needed columns instead of SELECT *
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name, role, created_at')
      .eq('id', data.user.id)
      .single();

    return json({ success: true, session: data.session, user: data.user, profile });
  } catch (err) {
    console.error('Login error:', err);
    return fail(err.message || 'Login failed', 500);
  }
}
