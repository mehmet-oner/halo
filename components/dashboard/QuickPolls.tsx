'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Loader2, MessageCircle, Plus } from 'lucide-react';
import type { GroupPollRecord } from '@/types/polls';

type QuickPollsProps = {
  userId: string;
  groupId: string;
};

const MAX_OPTIONS = 6;

const createEmptyOptions = () => ['', ''];

export default function QuickPolls({ userId, groupId }: QuickPollsProps) {
  const [polls, setPolls] = useState<GroupPollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOptions, setNewPollOptions] = useState<string[]>(createEmptyOptions);
  const [pollValidationError, setPollValidationError] = useState<string | null>(null);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [pendingVotePollId, setPendingVotePollId] = useState<string | null>(null);
  const [pendingDeletePollId, setPendingDeletePollId] = useState<string | null>(null);

  const trimmedPollQuestion = newPollQuestion.trim();
  const trimmedPollOptions = useMemo(
    () => newPollOptions.map((option) => option.trim()),
    [newPollOptions]
  );

  const duplicatePollOptionIndexes = useMemo(() => {
    const counts = new Map<string, number>();
    trimmedPollOptions.forEach((option) => {
      if (!option) return;
      const normalized = option.toLowerCase();
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    });

    const duplicates = new Set<number>();
    trimmedPollOptions.forEach((option, index) => {
      if (!option) return;
      const normalized = option.toLowerCase();
      if ((counts.get(normalized) ?? 0) > 1) {
        duplicates.add(index);
      }
    });

    return duplicates;
  }, [trimmedPollOptions]);

  const pollHasDuplicateOptions = duplicatePollOptionIndexes.size > 0;
  const pollHasMinimumOptions = trimmedPollOptions.filter(Boolean).length >= 2;
  const pollCreateDisabled =
    !trimmedPollQuestion || !pollHasMinimumOptions || pollHasDuplicateOptions || creatingPoll;

  const resetComposer = () => {
    setNewPollQuestion('');
    setNewPollOptions(createEmptyOptions);
    setPollValidationError(null);
  };

  const fetchPolls = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/groups/${groupId}/polls`, { cache: 'no-store' });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Unable to load polls.');
      }

      const payload = (await response.json()) as { polls: GroupPollRecord[] };
      setPolls(payload.polls ?? []);
    } catch (fetchError) {
      console.error('Failed to fetch polls', fetchError);
      setError('Unable to load polls right now.');
      setPolls([]);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    void fetchPolls();
  }, [fetchPolls]);

  useEffect(() => {
    if (!pollValidationError) return;
    if (!pollCreateDisabled) {
      setPollValidationError(null);
    }
  }, [pollCreateDisabled, pollValidationError]);

  const addPollOption = () => {
    setNewPollOptions((previous) => (previous.length < MAX_OPTIONS ? [...previous, ''] : previous));
  };

  const updatePollOption = (index: number, value: string) => {
    setNewPollOptions((previous) => {
      const next = [...previous];
      next[index] = value;
      return next;
    });
  };

  const removePollOption = (index: number) => {
    setNewPollOptions((previous) => {
      if (previous.length <= 2) return previous;
      return previous.filter((_, idx) => idx !== index);
    });
  };

  const createPoll = async () => {
    if (!trimmedPollQuestion) {
      setPollValidationError('Add a question to get started.');
      return;
    }

    const validOptions = trimmedPollOptions.filter(Boolean);
    if (validOptions.length < 2) {
      setPollValidationError('Add at least two options.');
      return;
    }

    if (new Set(validOptions.map((option) => option.toLowerCase())).size !== validOptions.length) {
      setPollValidationError('Each option must be unique.');
      return;
    }

    setCreatingPoll(true);
    setPollValidationError(null);

    try {
      const response = await fetch(`/api/groups/${groupId}/polls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmedPollQuestion, options: validOptions }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Unable to create poll.');
      }

      const payload = (await response.json()) as { poll: GroupPollRecord | null };
      const poll = payload.poll;
      if (poll) {
        setPolls((previous) => [poll, ...previous.filter((item) => item.id !== poll.id)]);
      } else {
        await fetchPolls();
      }

      setShowCreatePoll(false);
      resetComposer();
    } catch (createError) {
      console.error('Failed to create poll', createError);
      setPollValidationError(createError instanceof Error ? createError.message : 'Unable to create poll.');
    } finally {
      setCreatingPoll(false);
    }
  };

  const handleVote = async (poll: GroupPollRecord, optionId: string, isSelected: boolean) => {
    setPendingVotePollId(poll.id);
    try {
      const response = await fetch(`/api/groups/${groupId}/polls/${poll.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId: isSelected ? null : optionId }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Unable to save vote.');
      }

      const payload = (await response.json()) as { poll: GroupPollRecord | null };
      const updated = payload.poll;
      if (updated) {
        setPolls((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        await fetchPolls();
      }
    } catch (voteError) {
      console.error('Failed to save vote', voteError);
      setError('Unable to save your vote. Please try again.');
    } finally {
      setPendingVotePollId(null);
    }
  };

  const deletePoll = async (pollId: string) => {
    setPendingDeletePollId(pollId);
    try {
      const response = await fetch(`/api/groups/${groupId}/polls/${pollId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Unable to delete poll.');
      }

      setPolls((previous) => previous.filter((poll) => poll.id !== pollId));
    } catch (deleteError) {
      console.error('Failed to delete poll', deleteError);
      setError('Unable to delete poll right now.');
    } finally {
      setPendingDeletePollId(null);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-medium text-slate-900">
            <MessageCircle aria-hidden className="lucide lucide-message-circle h-[18px] w-[18px]" />
            Group polls
          </h2>
        </div>
        <button
          onClick={() => {
            setShowCreatePoll(true);
            setPollValidationError(null);
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-slate-400 hover:bg-slate-100/80"
          aria-label="Create poll"
        >
          <Plus size={18} />
        </button>
      </div>

      {showCreatePoll && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 shadow-inner">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">New poll</h3>
          <input
            type="text"
            value={newPollQuestion}
            onChange={(event) => setNewPollQuestion(event.target.value)}
            placeholder="What do you want to ask?"
            className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-400/60"
          />

          <div className="space-y-2">
            {newPollOptions.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={option}
                  onChange={(event) => updatePollOption(index, event.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className={`flex-1 rounded-xl border bg-white px-4 py-3 text-sm text-slate-700 transition focus:outline-none focus:ring-1 ${
                    duplicatePollOptionIndexes.has(index)
                      ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-200/60'
                      : 'border-slate-200 focus:border-stone-500 focus:ring-stone-400/60'
                  }`}
                />
                {newPollOptions.length > 2 && (
                  <button
                    onClick={() => removePollOption(index)}
                    className="rounded-xl px-3 py-2 text-sm text-rose-500 transition hover:bg-rose-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          {(pollValidationError || pollHasDuplicateOptions) && (
            <p className="mt-3 text-xs text-rose-500">
              {pollValidationError ?? 'Options must be unique.'}
            </p>
          )}

          <div className="mt-4 flex gap-2">
            {newPollOptions.length < MAX_OPTIONS && (
              <button
                onClick={addPollOption}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-100/70"
              >
                + Add option
              </button>
            )}
            <button
              onClick={() => void createPoll()}
              disabled={pollCreateDisabled}
              className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition disabled:bg-slate-200 disabled:text-slate-400"
            >
              {creatingPoll ? 'Saving…' : 'Create'}
            </button>
            <button
              onClick={() => {
                setShowCreatePoll(false);
                resetComposer();
              }}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100/80"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-6 text-center text-sm text-slate-500">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
          Loading polls…
        </div>
      ) : polls.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-4 py-6 text-center text-sm text-slate-500">
          No polls yet.
        </div>
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => {
            const totalVotes = poll.options.reduce((total, option) => total + option.voters.length, 0);

            return (
              <div key={poll.id} className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div className="text-sm font-semibold text-slate-900">{poll.question}</div>
                  {poll.createdBy === userId && (
                    <button
                      onClick={() => void deletePoll(poll.id)}
                      disabled={pendingDeletePollId === poll.id}
                      className="text-sm text-slate-400 transition hover:text-rose-500 disabled:cursor-not-allowed disabled:text-slate-300"
                    >
                      {pendingDeletePollId === poll.id ? 'Removing…' : 'Remove'}
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {poll.options.map((option) => {
                    const votes = option.voters.length;
                    const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                    const isSelected = option.voters.includes(userId);
                    const isBusy = pendingVotePollId === poll.id;

                    return (
                      <button
                        key={option.id}
                        onClick={() => void handleVote(poll, option.id, isSelected)}
                        disabled={isBusy}
                        className={`relative w-full overflow-hidden rounded-xl border px-4 py-3 text-left text-sm transition ${
                          isSelected
                            ? 'border-slate-500 bg-slate-100/80'
                            : 'border-slate-200 hover:border-slate-400 hover:bg-slate-100/60'
                        } disabled:cursor-not-allowed disabled:opacity-75`}
                      >
                        <div
                          className="absolute inset-y-0 left-0 bg-slate-200 transition"
                          style={{ width: `${percentage}%` }}
                          aria-hidden
                        />
                        <div className="relative flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            {isSelected && <Check size={16} className="text-slate-700" />}
                            <span className="font-medium text-slate-700">{option.label}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>
                              {votes} {votes === 1 ? 'vote' : 'votes'}
                            </span>
                            <span>{percentage}%</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2 text-xs text-slate-400">
                  {totalVotes} total {totalVotes === 1 ? 'vote' : 'votes'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <p className="mt-4 text-xs text-rose-500">
          {error}
        </p>
      )}
    </section>
  );
}
