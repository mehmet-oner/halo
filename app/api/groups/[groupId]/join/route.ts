import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteHandlerClient } from '@/lib/supabaseServerClient';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { GROUP_WITH_MEMBERS_SELECT } from '@/lib/groups/select';
import { mapGroupRecord } from '@/lib/groups/mapGroupRecord';

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await context.params;
  if (!groupId) {
    return NextResponse.json({ error: 'Group id is required.' }, { status: 400 });
  }

  const supabase = await getSupabaseRouteHandlerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseAdmin = await getSupabaseAdmin();

  const { data: group, error: groupError } = await supabaseAdmin
    .from('groups')
    .select('id')
    .eq('id', groupId)
    .maybeSingle();

  if (groupError || !group) {
    return NextResponse.json({ error: 'Group not found.' }, { status: 404 });
  }

  const { error: upsertError } = await supabaseAdmin.from('group_members').upsert(
    {
      group_id: groupId,
      user_id: session.user.id,
      role: 'member',
      invited_by: session.user.id,
    },
    { onConflict: 'group_id,user_id' }
  );

  if (upsertError) {
    console.error('Failed to join group', upsertError);
    return NextResponse.json({ error: 'Unable to join the group.' }, { status: 500 });
  }

  const { data: refreshedGroup, error: fetchError } = await supabaseAdmin
    .from('groups')
    .select(GROUP_WITH_MEMBERS_SELECT)
    .eq('id', groupId)
    .maybeSingle();

  if (fetchError || !refreshedGroup) {
    return NextResponse.json({ error: 'Joined but failed to load group.' }, { status: 500 });
  }

  return NextResponse.json({ group: mapGroupRecord(refreshedGroup) });
}
