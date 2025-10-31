import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/auth/getAuthenticatedUser';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string; memberId: string }> }
) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { groupId, memberId } = await params;

  if (!groupId || !memberId) {
    return NextResponse.json({ error: 'Group id and member id are required.' }, { status: 400 });
  }

  if (memberId !== auth.user.id) {
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
