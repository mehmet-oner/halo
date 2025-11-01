import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isMemberOfGroup } from '@/lib/groups/isGroupMember';
import { getAuthenticatedUser } from '@/lib/auth/getAuthenticatedUser';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ groupId: string; listId: string }> }
) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { groupId, listId } = await params;

  const isMember = await isMemberOfGroup(groupId, auth.user.id);
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabaseAdmin = await getSupabaseAdmin();

  const { data: listRow, error: fetchError } = await supabaseAdmin
    .from('group_lists')
    .select('id, group_id, created_by')
    .eq('id', listId)
    .maybeSingle();

  if (fetchError || !listRow) {
    console.error('Failed to load todo list before delete', fetchError);
    return NextResponse.json({ error: 'List not found.' }, { status: 404 });
  }

  if (listRow.group_id !== groupId) {
    return NextResponse.json({ error: 'List not found.' }, { status: 404 });
  }

  if (listRow.created_by !== auth.user.id) {
    return NextResponse.json({ error: 'Only the list creator can remove it.' }, { status: 403 });
  }

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
