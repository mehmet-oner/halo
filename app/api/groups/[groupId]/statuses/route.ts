import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteHandlerClient } from '@/lib/supabaseServerClient';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import type { GroupStatusRecord } from '@/types/groups';
import { isMemberOfGroup } from '@/lib/groups/isGroupMember';

const STATUS_SELECT = 'group_id, user_id, status, emoji, image, expires_at, updated_at';

type RawStatusRow = {
  group_id: string;
  user_id: string;
  status: string;
  emoji: string | null;
  image: string | null;
  expires_at: string | null;
  updated_at: string;
};

type SaveStatusBody = {
  status: string;
  emoji?: string | null;
  image?: string | null;
  expiresAt?: number | null;
};

const mapStatusRow = (row: RawStatusRow): GroupStatusRecord => ({
  groupId: row.group_id,
  userId: row.user_id,
  status: row.status,
  emoji: row.emoji,
  image: row.image,
  expiresAt: row.expires_at,
  updatedAt: row.updated_at,
});

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

  const supabaseAdmin = await getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from('group_statuses')
    .select(STATUS_SELECT)
    .eq('group_id', groupId)
    .or('expires_at.is.null,expires_at.gt.now()')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Failed to load statuses', error);
    return NextResponse.json({ error: 'Unable to load statuses.' }, { status: 500 });
  }

  const statuses = Array.isArray(data) ? data.map(mapStatusRow) : [];

  return NextResponse.json({ statuses });
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

  const body = (await request.json()) as SaveStatusBody;
  const statusText = body.status?.trim();
  const emoji = body.emoji?.trim?.() ?? null;
  const image = body.image ?? null;
  const expiresAtIso = body.expiresAt && Number.isFinite(body.expiresAt)
    ? new Date(body.expiresAt).toISOString()
    : null;

  if (!statusText) {
    return NextResponse.json({ error: 'Status text is required.' }, { status: 400 });
  }

  const isMember = await isMemberOfGroup(groupId, session.user.id);

  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabaseAdmin = await getSupabaseAdmin();

  const payload = {
    group_id: groupId,
    user_id: session.user.id,
    status: statusText,
    emoji,
    image,
    expires_at: expiresAtIso,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('group_statuses')
    .upsert(payload, { onConflict: 'group_id,user_id' })
    .select(STATUS_SELECT)
    .single();

  if (error || !data) {
    console.error('Failed to save status', error);
    return NextResponse.json({ error: 'Unable to update status.' }, { status: 500 });
  }

  return NextResponse.json({ status: mapStatusRow(data) });
}
