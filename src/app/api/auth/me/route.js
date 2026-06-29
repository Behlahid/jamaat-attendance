import { requireAuth } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/auth/me — Get current user profile
export async function GET(request) {
  const { user, profile, error } = await requireAuth(request);
  if (error) {
    return NextResponse.json({ error }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
    },
    profile,
  });
}
