import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isMemberOfGroup } from '@/lib/groups/isGroupMember';
import { GROUP_POLL_WITH_RELATIONS_SELECT } from '@/lib/polls/select';
import { mapPollRecord } from '@/lib/polls/mapPollRecord';
import { getAuthenticatedUser } from '@/lib/auth/getAuthenticatedUser';

const fetchPollById = async (pollId: string) => {
  const supabaseAdmin = await getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('group_polls')
    .select(GROUP_POLL_WITH_RELATIONS_SELECT)
    .eq('id', pollId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapPollRecord(data) : null;
};

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string; pollId: string }> }
) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { groupId, pollId } = await params;

  const isMember = await isMemberOfGroup(groupId, auth.user.id);
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const poll = await fetchPollById(pollId);
    if (!poll || poll.groupId !== groupId) {
      return NextResponse.json({ error: 'Poll not found.' }, { status: 404 });
    }

    if (poll.createdBy !== auth.user.id) {
      return NextResponse.json({ error: 'Only the poll creator can remove it.' }, { status: 403 });
    }

    const supabaseAdmin = await getSupabaseAdmin();

    const { error: deleteError } = await supabaseAdmin.from('group_polls').delete().eq('id', pollId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete poll', error);
    return NextResponse.json({ error: 'Unable to delete poll.' }, { status: 500 });
  }
}
