export type GroupPollOptionRecord = {
  id: string;
  pollId: string;
  label: string;
  position: number;
  voters: string[];
  createdAt: string;
};

export type GroupPollRecord = {
  id: string;
  groupId: string;
  question: string;
  createdBy: string;
  createdAt: string;
  options: GroupPollOptionRecord[];
};
