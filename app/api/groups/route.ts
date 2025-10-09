import { NextResponse } from 'next/server';
import { getSupabaseRouteHandlerClient } from '@/lib/supabaseServerClient';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import type { CreateGroupPayload, GroupRecord } from '@/types/groups';
import { mapGroupRecord } from '@/lib/groups/mapGroupRecord';
import { GROUP_WITH_MEMBERS_SELECT } from '@/lib/groups/select';

export async function GET() {
  const supabase = await getSupabaseRouteHandlerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const supabaseAdmin = await getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from('group_members')
    .select(
      `
      group_id,
      group:groups (${GROUP_WITH_MEMBERS_SELECT})
    `
    )
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to fetch groups', error);
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }

  const groupsById = new Map<string, GroupRecord>();

  const memberships = Array.isArray(data) ? data : [];

  memberships.forEach((membership) => {
    const candidate = (membership as { group?: unknown })?.group;
    if (candidate) {
      const mapped = mapGroupRecord(candidate);
      groupsById.set(mapped.id, mapped);
    }
  });

  return NextResponse.json({ groups: Array.from(groupsById.values()) });
}

export async function POST(request: Request) {
  const supabase = await getSupabaseRouteHandlerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as Partial<CreateGroupPayload>;
  const name = body.name?.trim();
  const preset = body.preset?.trim() ?? 'custom';
  const icon = body.icon?.trim();
  const memberIds = Array.isArray(body.memberIds)
    ? body.memberIds.filter((value): value is string => typeof value === 'string' && value !== session.user.id)
    : [];

  if (!name || !icon) {
    return NextResponse.json({ error: 'Group name and icon are required.' }, { status: 400 });
  }

  const supabaseAdmin = await getSupabaseAdmin();

  const { data: groupData, error: groupError } = await supabaseAdmin
    .from('groups')
    .insert({
      name,
      icon,
      preset,
      owner_id: session.user.id,
    })
    .select(GROUP_WITH_MEMBERS_SELECT)
    .single();

  if (groupError || !groupData) {
    console.error('Failed to create group', groupError);
    return NextResponse.json({ error: 'Failed to create group.' }, { status: 500 });
  }

  const memberRows = [
    {
      group_id: groupData.id,
      user_id: session.user.id,
      role: 'owner',
      invited_by: session.user.id,
    },
    ...memberIds.map((userId) => ({
      group_id: groupData.id,
      user_id: userId,
      role: 'member',
      invited_by: session.user.id,
    })),
  ];

  const { error: membersError } = await supabaseAdmin.from('group_members').upsert(memberRows, {
    onConflict: 'group_id,user_id',
  });

  if (membersError) {
    console.error('Failed to add initial members', membersError);
    return NextResponse.json({ error: 'Group created but failed to add members.' }, { status: 500 });
  }

  const { data: fullGroup, error: fetchError } = await supabaseAdmin
    .from('groups')
    .select(GROUP_WITH_MEMBERS_SELECT)
    .eq('id', groupData.id)
    .single();

  if (fetchError || !fullGroup) {
    console.error('Failed to load newly created group', fetchError);
    return NextResponse.json({ error: 'Group created but failed to load metadata.' }, { status: 500 });
  }

  return NextResponse.json({ group: mapGroupRecord(fullGroup) }, { status: 201 });
}
