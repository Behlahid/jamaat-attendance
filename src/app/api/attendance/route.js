import { createServerClient, requireAuth, requireAdmin } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_METHODS = ['manual', 'nfc'];

// POST /api/attendance — Mark attendance
export async function POST(request) {
  const { profile, error } = await requireAuth(request);
  if (error) {
    return NextResponse.json({ error }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { eventId, identifier, method = 'manual', gate = '' } = body;

  if (!eventId || !identifier) {
    return NextResponse.json(
      { error: 'Event ID and member identifier are required' },
      { status: 400 }
    );
  }

  if (!UUID_RE.test(eventId)) {
    return NextResponse.json({ error: 'Invalid event ID format' }, { status: 400 });
  }

  if (!VALID_METHODS.includes(method)) {
    return NextResponse.json({ error: 'Invalid method. Must be manual or nfc.' }, { status: 400 });
  }

  try {
    const supabase = createServerClient();
    const cleanId = String(identifier).trim().replace(/[,()."'\\%]/g, '');

    if (!cleanId) {
      return NextResponse.json({ error: 'Invalid identifier' }, { status: 400 });
    }

    // Convert raw hex UID to Jamaat HFID format (a-j, r-w)
    const hexMap = {
      '0': 'a', '1': 'b', '2': 'c', '3': 'd', '4': 'e',
      '5': 'f', '6': 'g', '7': 'h', '8': 'i', '9': 'j',
      'A': 'r', 'B': 's', 'C': 't', 'D': 'u', 'E': 'v', 'F': 'w',
      'a': 'r', 'b': 's', 'c': 't', 'd': 'u', 'e': 'v', 'f': 'w'
    };
    const encodedHFID = cleanId.split('').map(c => hexMap[c] || c).join('');

    // Find member by ITS ID, barcode, or HFID
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .or(`its_id.eq.${cleanId},back_barcode.eq.${cleanId},hfid.eq.${cleanId},hfid.eq.${encodedHFID}`)
      .limit(1)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Member not found', identifier: cleanId },
        { status: 404 }
      );
    }

    // Fetch event to check times and restrictions
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('start_time, end_time, late_time, is_restricted')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const now = new Date();
    if (event.start_time && now < new Date(event.start_time)) {
      return NextResponse.json({ error: 'Event has not started yet' }, { status: 403 });
    }
    if (event.end_time && now > new Date(event.end_time)) {
      return NextResponse.json({ error: 'Event has ended' }, { status: 403 });
    }

    const attendanceStatus = (event.late_time && now > new Date(event.late_time)) ? 'late' : 'present';

    // Check restriction
    if (event.is_restricted) {
      const { data: invite } = await supabase
        .from('event_members')
        .select('member_id')
        .eq('event_id', eventId)
        .eq('member_id', member.id)
        .single();
      
      if (!invite) {
        return NextResponse.json({ error: 'Not on the invite list for this event' }, { status: 403 });
      }
    }

    // Check if already marked
    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('event_id', eventId)
      .eq('member_id', member.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Already marked', member: { name: member.name, its_id: member.its_id } },
        { status: 409 }
      );
    }

    // Mark attendance
    const { data: record, error: insertError } = await supabase
      .from('attendance')
      .insert({
        event_id: eventId,
        member_id: member.id,
        its_id: member.its_id,
        member_name: member.name,
        scanned_by: profile.id,
        method,
        status: attendanceStatus,
        gate: String(gate).trim(),
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Already marked', member: { name: member.name, its_id: member.its_id } },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      member: { name: member.name, its_id: member.its_id },
      record,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/attendance?eventId=xxx — Get attendance for an event
export async function GET(request) {
  const { error } = await requireAuth(request);
  if (error) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');

  if (!eventId) {
    return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
  }
  if (!UUID_RE.test(eventId)) {
    return NextResponse.json({ error: 'Invalid event ID format' }, { status: 400 });
  }

  try {
    const supabase = createServerClient();

    const { data, error: fetchError, count } = await supabase
      .from('attendance')
      .select('*, profiles:scanned_by(display_name)', { count: 'exact' })
      .eq('event_id', eventId)
      .order('marked_at', { ascending: false });

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Get total member count
    const { count: totalMembers } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      attendance: data,
      present: count,
      total: totalMembers,
      absent: totalMembers - count,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/attendance — Remove attendance (admin only)
export async function DELETE(request) {
  const { error } = await requireAdmin(request);
  if (error) {
    return NextResponse.json({ error }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Attendance ID required' }, { status: 400 });
  }
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid attendance ID format' }, { status: 400 });
  }

  try {
    const supabase = createServerClient();
    const { error: deleteError } = await supabase
      .from('attendance')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
