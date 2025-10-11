export const GROUP_POLL_WITH_RELATIONS_SELECT = `
  id,
  group_id,
  question,
  created_by,
  created_at,
  options:group_poll_options(
    id,
    poll_id,
    label,
    position,
    created_at,
    votes:group_poll_votes(
      user_id
    )
  )
`;
