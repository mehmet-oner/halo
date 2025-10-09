export type GroupMemberRole = 'owner' | 'member';

export type GroupMember = {
  id: string;
  displayName: string;
  email: string | null;
  username: string | null;
  avatarUrl: string | null;
  role: GroupMemberRole;
  invitedBy: string | null;
  joinedAt: string;
};

export type GroupRecord = {
  id: string;
  name: string;
  icon: string;
  preset: string;
  ownerId: string;
  createdAt: string;
  members: GroupMember[];
};

export type CreateGroupPayload = {
  name: string;
  preset: string;
  icon: string;
  memberIds?: string[];
};
