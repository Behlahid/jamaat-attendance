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

    // Get all members (handle 1000 limit)
    let members = [];
    let mFrom = 0;
    const limit = 1000;
    while (true) {
      const { data: chunk } = await supabase
        .from('members')
        .select('*')
        .order('name')
        .range(mFrom, mFrom + limit - 1);
      if (!chunk || chunk.length === 0) break;
      members = members.concat(chunk);
      if (chunk.length < limit) break;
      mFrom += limit;
    }

    // Get attendance for this event (handle 1000 limit)
    let attendance = [];
    let aFrom = 0;
    while (true) {
      const { data: chunk } = await supabase
        .from('attendance')
        .select('*, profiles:scanned_by(display_name)')
        .eq('event_id', eventId)
        .range(aFrom, aFrom + limit - 1);
      if (!chunk || chunk.length === 0) break;
      attendance = attendance.concat(chunk);
      if (chunk.length < limit) break;
      aFrom += limit;
    }

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
      
      let time = '';
      if (a && a.marked_at) {
        time = new Date(a.marked_at).toLocaleTimeString('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
      }

      const method = a ? a.method : '';
      
      let scannedBy = '';
      if (a?.profiles) {
        if (Array.isArray(a.profiles)) {
          scannedBy = a.profiles[0]?.display_name || '';
        } else {
          scannedBy = a.profiles.display_name || '';
        }
      }

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
