import { createServerClient, requireAuth, requireAdmin } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/events — List events
export async function GET(request) {
  const { error } = await requireAuth(request);
  if (error) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active') === 'true';

  try {
    const supabase = createServerClient();
    let query = supabase.from('events').select('*');

    if (activeOnly) {
      query = query.eq('is_active', true);
      // We will do time filtering in JS so we don't break if columns don't exist yet
    }

    const { data, error: fetchError } = await query
      .order('created_at', { ascending: false });

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Get attendance counts for each event
    const eventsWithCounts = await Promise.all(
      data.map(async (event) => {
        const { count } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id);

        return { ...event, attendance_count: count || 0 };
      })
    );

    // Filter out expired events if activeOnly
    let filteredEvents = eventsWithCounts;
    if (activeOnly) {
      const now = new Date();
      filteredEvents = eventsWithCounts.filter(ev => {
        if (!ev.end_time) return true;
        return new Date(ev.end_time) > now;
      });
    }

    return NextResponse.json({ events: filteredEvents });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/events — Create event (admin only)
export async function POST(request) {
  const { profile, error } = await requireAdmin(request);
  if (error) {
    return NextResponse.json({ error }, { status: 403 });
  }

  const body = await request.json();
  const { name, eventDate, notes = '', startTime, lateTime, endTime } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Event name is required' }, { status: 400 });
  }

  try {
    const supabase = createServerClient();

    const { data, error: insertError } = await supabase
      .from('events')
      .insert({
        name: name.trim(),
        event_date: eventDate || new Date().toISOString().split('T')[0],
        start_time: startTime || null,
        late_time: lateTime || null,
        end_time: endTime || null,
        notes: notes.trim(),
        is_active: true,
        created_by: profile.id,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, event: data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
