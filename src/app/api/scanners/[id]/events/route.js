import { createServerClient, requireAdmin } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/scanners/[id]/events — Get assigned events for a scanner
export async function GET(request, { params }) {
  const { id } = await params;
  const { error } = await requireAdmin(request);
  if (error) return NextResponse.json({ error }, { status: 403 });

  try {
    const supabase = createServerClient();
    const { data, error: fetchErr } = await supabase
      .from('event_scanners')
      .select('event_id')
      .eq('scanner_id', id);
    
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    return NextResponse.json({ eventIds: data.map(d => d.event_id) });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/scanners/[id]/events — Update assigned events for a scanner
export async function POST(request, { params }) {
  const { id } = await params;
  const { error } = await requireAdmin(request);
  if (error) return NextResponse.json({ error }, { status: 403 });

  try {
    const body = await request.json();
    const { eventIds } = body; // Array of UUIDs

    const supabase = createServerClient();
    
    // First delete all existing for this scanner
    await supabase.from('event_scanners').delete().eq('scanner_id', id);

    // Then insert new ones
    if (eventIds && eventIds.length > 0) {
      const inserts = eventIds.map(eid => ({ scanner_id: id, event_id: eid }));
      const { error: insertErr } = await supabase.from('event_scanners').insert(inserts);
      if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
