import { NextResponse } from 'next/server';
import { getSupabaseRouteHandlerClient } from '@/lib/supabaseServerClient';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function DELETE(
  _request: Request,
  { params }: { params: { groupId: string; memberId: string } }
) {
  const supabase = await getSupabaseRouteHandlerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { groupId, memberId } = params;

  if (!groupId || !memberId) {
    return NextResponse.json({ error: 'Group id and member id are required.' }, { status: 400 });
  }

  if (memberId !== session.user.id) {
    return NextResponse.json({ error: 'You can only remove yourself from a group.' }, { status: 403 });
  }

  const supabaseAdmin = await getSupabaseAdmin();

  const { error } = await supabaseAdmin
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', memberId);

  if (error) {
    console.error('Failed to leave group', error);
    return NextResponse.json({ error: 'Failed to leave the group.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
