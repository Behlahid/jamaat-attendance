import { createServerClient, requireAuth, requireAdmin } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// POST /api/attendance — Mark attendance
export async function POST(request) {
  const { profile, error } = await requireAuth(request);
  if (error) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const body = await request.json();
  const { eventId, identifier, method = 'manual' } = body;

  if (!eventId || !identifier) {
    return NextResponse.json(
      { error: 'Event ID and member identifier are required' },
      { status: 400 }
    );
  }

  try {
    const supabase = createServerClient();
    const cleanId = String(identifier).trim().replace(/^['"]+|['"]+$/g, '');

    // Find member by ITS ID, barcode, or HFID
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .or(`its_id.eq.${cleanId},back_barcode.eq.${cleanId},hfid.eq.${cleanId}`)
      .limit(1)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Member not found', identifier: cleanId },
        { status: 404 }
      );
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
      })
      .select()
      .single();

    if (insertError) {
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
