import { createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// ── Rate limiter (relaxed in local dev to avoid locking out setup) ──
const signupAttempts = new Map();
const IS_DEV = process.env.NODE_ENV !== 'production';
const MAX_SIGNUP = IS_DEV ? 20 : 3;
const SIGNUP_WINDOW_MS = IS_DEV ? 5 * 60 * 1000 : 30 * 60 * 1000;

function checkSignupRateLimit(ip) {
  const now = Date.now();
  const record = signupAttempts.get(ip);
  if (!record || now > record.resetAt) {
    signupAttempts.set(ip, { count: 1, resetAt: now + SIGNUP_WINDOW_MS });
    return true;
  }
  record.count++;
  return record.count <= MAX_SIGNUP;
}

function clearSignupRateLimit(ip) {
  signupAttempts.delete(ip);
}

// POST /api/auth/signup — Create admin account (first-time setup)
export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkSignupRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many signup attempts. Try again later.' },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { email, password, displayName } = body;

  if (!email || !password || !displayName) {
    return NextResponse.json(
      { error: 'Email, password, and display name are required' },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: 'Password must be at least 6 characters' },
      { status: 400 }
    );
  }

  try {
    const supabase = createServerClient();

    // Check if admin already exists
    const { data: existingAdmins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1);

    if (existingAdmins && existingAdmins.length > 0) {
      return NextResponse.json(
        { error: 'Admin account already exists. Please use login instead.' },
        { status: 403 }
      );
    }

    // Create user via admin API (bypasses email confirmation)
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
        role: 'admin',
      },
    });

    if (createError) {
      console.error('[SIGNUP] createUser error:', createError);
      let errMsg = createError.message;
      if (errMsg === '{}' || !errMsg) {
        errMsg = `Error: ${createError.name} - ${createError.status || 500}`;
      }
      return NextResponse.json(
        { error: errMsg, details: createError },
        { status: 400 }
      );
    }

    const userId = createData?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'User created but no ID returned' },
        { status: 500 }
      );
    }

    // Workaround: Manually insert the profile in case the Postgres trigger failed or was deleted.
    // We use UPSERT (on conflict do nothing or update) just in case the trigger actually worked.
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        display_name: displayName,
        role: 'admin'
      }, { onConflict: 'id' });
    
    if (profileError) {
      console.warn('[SIGNUP] Profile creation issue (might be expected if trigger handled it):', profileError);
    }

    // DON'T use signInWithPassword on service-role client.
    // Instead, generate a session via the admin API.
    const { data: sessionData, error: sessionError } =
      await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
      });

    // Even if generateLink fails, the user IS created.
    // Return user ID so the client can call /api/auth/login instead.
    clearSignupRateLimit(ip);
    return NextResponse.json({
      success: true,
      userId,
      email,
      // If we got session properties, pass them along
      access_token: sessionData?.properties?.access_token || null,
      refresh_token: sessionData?.properties?.refresh_token || null,
    });
  } catch (err) {
    console.error('[SIGNUP] Exception:', err?.message || err);
    return NextResponse.json(
      { error: err?.message || 'Server error during signup' },
      { status: 500 }
    );
  }
}
