export const GROUP_WITH_MEMBERS_SELECT = `
  id,
  name,
  icon,
  preset,
  owner_id,
  created_at,
  members:group_members (
    user_id,
    role,
    invited_by,
    joined_at,
    profile:profiles (
      display_name,
      email,
      username,
      avatar_url
    )
  )
`;
