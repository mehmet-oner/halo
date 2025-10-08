'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Check,
  Home as HomeIcon,
  MessageCircle,
  Plus,
  Users,
} from 'lucide-react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import AuthPanel from '@/components/auth/AuthPanel';

type Member = {
  id: number;
  name: string;
  status: string | null;
  timestamp: string | null;
  emoji?: string;
  image?: string | null;
};

type QuickStatus = {
  label: string;
  emoji: string;
};

type Group = {
  name: string;
  icon: LucideIcon;
  members: Member[];
  statuses: QuickStatus[];
};

type MemberStatus = {
  status: string;
  emoji: string;
  timestamp: string;
  image: string | null;
  expiresAt: number | null;
};

type Poll = {
  id: number;
  question: string;
  options: string[];
  votes: Record<string, number[]>;
  createdBy: number;
};

const GROUPS: Record<string, Group> = {
  family: {
    name: 'Family',
    icon: HomeIcon,
    members: [
      { id: 1, name: 'You', status: null, timestamp: null },
      { id: 2, name: 'Mom', status: 'At work', timestamp: '2 hours ago', emoji: '💼' },
      { id: 3, name: 'Dad', status: 'Grocery shopping', timestamp: '30 mins ago', emoji: '🛒' },
      { id: 4, name: 'Sister', status: 'At school', timestamp: '1 hour ago', emoji: '📚' },
    ],
    statuses: [
      { label: 'At home', emoji: '🏠' },
      { label: 'At work', emoji: '💼' },
      { label: 'Commuting', emoji: '🚗' },
      { label: 'At school', emoji: '📚' },
      { label: 'Shopping', emoji: '🛒' },
      { label: "I'm safe", emoji: '✅' },
    ],
  },
  friends: {
    name: 'Weekend Squad',
    icon: Users,
    members: [
      { id: 1, name: 'You', status: null, timestamp: null },
      { id: 5, name: 'Alex', status: 'Free tonight', timestamp: '45 mins ago', emoji: '🎉' },
      { id: 6, name: 'Jamie', status: 'At the gym', timestamp: '1 hour ago', emoji: '💪' },
      { id: 7, name: 'Sam', status: 'Down for coffee', timestamp: '20 mins ago', emoji: '☕' },
    ],
    statuses: [
      { label: 'Free tonight', emoji: '🎉' },
      { label: 'Down for coffee', emoji: '☕' },
      { label: 'At the gym', emoji: '💪' },
      { label: 'Busy today', emoji: '🚫' },
      { label: 'At this spot', emoji: '📍' },
      { label: 'Party mode', emoji: '🎊' },
    ],
  },
  roommates: {
    name: 'Apartment 4B',
    icon: HomeIcon,
    members: [
      { id: 1, name: 'You', status: null, timestamp: null },
      { id: 8, name: 'Chris', status: 'Out until late', timestamp: '3 hours ago', emoji: '🌙' },
      { id: 9, name: 'Taylor', status: 'Cleaned kitchen', timestamp: '1 hour ago', emoji: '✨' },
    ],
    statuses: [
      { label: 'At home', emoji: '🏠' },
      { label: 'Out until late', emoji: '🌙' },
      { label: 'Need quiet', emoji: '🤫' },
      { label: 'Having guests', emoji: '👥' },
      { label: 'Cleaned kitchen', emoji: '✨' },
      { label: 'Left house', emoji: '🚪' },
    ],
  },
  study: {
    name: 'Study Group',
    icon: BookOpen,
    members: [
      { id: 1, name: 'You', status: null, timestamp: null },
      { id: 10, name: 'Emma', status: 'At library', timestamp: '2 hours ago', emoji: '📖' },
      { id: 11, name: 'Noah', status: 'Need help', timestamp: '15 mins ago', emoji: '🆘' },
      { id: 12, name: 'Olivia', status: 'Deep work mode', timestamp: '45 mins ago', emoji: '🎯' },
    ],
    statuses: [
      { label: 'At library', emoji: '📖' },
      { label: 'Available to help', emoji: '🙋' },
      { label: 'Need help', emoji: '🆘' },
      { label: 'Deep work mode', emoji: '🎯' },
      { label: 'Study break', emoji: '☕' },
      { label: 'Done for today', emoji: '✅' },
    ],
  },
};

const STATUS_TIMEOUTS: Record<string, number> = {
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '8h': 8 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
};

const CURRENT_USER_ID = 1;

type DashboardProps = {
  displayName: string;
  email: string | null;
  onSignOut: () => Promise<void> | void;
};

function Dashboard({ displayName, email, onSignOut }: DashboardProps) {
  const [signingOut, setSigningOut] = useState(false);
  const [activeGroup, setActiveGroup] = useState<keyof typeof GROUPS>('family');
  const [memberStatuses, setMemberStatuses] = useState<Record<string, MemberStatus>>({});
  const [statusTimeout, setStatusTimeout] = useState<string>('1h');
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showCustomStatus, setShowCustomStatus] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [polls, setPolls] = useState<Poll[]>([
    {
      id: 1,
      question: 'Dinner tonight?',
      options: ['Pizza', 'Chinese', 'Cook at home'],
      votes: { Pizza: [2], Chinese: [3], 'Cook at home': [4] },
      createdBy: 2,
    },
    {
      id: 2,
      question: 'Movie this weekend?',
      options: ['Yes', 'Maybe', 'No'],
      votes: { Yes: [2, 3, 4], Maybe: [1], No: [] },
      createdBy: 3,
    },
  ]);
  const [userVotes, setUserVotes] = useState<Record<number, string>>({});
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOptions, setNewPollOptions] = useState<string[]>(['', '']);

  const currentGroup = useMemo(() => GROUPS[activeGroup], [activeGroup]);
  const initials = useMemo(() => displayName.slice(0, 2).toUpperCase(), [displayName]);

  const handleSignOutClick = useCallback(async () => {
    try {
      setSigningOut(true);
      await onSignOut();
    } finally {
      setSigningOut(false);
    }
  }, [onSignOut]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMemberStatuses((prev) => {
        const now = Date.now();
        let changed = false;
        const next: typeof prev = {};

        Object.entries(prev).forEach(([key, status]) => {
          if (status.expiresAt && now >= status.expiresAt) {
            changed = true;
            return;
          }
          next[key] = status;
        });

        return changed ? next : prev;
      });
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  const getStatusKey = (groupKey: keyof typeof GROUPS, memberId: number) =>
    `${groupKey}-${memberId}`;

  const getExpirationTime = (timeoutKey: string) => {
    if (timeoutKey === 'never') {
      return null;
    }

    const duration = STATUS_TIMEOUTS[timeoutKey];
    if (!duration) {
      return null;
    }

    return Date.now() + duration;
  };

  const getCurrentUserStatus = () => {
    const key = getStatusKey(activeGroup, CURRENT_USER_ID);
    return memberStatuses[key];
  };

  const userStatus = getCurrentUserStatus();

  const updateStatus = (status: QuickStatus) => {
    const key = getStatusKey(activeGroup, CURRENT_USER_ID);
    const expiresAt = getExpirationTime(statusTimeout);

    setMemberStatuses((prev) => ({
      ...prev,
      [key]: {
        status: status.label,
        emoji: status.emoji,
        timestamp: 'Just now',
        image: null,
        expiresAt,
      },
    }));

    setShowStatusPicker(false);
    setShowCustomStatus(false);
    setStatusTimeout('1h');
    setCustomMessage('');
    setCustomImage(null);
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setCustomImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveCustomStatus = () => {
    if (!customMessage.trim() && !customImage) return;

    const key = getStatusKey(activeGroup, CURRENT_USER_ID);
    const expiresAt = getExpirationTime(statusTimeout);

    setMemberStatuses((prev) => ({
      ...prev,
      [key]: {
        status: customMessage.trim() || 'Custom status',
        emoji: '💬',
        timestamp: 'Just now',
        image: customImage,
        expiresAt,
      },
    }));

    setCustomMessage('');
    setCustomImage(null);
    setShowCustomStatus(false);
    setShowStatusPicker(false);
    setStatusTimeout('1h');
  };

  const handleVote = (pollId: number, option: string) => {
    const poll = polls.find((p) => p.id === pollId);
    if (!poll) return;

    const currentVote = userVotes[pollId];

    setPolls((prev) =>
      prev.map((p) => {
        if (p.id !== pollId) return p;

        const updatedVotes: Poll['votes'] = Object.fromEntries(
          Object.entries(p.votes).map(([key, value]) => [key, [...value]])
        );

        if (currentVote) {
          updatedVotes[currentVote] = updatedVotes[currentVote].filter(
            (id) => id !== CURRENT_USER_ID
          );
        }

        if (currentVote !== option) {
          if (!updatedVotes[option]) {
            updatedVotes[option] = [];
          }
          updatedVotes[option] = [...updatedVotes[option], CURRENT_USER_ID];
        }

        return { ...p, votes: updatedVotes };
      })
    );

    setUserVotes((prev) => {
      if (currentVote === option) {
        const updated = { ...prev };
        delete updated[pollId];
        return updated;
      }
      return { ...prev, [pollId]: option };
    });
  };

  const addPollOption = () => {
    setNewPollOptions((prev) =>
      prev.length < 6 ? [...prev, ''] : prev
    );
  };

  const updatePollOption = (index: number, value: string) => {
    setNewPollOptions((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const removePollOption = (index: number) => {
    setNewPollOptions((prev) => {
      if (prev.length <= 2) return prev;
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const createPoll = () => {
    if (!newPollQuestion.trim()) return;

    const validOptions = newPollOptions.map((opt) => opt.trim()).filter(Boolean);
    if (validOptions.length < 2) return;

    const newPoll: Poll = {
      id: Date.now(),
      question: newPollQuestion.trim(),
      options: validOptions,
      votes: Object.fromEntries(validOptions.map((opt) => [opt, []])),
      createdBy: CURRENT_USER_ID,
    };

    setPolls((prev) => [newPoll, ...prev]);
    setNewPollQuestion('');
    setNewPollOptions(['', '']);
    setShowCreatePoll(false);
  };

  const deletePoll = (pollId: number) => {
    setPolls((prev) => prev.filter((poll) => poll.id !== pollId));
    setUserVotes((prev) => {
      const updated = { ...prev };
      delete updated[pollId];
      return updated;
    });
  };

  const renderStatusExpirySelect = (value: string, onChange: (next: string) => void) => (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm transition focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-400/60"
    >
      <option value="30m">30 minutes</option>
      <option value="1h">1 hour</option>
      <option value="4h">4 hours</option>
      <option value="8h">8 hours</option>
      <option value="24h">24 hours</option>
      <option value="never">Never expire</option>
    </select>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-stone-100 font-sans text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-full border border-slate-200 shadow-sm">
              <Image
                src="/halo-logo.png"
                alt="Halo logo"
                fill
                sizes="40px"
                className="object-cover"
                priority
              />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                Halo
              </h1>
              <p className="text-sm text-slate-500">
                Quiet status sharing for close circles
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/80 px-3 py-2 shadow-sm">
              <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold tracking-tight text-white sm:flex">
                {initials}
              </div>
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="text-sm font-semibold text-slate-900">{displayName}</span>
                {email && (
                  <span className="truncate text-xs text-slate-500">{email}</span>
                )}
              </div>
              <button
                onClick={handleSignOutClick}
                disabled={signingOut}
                className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {signingOut ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="sticky top-[73px] z-10 border-b border-slate-200/60 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-xl px-5">
          <div className="-mb-1 flex gap-2 overflow-x-auto py-3">
            {Object.entries(GROUPS).map(([key, group]) => {
              const Icon = group.icon;
              const isActive = key === activeGroup;

              return (
                <button
                  key={key}
                  onClick={() => setActiveGroup(key as keyof typeof GROUPS)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100/70 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Icon size={16} />
                  <span className="whitespace-nowrap font-medium">{group.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-5 pb-36 pt-6">
        <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium text-slate-900">Your status</h2>
            {userStatus && (
              <span className="text-xs text-slate-500">{userStatus.timestamp}</span>
            )}
          </div>

          {userStatus ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{userStatus.emoji}</span>
                <span className="text-base font-medium text-slate-900">
                  {userStatus.status}
                </span>
              </div>
              <button
                onClick={() => setShowStatusPicker(true)}
                className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
              >
                Change
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowStatusPicker(true)}
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium tracking-tight text-white transition hover:bg-slate-800"
            >
              Share what&apos;s happening
            </button>
          )}
        </section>

        {showStatusPicker && !showCustomStatus && (
          <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Quick status</h3>
              <button
                onClick={() => setShowStatusPicker(false)}
                className="text-sm text-slate-400 transition hover:text-slate-600"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {currentGroup.statuses.map((status) => (
                <button
                  key={status.label}
                  onClick={() => updateStatus(status)}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200/80 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100/70"
                >
                  <span className="text-2xl">{status.emoji}</span>
                  {status.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCustomStatus(true)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-500 transition hover:border-slate-400 hover:text-slate-800"
            >
              <Plus size={18} />
              Custom status
            </button>

            <div className="mt-5 border-t border-slate-200 pt-5">
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                Status duration
              </label>
              {renderStatusExpirySelect(statusTimeout, setStatusTimeout)}
            </div>
          </section>
        )}

        {showCustomStatus && (
          <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Custom status</h3>
              <button
                onClick={() => {
                  setShowCustomStatus(false);
                  setCustomMessage('');
                  setCustomImage(null);
                }}
                className="text-sm text-slate-400 transition hover:text-slate-600"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                  Message
                </label>
                <textarea
                  value={customMessage}
                  onChange={(event) => setCustomMessage(event.target.value)}
                  rows={3}
                  placeholder="Where are you? How are you feeling?"
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-inner transition focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-400/60"
                />
              </div>

              {customImage && (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={customImage}
                    alt="Status attachment"
                    className="h-48 w-full rounded-2xl object-cover shadow-sm"
                  />
                  <button
                    onClick={() => setCustomImage(null)}
                    className="absolute right-3 top-3 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 shadow transition hover:bg-white"
                  >
                    Remove
                  </button>
                </div>
              )}

              <div className="flex gap-3">
                <label className="flex-1 cursor-pointer rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-100/70">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  Capture photo
                </label>
                <label className="flex-1 cursor-pointer rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-100/70">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  Upload image
                </label>
              </div>

              <button
                onClick={saveCustomStatus}
                disabled={!customMessage.trim() && !customImage}
                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition disabled:bg-slate-200 disabled:text-slate-400"
              >
                Post status
              </button>

              <div className="border-t border-slate-200 pt-4">
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                  Status duration
                </label>
                {renderStatusExpirySelect(statusTimeout, setStatusTimeout)}
              </div>
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          <h2 className="mb-4 text-lg font-medium text-slate-900">
            Group updates
          </h2>
          <div className="space-y-4">
            {currentGroup.members.map((member) => {
              const statusKey = getStatusKey(activeGroup, member.id);
              const currentStatus =
                member.id === CURRENT_USER_ID
                  ? userStatus
                  : memberStatuses[statusKey] ||
                    (member.status
                      ? {
                          status: member.status,
                          emoji: member.emoji ?? '',
                          timestamp: member.timestamp ?? '',
                          image: member.image ?? null,
                          expiresAt: null,
                        }
                      : null);
              const resolvedName =
                member.id === CURRENT_USER_ID ? displayName : member.name;

              return (
                <div
                  key={member.id}
                  className="flex items-start justify-between rounded-2xl border border-slate-100 bg-white/60 px-4 py-3 shadow-sm"
                >
                  <div className="flex flex-1 items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                      {resolvedName.slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">
                        {resolvedName}
                      </div>
                      {currentStatus ? (
                        <div className="mt-1 flex flex-col gap-2 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            {currentStatus.emoji && (
                              <span className="text-base">{currentStatus.emoji}</span>
                            )}
                            <span>{currentStatus.status}</span>
                          </div>
                          {currentStatus.image && (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={currentStatus.image}
                                alt={`${resolvedName} status`}
                                className="h-28 w-full rounded-xl object-cover"
                              />
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="mt-1 text-sm text-slate-400">No update yet</div>
                      )}
                    </div>
                  </div>
                  {currentStatus?.timestamp && (
                    <span className="ml-3 text-xs text-slate-400">
                      {currentStatus.timestamp}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-slate-900">Quick polls</h2>
              <p className="text-sm text-slate-500">
                Light decisions without the group chat flood
              </p>
            </div>
            <button
              onClick={() => setShowCreatePoll(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-slate-400 hover:bg-slate-100/80"
              aria-label="Create poll"
            >
              <Plus size={18} />
            </button>
          </div>

          {showCreatePoll && (
            <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 shadow-inner">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">
                New poll
              </h3>
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
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-400/60"
                    />
                    {newPollOptions.length > 2 && (
                      <button
                        onClick={() => removePollOption(index)}
                        className="rounded-xl px-3 py-2 text-sm text-red-500 transition hover:bg-red-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                {newPollOptions.length < 6 && (
                  <button
                    onClick={addPollOption}
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-100/70"
                  >
                    + Add option
                  </button>
                )}
                <button
                  onClick={createPoll}
                  disabled={
                    !newPollQuestion.trim() ||
                    newPollOptions.filter((opt) => opt.trim()).length < 2
                  }
                  className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition disabled:bg-slate-200 disabled:text-slate-400"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowCreatePoll(false);
                    setNewPollQuestion('');
                    setNewPollOptions(['', '']);
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
                <div
                  key={poll.id}
                  className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="text-sm font-semibold text-slate-900">
                      {poll.question}
                    </div>
                    {poll.createdBy === CURRENT_USER_ID && (
                      <button
                        onClick={() => deletePoll(poll.id)}
                        className="text-sm text-slate-400 transition hover:text-red-500"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {poll.options.map((option) => {
                      const votes = poll.votes[option]?.length ?? 0;
                      const percentage =
                        totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
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
                            className={`absolute inset-y-0 left-0 bg-slate-200 transition`}
                            style={{ width: `${percentage}%` }}
                            aria-hidden
                          />
                          <div className="relative flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              {isSelected && <Check size={16} className="text-slate-700" />}
                              <span className="font-medium text-slate-700">{option}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span>{votes} votes</span>
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
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl items-center justify-around px-5 py-3 text-xs font-medium text-slate-500">
          <button className="flex flex-col items-center gap-1 text-slate-900">
            <HomeIcon size={20} />
            <span>Status</span>
          </button>
          <button className="flex flex-col items-center gap-1 transition hover:text-slate-700">
            <Users size={20} />
            <span>Groups</span>
          </button>
          <button className="flex flex-col items-center gap-1 transition hover:text-slate-700">
            <MessageCircle size={20} />
            <span>Polls</span>
          </button>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const router = useRouter();
  const user = session?.user ?? null;

  const displayName = useMemo(() => {
    const rawUsername = user?.user_metadata?.username;
    if (typeof rawUsername === 'string' && rawUsername.trim().length > 0) {
      return rawUsername.trim();
    }
    const email = user?.email;
    if (email) {
      return email.split('@')[0] ?? email;
    }
    return 'Friend';
  }, [user]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace('/?mode=sign-in');
    router.refresh();
  }, [router, supabase]);

  if (!session) {
    return <AuthPanel />;
  }

  return (
    <Dashboard
      displayName={displayName}
      email={user?.email ?? null}
      onSignOut={handleSignOut}
    />
  );
}
