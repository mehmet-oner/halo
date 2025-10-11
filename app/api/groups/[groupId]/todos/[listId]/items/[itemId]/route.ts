import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isMemberOfGroup } from '@/lib/groups/isGroupMember';
import { getAuthenticatedUser } from '@/lib/auth/getAuthenticatedUser';
import { GROUP_TODO_WITH_ITEMS_SELECT } from '@/lib/todos/select';
import { mapGroupTodoRecord } from '@/lib/todos/mapGroupTodoRecord';

type UpdateItemBody = {
  completed?: boolean;
  label?: string;
};

const loadList = async (groupId: string, listId: string) => {
  const supabaseAdmin = await getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from('group_lists')
    .select(GROUP_TODO_WITH_ITEMS_SELECT)
    .eq('id', listId)
    .eq('group_id', groupId)
    .single();

  if (error || !data) {
    throw error ?? new Error('List not found');
  }

  return mapGroupTodoRecord(data);
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ groupId: string; listId: string; itemId: string }> }
) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { groupId, listId, itemId } = await context.params;

  const isMember = await isMemberOfGroup(groupId, auth.user.id);
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as UpdateItemBody;
  const updates: Record<string, unknown> = {};

  if (typeof body.completed === 'boolean') {
    updates.completed = body.completed;
  }

  const trimmedLabel = body.label?.trim();
  if (typeof trimmedLabel === 'string' && trimmedLabel.length > 0) {
    updates.label = trimmedLabel;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided.' }, { status: 400 });
  }

  const supabaseAdmin = await getSupabaseAdmin();

  const { error } = await supabaseAdmin
    .from('group_list_items')
    .update(updates)
    .eq('id', itemId)
    .eq('list_id', listId);

  if (error) {
    console.error('Failed to update todo item', error);
    return NextResponse.json({ error: 'Unable to update item.' }, { status: 500 });
  }

  try {
    const list = await loadList(groupId, listId);
    return NextResponse.json({ list });
  } catch (loadError) {
    console.error('Failed to load list after update', loadError);
    return NextResponse.json({ error: 'Item updated but failed to refresh list.' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ groupId: string; listId: string; itemId: string }> }
) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { groupId, listId, itemId } = await context.params;

  const isMember = await isMemberOfGroup(groupId, auth.user.id);
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabaseAdmin = await getSupabaseAdmin();

  const { error } = await supabaseAdmin
    .from('group_list_items')
    .delete()
    .eq('id', itemId)
    .eq('list_id', listId);

  if (error) {
    console.error('Failed to delete todo item', error);
    return NextResponse.json({ error: 'Unable to delete item.' }, { status: 500 });
  }

  try {
    const list = await loadList(groupId, listId);
    return NextResponse.json({ list });
  } catch (loadError) {
    console.error('Failed to load list after deletion', loadError);
    return NextResponse.json({ error: 'Item deleted but failed to refresh list.' }, { status: 500 });
  }
}
