import { createServerClient, requireAdmin } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/events/[id]/scanners — Get assigned scanners
export async function GET(request, { params }) {
  const { error } = await requireAdmin(request);
  if (error) return NextResponse.json({ error }, { status: 403 });

  try {
    const supabase = createServerClient();
    const { data, error: fetchErr } = await supabase
      .from('event_scanners')
      .select('scanner_id')
      .eq('event_id', params.id);
    
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    return NextResponse.json({ scannerIds: data.map(d => d.scanner_id) });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/events/[id]/scanners — Update assigned scanners
export async function POST(request, { params }) {
  const { error } = await requireAdmin(request);
  if (error) return NextResponse.json({ error }, { status: 403 });

  try {
    const body = await request.json();
    const { scannerIds } = body; // Array of UUIDs

    const supabase = createServerClient();
    
    // First delete all existing for this event
    await supabase.from('event_scanners').delete().eq('event_id', params.id);

    // Then insert new ones
    if (scannerIds && scannerIds.length > 0) {
      const inserts = scannerIds.map(id => ({ event_id: params.id, scanner_id: id }));
      const { error: insertErr } = await supabase.from('event_scanners').insert(inserts);
      if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
