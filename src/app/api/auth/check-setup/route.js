import { createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/auth/check-setup — Check if any admin exists
export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1);

    if (error) {
      // Table might not exist yet
      return NextResponse.json({ hasAdmin: false });
    }

    return NextResponse.json({ hasAdmin: data && data.length > 0 });
  } catch {
    return NextResponse.json({ hasAdmin: false });
  }
}
