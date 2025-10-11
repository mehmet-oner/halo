'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Plus } from 'lucide-react';

type Poll = {
  id: number;
  question: string;
  options: string[];
  votes: Record<string, string[]>;
  createdBy: string;
};

type QuickPollsProps = {
  userId: string;
};

const defaultPolls: Poll[] = [
  {
    id: 1,
    question: 'Dinner tonight?',
    options: ['Pizza', 'Chinese', 'Cook at home'],
    votes: { Pizza: [], Chinese: [], 'Cook at home': [] },
    createdBy: '',
  },
  {
    id: 2,
    question: 'Movie this weekend?',
    options: ['Yes', 'Maybe', 'No'],
    votes: { Yes: [], Maybe: [], No: [] },
    createdBy: '',
  },
];

const MAX_OPTIONS = 6;

export default function QuickPolls({ userId }: QuickPollsProps) {
  const [polls, setPolls] = useState<Poll[]>(defaultPolls);
  const [userVotes, setUserVotes] = useState<Record<number, string>>({});
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOptions, setNewPollOptions] = useState<string[]>(['', '']);
  const [pollValidationError, setPollValidationError] = useState<string | null>(null);

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
  const pollCreateDisabled = !trimmedPollQuestion || !pollHasMinimumOptions || pollHasDuplicateOptions;

  useEffect(() => {
    if (!pollValidationError) return;
    if (!pollCreateDisabled) {
      setPollValidationError(null);
    }
  }, [pollCreateDisabled, pollValidationError]);

  const handleVote = (pollId: number, option: string) => {
    setPolls((previous) =>
      previous.map((poll) => {
        if (poll.id !== pollId) return poll;

        const updatedVotes: Poll['votes'] = Object.fromEntries(
          Object.entries(poll.votes).map(([label, value]) => [label, [...value]])
        );

        const currentVote = userVotes[pollId];
        if (currentVote) {
          updatedVotes[currentVote] = updatedVotes[currentVote].filter((id) => id !== userId);
        }

        if (currentVote !== option) {
          if (!updatedVotes[option]) {
            updatedVotes[option] = [];
          }
          updatedVotes[option] = [...updatedVotes[option], userId];
        }

        return { ...poll, votes: updatedVotes };
      })
    );

    setUserVotes((previous) => {
      const currentVote = previous[pollId];
      if (currentVote === option) {
        const updated = { ...previous };
        delete updated[pollId];
        return updated;
      }
      return { ...previous, [pollId]: option };
    });
  };

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

  const resetComposer = () => {
    setNewPollQuestion('');
    setNewPollOptions(['', '']);
    setPollValidationError(null);
  };

  const createPoll = () => {
    if (!trimmedPollQuestion) {
      setPollValidationError('Add a question to get started.');
      return;
    }
    const validOptions = trimmedPollOptions.filter(Boolean);
    if (validOptions.length < 2) {
      setPollValidationError('Add at least two options.');
      return;
    }
    const normalizedOptions = validOptions.map((option) => option.toLowerCase());
    if (new Set(normalizedOptions).size !== normalizedOptions.length) {
      setPollValidationError('Each option must be unique.');
      return;
    }

    const poll: Poll = {
      id: Date.now(),
      question: trimmedPollQuestion,
      options: validOptions,
      votes: Object.fromEntries(validOptions.map((option) => [option, []])),
      createdBy: userId,
    };

    setPolls((previous) => [poll, ...previous]);
    setShowCreatePoll(false);
    resetComposer();
  };

  const deletePoll = (pollId: number) => {
    setPolls((previous) => previous.filter((poll) => poll.id !== pollId));
    setUserVotes((previous) => {
      const updated = { ...previous };
      delete updated[pollId];
      return updated;
    });
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-slate-900">Quick polls</h2>
          <p className="text-sm text-slate-500">Light decisions without the group chat flood</p>
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
              onClick={createPoll}
              disabled={pollCreateDisabled}
              className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition disabled:bg-slate-200 disabled:text-slate-400"
            >
              Create
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

      <div className="space-y-4">
        {polls.map((poll) => {
          const totalVotes = poll.options.reduce(
            (total, option) => total + (poll.votes[option]?.length ?? 0),
            0
          );
          const vote = userVotes[poll.id];

          return (
            <div key={poll.id} className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div className="text-sm font-semibold text-slate-900">{poll.question}</div>
                {poll.createdBy === userId && (
                  <button
                    onClick={() => deletePoll(poll.id)}
                    className="text-sm text-slate-400 transition hover:text-rose-500"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {poll.options.map((option) => {
                  const votes = poll.votes[option]?.length ?? 0;
                  const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                  const isSelected = vote === option;

                  return (
                    <button
                      key={option}
                      onClick={() => handleVote(poll.id, option)}
                      className={`relative w-full overflow-hidden rounded-xl border px-4 py-3 text-left text-sm transition ${
                        isSelected
                          ? 'border-slate-500 bg-slate-100/80'
                          : 'border-slate-200 hover:border-slate-400 hover:bg-slate-100/60'
                      }`}
                    >
                      <div
                        className="absolute inset-y-0 left-0 bg-slate-200 transition"
                        style={{ width: `${percentage}%` }}
                        aria-hidden
                      />
                      <div className="relative flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          {isSelected && <Check size={16} className="text-slate-700" />}
                          <span className="font-medium text-slate-700">{option}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{votes} {votes === 1 ? 'vote' : 'votes'}</span>
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
    </section>
  );
}
