import { createServerClient, requireAdmin } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// POST /api/auth/register-scanner — Admin creates a scanner account
export async function POST(request) {
  const { user, profile, error } = await requireAdmin(request);
  if (error) {
    return NextResponse.json({ error }, { status: 403 });
  }

  const body = await request.json();
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

    // Create user with service role (bypasses email confirmation)
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm email
      user_metadata: {
        display_name: displayName,
        role: 'scanner',
      },
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      scanner: {
        id: newUser.user.id,
        email,
        displayName,
        role: 'scanner',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/auth/register-scanner — List all scanners (admin only)
export async function GET(request) {
  const { user, profile, error } = await requireAdmin(request);
  if (error) {
    return NextResponse.json({ error }, { status: 403 });
  }

  try {
    const supabase = createServerClient();
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'scanner')
      .order('created_at', { ascending: false });

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({ scanners: data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/auth/register-scanner — Delete a scanner account
export async function DELETE(request) {
  const { user, profile, error } = await requireAdmin(request);
  if (error) {
    return NextResponse.json({ error }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const scannerId = searchParams.get('id');

  if (!scannerId) {
    return NextResponse.json({ error: 'Scanner ID required' }, { status: 400 });
  }

  try {
    const supabase = createServerClient();

    // Delete from auth (cascade deletes profile)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(scannerId);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
