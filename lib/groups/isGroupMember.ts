import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const isMemberOfGroup = async (groupId: string, userId: string) => {
  const supabaseAdmin = await getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('group_members')
    .select('group_id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  return true;
};
