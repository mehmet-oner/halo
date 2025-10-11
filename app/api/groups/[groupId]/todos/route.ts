import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isMemberOfGroup } from '@/lib/groups/isGroupMember';
import { getAuthenticatedUser } from '@/lib/auth/getAuthenticatedUser';
import { GROUP_TODO_WITH_ITEMS_SELECT } from '@/lib/todos/select';
import { mapGroupTodoRecord } from '@/lib/todos/mapGroupTodoRecord';

type CreateTodoListBody = {
  title?: string;
  items?: string[];
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ groupId: string }> }
) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { groupId } = await context.params;

  const isMember = await isMemberOfGroup(groupId, auth.user.id);
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabaseAdmin = await getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('group_lists')
    .select(GROUP_TODO_WITH_ITEMS_SELECT)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load todo lists', error);
    return NextResponse.json({ error: 'Unable to load group lists.' }, { status: 500 });
  }

  const lists = Array.isArray(data) ? data.map(mapGroupTodoRecord) : [];

  return NextResponse.json({ lists });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ groupId: string }> }
) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { groupId } = await context.params;

  const isMember = await isMemberOfGroup(groupId, auth.user.id);
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as CreateTodoListBody;
  const title = body.title?.trim();
  const items = Array.isArray(body.items)
    ? body.items
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    : [];

  if (!title) {
    return NextResponse.json({ error: 'List title is required.' }, { status: 400 });
  }

  const uniqueItems = Array.from(
    new Map(items.map((label) => [label.toLowerCase(), label])).values()
  );

  const supabaseAdmin = await getSupabaseAdmin();

  const { data: insertRow, error: insertError } = await supabaseAdmin
    .from('group_lists')
    .insert({
      group_id: groupId,
      title,
      created_by: auth.user.id,
    })
    .select('id')
    .single();

  if (insertError || !insertRow) {
    console.error('Failed to create todo list', insertError);
    return NextResponse.json({ error: 'Unable to create list.' }, { status: 500 });
  }

  if (uniqueItems.length > 0) {
    const itemsPayload = uniqueItems.map((label, index) => ({
      list_id: insertRow.id,
      label,
      completed: false,
      position: index,
    }));

    const { error: itemsError } = await supabaseAdmin.from('group_list_items').insert(itemsPayload);

    if (itemsError) {
      console.error('Failed to create todo items', itemsError);
      return NextResponse.json({ error: 'List created but failed to add items.' }, { status: 500 });
    }
  }

  const { data: listRow, error: fetchError } = await supabaseAdmin
    .from('group_lists')
    .select(GROUP_TODO_WITH_ITEMS_SELECT)
    .eq('id', insertRow.id)
    .single();

  if (fetchError || !listRow) {
    console.error('Failed to load created todo list', fetchError);
    return NextResponse.json({ error: 'Unable to load created list.' }, { status: 500 });
  }

  return NextResponse.json({ list: mapGroupTodoRecord(listRow) }, { status: 201 });
}
