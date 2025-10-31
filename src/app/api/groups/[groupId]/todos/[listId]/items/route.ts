import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isMemberOfGroup } from '@/lib/groups/isGroupMember';
import { getAuthenticatedUser } from '@/lib/auth/getAuthenticatedUser';
import { GROUP_TODO_WITH_ITEMS_SELECT } from '@/lib/todos/select';
import { mapGroupTodoRecord } from '@/lib/todos/mapGroupTodoRecord';

type CreateItemBody = {
  label?: string;
};

export async function POST(
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

  const body = (await request.json()) as CreateItemBody;
  const label = body.label?.trim();

  if (!label) {
    return NextResponse.json({ error: 'Item label is required.' }, { status: 400 });
  }

  const supabaseAdmin = await getSupabaseAdmin();

  const { data: existingItem, error: positionError } = await supabaseAdmin
    .from('group_list_items')
    .select('position')
    .eq('list_id', listId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (positionError) {
    console.error('Failed to determine todo item position', positionError);
    return NextResponse.json({ error: 'Unable to add item.' }, { status: 500 });
  }

  const nextPosition =
    typeof existingItem?.position === 'number' && Number.isFinite(existingItem.position)
      ? existingItem.position + 1
      : 0;

  const { error: insertError } = await supabaseAdmin.from('group_list_items').insert({
    list_id: listId,
    label,
    completed: false,
    position: nextPosition,
  });

  if (insertError) {
    console.error('Failed to insert todo item', insertError);
    return NextResponse.json({ error: 'Unable to add item.' }, { status: 500 });
  }

  const { data: listRow, error: fetchError } = await supabaseAdmin
    .from('group_lists')
    .select(GROUP_TODO_WITH_ITEMS_SELECT)
    .eq('id', listId)
    .eq('group_id', groupId)
    .single();

  if (fetchError || !listRow) {
    console.error('Failed to load todo list after insert', fetchError);
    return NextResponse.json({ error: 'Item added but failed to refresh list.' }, { status: 500 });
  }

  return NextResponse.json({ list: mapGroupTodoRecord(listRow) });
}
