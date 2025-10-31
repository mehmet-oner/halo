import type { GroupPollRecord } from '@/types/polls';

type RawPollVote = {
  user_id: string;
};

type RawPollOption = {
  id: string;
  poll_id: string;
  label: string;
  position: number | null;
  created_at: string;
  votes: RawPollVote[] | null;
};

type RawPollRow = {
  id: string;
  group_id: string;
  question: string;
  created_by: string;
  created_at: string;
  options: RawPollOption[] | null;
};

export const mapPollRecord = (row: RawPollRow): GroupPollRecord => {
  const options = Array.isArray(row.options)
    ? row.options
        .map((option) => ({
          id: option.id,
          pollId: option.poll_id,
          label: option.label,
          position: typeof option.position === 'number' ? option.position : 0,
          voters: Array.isArray(option.votes) ? option.votes.map((vote) => vote.user_id) : [],
          createdAt: option.created_at,
        }))
        .sort((a, b) => a.position - b.position)
    : [];

  return {
    id: row.id,
    groupId: row.group_id,
    question: row.question,
    createdBy: row.created_by,
    createdAt: row.created_at,
    options,
  };
};
