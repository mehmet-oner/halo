import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { GROUP_WITH_MEMBERS_SELECT } from '@/lib/groups/select';
import { mapGroupRecord } from '@/lib/groups/mapGroupRecord';
import { getAuthenticatedUser } from '@/lib/auth/getAuthenticatedUser';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  if (!groupId) {
    return NextResponse.json({ error: 'Group id is required.' }, { status: 400 });
  }

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
  const auth = await getAuthenticatedUser();
  const userId = auth?.user.id ?? null;
  const isMember = userId ? mapped.members.some((member) => member.id === userId) : false;

  return NextResponse.json({
    group: mapped,
    isMember,
  });
}
