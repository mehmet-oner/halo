export const GROUP_TODO_WITH_ITEMS_SELECT = `
  id,
  group_id,
  title,
  created_by,
  created_at,
  items:group_list_items(
    id,
    list_id,
    label,
    completed,
    position,
    created_at
  )
`;
