export type GroupTodoItemRecord = {
  id: string;
  listId: string;
  groupId: string;
  label: string;
  completed: boolean;
  position: number;
  createdAt: string;
};

export type GroupTodoListRecord = {
  id: string;
  groupId: string;
  title: string;
  createdBy: string;
  createdAt: string;
  items: GroupTodoItemRecord[];
};
