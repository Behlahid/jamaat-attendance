import { createServerClient, requireAdmin } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/attendance/export?eventId=xxx — Export attendance as CSV (admin only)
export async function GET(request) {
  const { error } = await requireAdmin(request);
  if (error) {
    return NextResponse.json({ error }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');

  if (!eventId) {
    return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
  }

  try {
    const supabase = createServerClient();

    // Get event details
    const { data: event } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    // Get all members
    const { data: members } = await supabase
      .from('members')
      .select('*')
      .order('name');

    // Get attendance for this event
    const { data: attendance } = await supabase
      .from('attendance')
      .select('*, profiles:scanned_by(display_name)')
      .eq('event_id', eventId);

    // Build attendance lookup
    const attendanceMap = {};
    (attendance || []).forEach((a) => {
      attendanceMap[a.member_id] = a;
    });

    // Build CSV
    const esc = (v) => '"' + String(v || '').replace(/"/g, '""') + '"';
    let csv = 'ITS_ID,Name,HFID,BackBarcode,Status,Time,Method,Scanned_By\r\n';

    (members || []).forEach((m) => {
      const a = attendanceMap[m.id];
      const status = a ? 'Present' : 'Absent';
      const time = a ? new Date(a.marked_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
      const method = a ? a.method : '';
      const scannedBy = a?.profiles?.display_name || '';

      csv += [
        esc(m.its_id),
        esc(m.name),
        esc(m.hfid),
        esc(m.back_barcode),
        esc(status),
        esc(time),
        esc(method),
        esc(scannedBy),
      ].join(',') + '\r\n';
    });

    const filename = `attendance_${event?.name || 'export'}_${event?.event_date || 'unknown'}.csv`
      .replace(/[^a-z0-9_.-]/gi, '_');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
