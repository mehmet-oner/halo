import type { GroupRecord, GroupMember } from '@/types/groups';

type RawProfile = {
  display_name?: string | null;
  email?: string | null;
  username?: string | null;
  avatar_url?: string | null;
};

type RawMember = {
  user_id?: string;
  role?: string;
  invited_by?: string | null;
  joined_at?: string;
  profile?: RawProfile;
};

type RawGroup = {
  id?: string;
  name?: string;
  icon?: string;
  preset?: string;
  owner_id?: string;
  created_at?: string;
  members?: RawMember[];
};

const fallbackMember: GroupMember = {
  id: '',
  role: 'member',
  invitedBy: null,
  joinedAt: new Date(0).toISOString(),
  displayName: 'Friend',
  email: null,
  username: null,
  avatarUrl: null,
};

export const mapGroupRecord = (group: unknown): GroupRecord => {
  const raw = (group ?? {}) as RawGroup;

  const members: GroupMember[] = Array.isArray(raw.members)
    ? raw.members.map((member) => {
        const profile = member?.profile ?? {};
        return {
          id: member?.user_id ?? fallbackMember.id,
          role: (member?.role as GroupMember['role']) ?? fallbackMember.role,
          invitedBy: member?.invited_by ?? fallbackMember.invitedBy,
          joinedAt: member?.joined_at ?? fallbackMember.joinedAt,
          displayName:
            profile.display_name ?? profile.username ?? profile.email ?? fallbackMember.displayName,
          email: profile.email ?? fallbackMember.email,
          username: profile.username ?? fallbackMember.username,
          avatarUrl: profile.avatar_url ?? fallbackMember.avatarUrl,
        };
      })
    : [];

  return {
    id: raw.id ?? '',
    name: raw.name ?? 'Group',
    icon: raw.icon ?? 'users',
    preset: raw.preset ?? 'custom',
    ownerId: raw.owner_id ?? '',
    createdAt: raw.created_at ?? new Date().toISOString(),
    members,
  };
};
