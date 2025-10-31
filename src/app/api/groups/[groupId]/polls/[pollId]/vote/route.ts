import { NextRequest, NextResponse } from 'next/server';
import { isMemberOfGroup } from '@/lib/groups/isGroupMember';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { GROUP_POLL_WITH_RELATIONS_SELECT } from '@/lib/polls/select';
import { mapPollRecord } from '@/lib/polls/mapPollRecord';
import { getAuthenticatedUser } from '@/lib/auth/getAuthenticatedUser';

type VoteBody = {
  optionId?: string | null;
};

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

export async function POST(
  request: NextRequest,
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

  const supabaseAdmin = await getSupabaseAdmin();
  const poll = await fetchPollById(pollId);

  if (!poll || poll.groupId !== groupId) {
    return NextResponse.json({ error: 'Poll not found.' }, { status: 404 });
  }

  const body = (await request.json()) as VoteBody;
  const optionId = body.optionId ?? null;

  if (optionId && !poll.options.some((option) => option.id === optionId)) {
    return NextResponse.json({ error: 'Option not found for this poll.' }, { status: 404 });
  }

  try {
    const { error: deleteError } = await supabaseAdmin
      .from('group_poll_votes')
      .delete()
      .eq('poll_id', pollId)
      .eq('user_id', auth.user.id);

    if (deleteError) {
      throw deleteError;
    }

    if (optionId) {
      const { error: insertError } = await supabaseAdmin.from('group_poll_votes').insert({
        poll_id: pollId,
        option_id: optionId,
        user_id: auth.user.id,
      });

      if (insertError) {
        throw insertError;
      }
    }

    const updatedPoll = await fetchPollById(pollId);

    return NextResponse.json({ poll: updatedPoll });
  } catch (error) {
    console.error('Failed to save vote', error);
    return NextResponse.json({ error: 'Unable to save vote.' }, { status: 500 });
  }
}
