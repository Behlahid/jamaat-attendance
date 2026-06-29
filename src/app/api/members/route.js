import { createServerClient, requireAuth, requireAdmin } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/members — List members (paginated, searchable)
export async function GET(request) {
  const { error } = await requireAuth(request);
  if (error) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const search = searchParams.get('search') || '';
  const offset = (page - 1) * limit;

  try {
    const supabase = createServerClient();
    let query = supabase.from('members').select('*', { count: 'exact' });

    if (search.trim()) {
      // Search by name, its_id, hfid, or barcode
      query = query.or(
        `name.ilike.%${search}%,its_id.ilike.%${search}%,hfid.ilike.%${search}%,back_barcode.ilike.%${search}%`
      );
    }

    const { data, error: fetchError, count } = await query
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({
      members: data,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/members — Import members from CSV (admin only)
export async function POST(request) {
  const { error } = await requireAdmin(request);
  if (error) {
    return NextResponse.json({ error }, { status: 403 });
  }

  const body = await request.json();
  const { members, mode = 'merge' } = body;

  if (!members || !Array.isArray(members) || members.length === 0) {
    return NextResponse.json({ error: 'No members provided' }, { status: 400 });
  }

  try {
    const supabase = createServerClient();

    if (mode === 'replace') {
      // Delete all existing members first
      await supabase.from('members').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }

    // Upsert members (merge by its_id)
    const { data, error: upsertError } = await supabase
      .from('members')
      .upsert(
        members.map((m) => ({
          its_id: String(m.its_id || m.id).trim(),
          name: (m.name || '').trim(),
          hfid: (m.hfid || '').trim(),
          back_barcode: (m.back_barcode || m.barcode || '').trim(),
        })),
        { onConflict: 'its_id' }
      )
      .select();

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    // Get total count
    const { count } = await supabase.from('members').select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      imported: data?.length || 0,
      total: count,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
