import { createServerClient, requireAdmin } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/events/[id]/invites — Get restricted status and count
export async function GET(request, { params }) {
  const { id } = await params;
  const { error } = await requireAdmin(request);
  if (error) return NextResponse.json({ error }, { status: 403 });

  try {
    const supabase = createServerClient();
    
    const { data: event, error: eventErr } = await supabase
      .from('events')
      .select('is_restricted')
      .eq('id', id)
      .single();
    
    if (eventErr) return NextResponse.json({ error: eventErr.message }, { status: 500 });

    const { count, error: countErr } = await supabase
      .from('event_members')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', id);

    return NextResponse.json({ is_restricted: event.is_restricted, count: count || 0 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/events/[id]/invites — Toggle restricted status, or upload ITS IDs
export async function POST(request, { params }) {
  const { id } = await params;
  const { error } = await requireAdmin(request);
  if (error) return NextResponse.json({ error }, { status: 403 });

  try {
    const body = await request.json();
    const { is_restricted, its_ids } = body; 
    
    const supabase = createServerClient();

    if (is_restricted !== undefined) {
      await supabase.from('events').update({ is_restricted }).eq('id', id);
    }

    if (its_ids && Array.isArray(its_ids)) {
      // Find member UUIDs for these ITS IDs
      const { data: members, error: memErr } = await supabase
        .from('members')
        .select('id')
        .in('its_id', its_ids);
      
      if (memErr) return NextResponse.json({ error: memErr.message }, { status: 500 });
      
      // Delete old invites
      await supabase.from('event_members').delete().eq('event_id', id);

      // Insert new invites
      if (members.length > 0) {
        const inserts = members.map(m => ({ event_id: id, member_id: m.id }));
        // Batch insert in chunks of 1000
        for (let i = 0; i < inserts.length; i += 1000) {
          const chunk = inserts.slice(i, i + 1000);
          await supabase.from('event_members').insert(chunk);
        }
      }
      return NextResponse.json({ success: true, matched: members.length });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
