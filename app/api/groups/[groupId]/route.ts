import { NextResponse } from 'next/server';
import { getSupabaseRouteHandlerClient } from '@/lib/supabaseServerClient';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { GROUP_WITH_MEMBERS_SELECT } from '@/lib/groups/select';
import { mapGroupRecord } from '@/lib/groups/mapGroupRecord';

export async function GET(
  _request: Request,
  { params }: { params: { groupId: string } }
) {
  const { groupId } = params;
  if (!groupId) {
    return NextResponse.json({ error: 'Group id is required.' }, { status: 400 });
  }

  const supabase = await getSupabaseRouteHandlerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const supabaseAdmin = await getSupabaseAdmin();

  const { data: groupData, error: groupError } = await supabaseAdmin
    .from('groups')
    .select(GROUP_WITH_MEMBERS_SELECT)
    .eq('id', groupId)
    .maybeSingle();

  if (groupError || !groupData) {
    return NextResponse.json({ error: 'Group not found.' }, { status: 404 });
  }

  const mapped = mapGroupRecord(groupData);
  const userId = session?.user.id ?? null;
  const isMember = userId ? mapped.members.some((member) => member.id === userId) : false;

  return NextResponse.json({
    group: mapped,
    isMember,
  });
}
