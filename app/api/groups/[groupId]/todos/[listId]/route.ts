import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isMemberOfGroup } from '@/lib/groups/isGroupMember';
import { getAuthenticatedUser } from '@/lib/auth/getAuthenticatedUser';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ groupId: string; listId: string }> }
) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { groupId, listId } = await context.params;

  const isMember = await isMemberOfGroup(groupId, auth.user.id);
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabaseAdmin = await getSupabaseAdmin();

  const { error } = await supabaseAdmin
    .from('group_lists')
    .delete()
    .eq('id', listId)
    .eq('group_id', groupId);

  if (error) {
    console.error('Failed to delete todo list', error);
    return NextResponse.json({ error: 'Unable to delete list.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
