import { createServerClient, requireAdmin } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// PATCH /api/events/[id] — Update event (admin only)
export async function PATCH(request, { params }) {
  const { error } = await requireAdmin(request);
  if (error) {
    return NextResponse.json({ error }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  try {
    const supabase = createServerClient();

    const updates = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.is_active !== undefined) updates.is_active = body.is_active;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.event_date !== undefined) updates.event_date = body.event_date;

    const { data, error: updateError } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, event: data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/events/[id] — Delete event (admin only)
export async function DELETE(request, { params }) {
  const { error } = await requireAdmin(request);
  if (error) {
    return NextResponse.json({ error }, { status: 403 });
  }

  const { id } = await params;

  try {
    const supabase = createServerClient();
    const { error: deleteError } = await supabase
      .from('events')
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
