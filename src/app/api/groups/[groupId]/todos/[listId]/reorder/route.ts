import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isMemberOfGroup } from '@/lib/groups/isGroupMember';
import { getAuthenticatedUser } from '@/lib/auth/getAuthenticatedUser';
import { GROUP_TODO_WITH_ITEMS_SELECT } from '@/lib/todos/select';
import { mapGroupTodoRecord } from '@/lib/todos/mapGroupTodoRecord';

type ReorderBody = {
  itemIds?: string[];
};

export async function PATCH(
  request: NextRequest,
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

  const body = (await request.json()) as ReorderBody;
  const itemIds = Array.isArray(body.itemIds) ? body.itemIds : [];

  if (!itemIds.length) {
    return NextResponse.json({ error: 'Item order is required.' }, { status: 400 });
  }

  const supabaseAdmin = await getSupabaseAdmin();

  const updates = itemIds.map((itemId, index) =>
    supabaseAdmin
      .from('group_list_items')
      .update({ position: index })
      .eq('id', itemId)
      .eq('list_id', listId)
  );

  const updateResults = await Promise.all(updates);
  const failed = updateResults.find(({ error }) => error);

  if (failed?.error) {
    console.error('Failed to reorder todo items', failed.error);
    return NextResponse.json({ error: 'Unable to reorder items.' }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from('group_lists')
    .select(GROUP_TODO_WITH_ITEMS_SELECT)
    .eq('id', listId)
    .eq('group_id', groupId)
    .single();

  if (error || !data) {
    console.error('Failed to load todo list after reorder', error);
    return NextResponse.json({ error: 'Reordered but failed to refresh list.' }, { status: 500 });
  }

  return NextResponse.json({ list: mapGroupTodoRecord(data) });
}
