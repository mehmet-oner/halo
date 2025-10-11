import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteHandlerClient } from '@/lib/supabaseServerClient';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isMemberOfGroup } from '@/lib/groups/isGroupMember';
import { GROUP_POLL_WITH_RELATIONS_SELECT } from '@/lib/polls/select';
import { mapPollRecord } from '@/lib/polls/mapPollRecord';

type CreatePollBody = {
  question?: string;
  options?: string[];
};

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

const fetchPollsForGroup = async (groupId: string) => {
  const supabaseAdmin = await getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('group_polls')
    .select(GROUP_POLL_WITH_RELATIONS_SELECT)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data.map(mapPollRecord) : [];
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ groupId: string }> }
) {
  const supabase = await getSupabaseRouteHandlerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { groupId } = await context.params;

  const isMember = await isMemberOfGroup(groupId, session.user.id);
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const polls = await fetchPollsForGroup(groupId);
    return NextResponse.json({ polls });
  } catch (error) {
    console.error('Failed to load polls', error);
    return NextResponse.json({ error: 'Unable to load polls.' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ groupId: string }> }
) {
  const supabase = await getSupabaseRouteHandlerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { groupId } = await context.params;

  const isMember = await isMemberOfGroup(groupId, session.user.id);
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabaseAdmin = await getSupabaseAdmin();
  const body = (await request.json()) as CreatePollBody;
  const question = body.question?.trim();
  const optionLabels = Array.isArray(body.options)
    ? body.options.map((option) => option.trim()).filter(Boolean)
    : [];

  if (!question) {
    return NextResponse.json({ error: 'Question is required.' }, { status: 400 });
  }

  if (optionLabels.length < MIN_OPTIONS) {
    return NextResponse.json({ error: 'At least two options are required.' }, { status: 400 });
  }

  if (optionLabels.length > MAX_OPTIONS) {
    return NextResponse.json({ error: 'Too many options provided.' }, { status: 400 });
  }

  const normalizedOptions = optionLabels.map((label) => label.toLowerCase());
  if (new Set(normalizedOptions).size !== normalizedOptions.length) {
    return NextResponse.json({ error: 'Poll options must be unique.' }, { status: 400 });
  }

  try {
    const { data: pollRow, error: pollError } = await supabaseAdmin
      .from('group_polls')
      .insert({
        group_id: groupId,
        question,
        created_by: session.user.id,
      })
      .select(GROUP_POLL_WITH_RELATIONS_SELECT)
      .single();

    if (pollError || !pollRow) {
      throw pollError ?? new Error('Poll insert failed.');
    }

    const { id: pollId } = pollRow;
    const optionsPayload = optionLabels.map((label, index) => ({
      poll_id: pollId,
      label,
      position: index,
    }));

    const { error: optionError } = await supabaseAdmin.from('group_poll_options').insert(optionsPayload);

    if (optionError) {
      await supabaseAdmin.from('group_polls').delete().eq('id', pollId);
      throw optionError;
    }

    const polls = await fetchPollsForGroup(groupId);
    const poll = polls.find((item) => item.id === pollId) ?? null;

    return NextResponse.json({ poll });
  } catch (error) {
    console.error('Failed to create poll', error);
    return NextResponse.json({ error: 'Unable to create poll.' }, { status: 500 });
  }
}
