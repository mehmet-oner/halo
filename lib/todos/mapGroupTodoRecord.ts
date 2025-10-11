import type { GroupTodoItemRecord, GroupTodoListRecord } from '@/types/todos';

type RawTodoItem = {
  id: string;
  list_id: string;
  label: string;
  completed: boolean | null;
  position: number | null;
  created_at: string;
};

type RawTodoRow = {
  id: string;
  group_id: string;
  title: string;
  created_by: string;
  created_at: string;
  items: RawTodoItem[] | null;
};

const mapTodoItem = (item: RawTodoItem): GroupTodoItemRecord => ({
  id: item.id,
  listId: item.list_id,
  groupId: '', // will be filled after mapping the parent list
  label: item.label,
  completed: Boolean(item.completed),
  position: typeof item.position === 'number' ? item.position : 0,
  createdAt: item.created_at,
});

export const mapGroupTodoRecord = (row: RawTodoRow): GroupTodoListRecord => {
  const base: GroupTodoListRecord = {
    id: row.id,
    groupId: row.group_id,
    title: row.title,
    createdBy: row.created_by,
    createdAt: row.created_at,
    items: [],
  };

  if (Array.isArray(row.items)) {
    base.items = row.items
      .map((item) => {
        const mapped = mapTodoItem(item);
        return {
          ...mapped,
          groupId: row.group_id,
        };
      })
      .sort((a, b) => a.position - b.position);
  }

  return base;
};
