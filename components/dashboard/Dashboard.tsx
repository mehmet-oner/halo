'use client';

import Image from 'next/image';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import type { LucideIcon } from 'lucide-react';
import {
  Check,
  ChevronDown,
  Home as HomeIcon,
  Loader2,
  MessageCircle,
  Plus,
  Users,
  X,
} from 'lucide-react';
import { useGroups } from '@/components/dashboard/useGroups';
import CreateGroupDialog from '@/components/dashboard/CreateGroupDialog';
import InviteMembersDialog from '@/components/dashboard/InviteMembersDialog';
import {
  DEFAULT_STATUSES,
  ICON_MAP,
  findPreset,
  getDisplayName,
  type QuickStatus,
} from '@/components/dashboard/groupPresets';
import type { GroupMember, GroupRecord } from '@/types/groups';

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
  votes: Record<string, string[]>;
  createdBy: string;
};

const STATUS_TIMEOUTS: Record<string, number> = {
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '8h': 8 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
};

type DashboardProps = {
  userId: string;
  displayName: string;
  email: string | null;
  onSignOut: () => Promise<void> | void;
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

const getStatusKey = (groupId: string, memberId: string) => `${groupId}-${memberId}`;

const renderInitials = (name: string) =>
  name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

const resolveIcon = (iconKey: string): LucideIcon => ICON_MAP[iconKey] ?? Users;

export default function Dashboard({ userId, displayName, email, onSignOut }: DashboardProps) {
  const supabase = useSupabaseClient();
  const { groups, loading, error, addGroup, removeMembership, refresh } = useGroups();
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [inviteGroup, setInviteGroup] = useState<GroupRecord | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewAlt, setPreviewAlt] = useState('');
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const [memberStatuses, setMemberStatuses] = useState<Record<string, MemberStatus>>({});
  const [statusTimeout, setStatusTimeout] = useState<string>('1h');
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showCustomStatus, setShowCustomStatus] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [customImage, setCustomImage] = useState<string | null>(null);

  const [polls, setPolls] = useState<Poll[]>(defaultPolls);
  const [userVotes, setUserVotes] = useState<Record<number, string>>({});
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOptions, setNewPollOptions] = useState<string[]>(['', '']);
  const [leavingGroup, setLeavingGroup] = useState(false);

  const activeGroup = useMemo(() => {
    if (!groups.length) return null;
    const targeted = groups.find((group) => group.id === activeGroupId);
    return targeted ?? groups[0];
  }, [groups, activeGroupId]);

  useEffect(() => {
    if (groups.length && !activeGroupId) {
      setActiveGroupId(groups[0].id);
    }
  }, [groups, activeGroupId]);

  const isOwner = activeGroup?.ownerId === userId;
  const presetConfig = findPreset(activeGroup?.preset ?? undefined);
  const quickStatuses: QuickStatus[] = presetConfig?.statuses ?? DEFAULT_STATUSES;
  const initials = useMemo(() => renderInitials(displayName), [displayName]);
  const IconForActiveGroup = resolveIcon(activeGroup?.icon ?? 'users');

  useEffect(() => {
    if (!showAccountMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setShowAccountMenu(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowAccountMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showAccountMenu]);

  useEffect(() => {
    if (!previewImage) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewImage(null);
        setPreviewAlt('');
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [previewImage]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMemberStatuses((previous) => {
        const now = Date.now();
        let changed = false;
        const next: typeof previous = {};

        Object.entries(previous).forEach(([key, status]) => {
          if (status.expiresAt && now >= status.expiresAt) {
            changed = true;
            return;
          }
          next[key] = status;
        });

        return changed ? next : previous;
      });
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  const profileSyncRef = useRef(false);
  useEffect(() => {
    if (profileSyncRef.current) return;
    profileSyncRef.current = true;

    const syncProfile = async () => {
      try {
        await supabase.from('profiles').upsert(
          {
            id: userId,
            display_name: displayName,
            email,
            username: displayName,
          },
          { onConflict: 'id' }
        );
      } catch (syncError) {
        console.error('Failed to upsert profile', syncError);
      }
    };

    void syncProfile();
  }, [supabase, userId, displayName, email]);

  const handleSignOutClick = useCallback(async () => {
    try {
      setShowAccountMenu(false);
      setSigningOut(true);
      await onSignOut();
    } finally {
      setSigningOut(false);
    }
  }, [onSignOut]);

  const getExpirationTime = (timeoutKey: string) => {
    if (timeoutKey === 'never') return null;
    const duration = STATUS_TIMEOUTS[timeoutKey];
    if (!duration) return null;
    return Date.now() + duration;
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

  const updateStatus = (status: QuickStatus) => {
    if (!activeGroup) return;

    const key = getStatusKey(activeGroup.id, userId);
    const expiresAt = getExpirationTime(statusTimeout);

    setMemberStatuses((previous) => ({
      ...previous,
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

  const saveCustomStatus = () => {
    if (!activeGroup) return;
    if (!customMessage.trim() && !customImage) return;

    const key = getStatusKey(activeGroup.id, userId);
    const expiresAt = getExpirationTime(statusTimeout);

    setMemberStatuses((previous) => ({
      ...previous,
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
    const poll = polls.find((item) => item.id === pollId);
    if (!poll) return;

    const currentVote = userVotes[pollId];

    setPolls((previous) =>
      previous.map((item) => {
        if (item.id !== pollId) return item;

        const updatedVotes: Poll['votes'] = Object.fromEntries(
          Object.entries(item.votes).map(([label, value]) => [label, [...value]])
        );

        if (currentVote) {
          updatedVotes[currentVote] = updatedVotes[currentVote].filter((id) => id !== userId);
        }

        if (currentVote !== option) {
          if (!updatedVotes[option]) {
            updatedVotes[option] = [];
          }
          updatedVotes[option] = [...updatedVotes[option], userId];
        }

        return { ...item, votes: updatedVotes };
      })
    );

    setUserVotes((previous) => {
      if (currentVote === option) {
        const updated = { ...previous };
        delete updated[pollId];
        return updated;
      }
      return { ...previous, [pollId]: option };
    });
  };

  const addPollOption = () => {
    setNewPollOptions((previous) => (previous.length < 6 ? [...previous, ''] : previous));
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

  const createPoll = () => {
    const question = newPollQuestion.trim();
    if (!question) return;
    const validOptions = newPollOptions.map((option) => option.trim()).filter(Boolean);
    if (validOptions.length < 2) return;

    const poll: Poll = {
      id: Date.now(),
      question,
      options: validOptions,
      votes: Object.fromEntries(validOptions.map((option) => [option, []])),
      createdBy: userId,
    };

    setPolls((previous) => [poll, ...previous]);
    setNewPollQuestion('');
    setNewPollOptions(['', '']);
    setShowCreatePoll(false);
  };

  const deletePoll = (pollId: number) => {
    setPolls((previous) => previous.filter((poll) => poll.id !== pollId));
    setUserVotes((previous) => {
      const updated = { ...previous };
      delete updated[pollId];
      return updated;
    });
  };

  const renderStatusExpirySelect = (value: string, onChange: (next: string) => void) => (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-400/60"
    >
      <option value="30m">30 minutes</option>
      <option value="1h">1 hour</option>
      <option value="4h">4 hours</option>
      <option value="8h">8 hours</option>
      <option value="24h">24 hours</option>
      <option value="never">Never expire</option>
    </select>
  );

  const userStatus = useMemo(() => {
    if (!activeGroup) return null;
    return memberStatuses[getStatusKey(activeGroup.id, userId)] ?? null;
  }, [activeGroup, memberStatuses, userId]);

  const openImagePreview = (src: string, alt: string) => {
    setPreviewImage(src);
    setPreviewAlt(alt);
  };

  const handleLeaveGroup = async () => {
    if (!activeGroup) return;
    try {
      setLeavingGroup(true);
      const response = await fetch(`/api/groups/${activeGroup.id}/members/${userId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Unable to leave group.');
      }
      removeMembership(activeGroup.id, userId);
      setActiveGroupId((previous) => {
        if (previous !== activeGroup.id) return previous;
        const next = groups.filter((group) => group.id !== activeGroup.id);
        return next.length ? next[0].id : null;
      });
      void refresh();
    } catch (leaveError) {
      console.error('Failed to leave group', leaveError);
    } finally {
      setLeavingGroup(false);
    }
  };

  const emptyState = !loading && groups.length === 0;

  const renderGroupMember = (member: GroupMember) => {
    const statusKey = activeGroup ? getStatusKey(activeGroup.id, member.id) : '';
    const currentStatus = memberStatuses[statusKey];
    const resolvedName = getDisplayName(member);

    return (
      <div
        key={member.id}
        className="flex items-start justify-between rounded-2xl border border-slate-100 bg-white/60 px-4 py-3 shadow-sm"
      >
        <div className="flex flex-1 items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
            {renderInitials(resolvedName)}
          </div>
          <div className="flex-1">
            <div className="font-medium text-slate-900">{resolvedName}</div>
            {currentStatus ? (
              <div className="mt-1 flex flex-col gap-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  {currentStatus.emoji && <span className="text-base">{currentStatus.emoji}</span>}
                  <span>{currentStatus.status}</span>
                </div>
                {currentStatus.image && (
                  <button
                    type="button"
                    onClick={() => openImagePreview(currentStatus.image!, `${resolvedName} status photo`)}
                    className="mx-auto w-[55%] max-w-xs rounded-xl bg-slate-100/60 p-2 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400/60"
                    aria-label={`View ${resolvedName} status photo`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentStatus.image}
                      alt={`${resolvedName} status photo thumbnail`}
                      className="max-h-48 w-full rounded-lg object-contain"
                    />
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-1 text-sm text-slate-400">No update yet</div>
            )}
          </div>
        </div>
        {currentStatus?.timestamp && (
          <span className="ml-3 text-xs text-slate-400">{currentStatus.timestamp}</span>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-stone-100 font-sans text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/halo-logo.png"
              alt="Halo logo"
              width={40}
              height={40}
              className="h-10 w-10 rounded-full border border-slate-200 object-cover shadow-sm"
              priority
            />
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">Halo</h1>
              <p className="text-sm text-slate-500">Quiet status sharing for close circles</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowCreateGroup(true)}
              className="hidden items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-100/70 sm:flex"
            >
              <Plus size={16} />
              New group
            </button>
            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setShowAccountMenu((previous) => !previous)}
                className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-left text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-white"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold tracking-tight text-white">
                  {initials}
                </div>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition ${showAccountMenu ? 'rotate-180' : ''}`}
                />
              </button>

              {showAccountMenu && (
                <div className="absolute right-0 z-20 mt-2 w-52 rounded-2xl border border-slate-200 bg-white/95 p-3 text-sm text-slate-700 shadow-xl backdrop-blur">
                  <div className="mb-2">
                    <p className="truncate font-semibold text-slate-900">{displayName}</p>
                    {email && <p className="truncate text-xs text-slate-500">{email}</p>}
                  </div>
                  <button
                    onClick={handleSignOutClick}
                    disabled={signingOut}
                    className="flex w-full items-center justify-between rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    <span>Sign out</span>
                    {signingOut && <span className="text-[10px] uppercase tracking-wide">...</span>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <nav className="sticky top-[73px] z-10 border-b border-slate-200/60 bg-white/80 backdrop-blur">
        <div className="mx-auto w-full max-w-5xl px-5">
          <div className="flex items-center gap-2 overflow-x-auto py-3">
            {groups.map((group) => {
              const Icon = resolveIcon(group.icon);
              const isActive = activeGroup?.id === group.id;
              return (
                <button
                  key={group.id}
                  onClick={() => setActiveGroupId(group.id)}
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
            <button
              type="button"
              onClick={() => setShowCreateGroup(true)}
              className="flex items-center gap-2 rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-100/70"
            >
              <Plus size={16} />
              New
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 pb-36 pt-6">
        {loading && (
          <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 text-center text-sm text-slate-500 shadow-sm">
            <Loader2 size={20} className="mx-auto mb-2 animate-spin" />
            Loading your groups...
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-6 text-sm text-rose-600 shadow-sm">
            {error}
          </div>
        )}

        {emptyState && (
          <section className="rounded-3xl border border-slate-200 bg-white/80 p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white">
              <Plus size={20} />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-slate-900">Create your first group</h2>
            <p className="mt-2 text-sm text-slate-500">
              Pick a template, invite the people you trust, and start sharing quick updates.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateGroup(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus size={16} />
              Create a group
            </button>
          </section>
        )}

        {activeGroup && (
          <>
            <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-medium text-slate-900">
                    <IconForActiveGroup size={18} />
                    Quick status
                  </h2>
                  <p className="text-sm text-slate-500">Share where you are or what you are up to</p>
                </div>
                <button
                  onClick={() => setShowStatusPicker((previous) => !previous)}
                  className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-100/70"
                >
                  {userStatus ? 'Update status' : 'Post status'}
                </button>
              </div>

              {userStatus && (
                <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <span className="text-base">{userStatus.emoji}</span>
                      <span>{userStatus.status}</span>
                    </div>
                    <span className="text-xs text-slate-400">{userStatus.timestamp}</span>
                  </div>
                </div>
              )}

              {showStatusPicker && (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-inner">
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-700">Suggested</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {quickStatuses.map((status) => (
                        <button
                          key={status.label}
                          onClick={() => updateStatus(status)}
                          className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm transition hover:border-slate-400 hover:bg-slate-100/70"
                        >
                          <span className="text-lg">{status.emoji}</span>
                          <span className="text-slate-700">{status.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <button
                      onClick={() => setShowCustomStatus((previous) => !previous)}
                      className="flex w-full items-center justify-between rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-100/60"
                    >
                      <span>Create custom status</span>
                      <ChevronDown
                        size={16}
                        className={`text-slate-400 transition ${showCustomStatus ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {showCustomStatus && (
                      <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white/70 p-4">
                        <textarea
                          value={customMessage}
                          onChange={(event) => setCustomMessage(event.target.value)}
                          placeholder="Write a short update..."
                          rows={3}
                          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-400/60"
                        />

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 transition hover:border-slate-400 hover:bg-slate-100/60">
                            <span className="mb-2 text-lg">📷</span>
                            <span>Add photo</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                          </label>
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-slate-500">Status expiry</p>
                            {renderStatusExpirySelect(statusTimeout, setStatusTimeout)}
                          </div>
                        </div>

                        {customImage && (
                          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={customImage}
                              alt="Custom status preview"
                              className="max-h-60 w-full object-contain"
                            />
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={saveCustomStatus}
                            disabled={!customMessage.trim() && !customImage}
                            className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition disabled:bg-slate-200 disabled:text-slate-400"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setShowCustomStatus(false);
                              setCustomMessage('');
                              setCustomImage(null);
                            }}
                            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100/70"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-medium text-slate-900">Circle</h2>
                  <p className="text-sm text-slate-500">Check ins from everyone in {activeGroup.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isOwner ? (
                    <button
                      onClick={() => setInviteGroup(activeGroup)}
                      className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-100/70"
                    >
                      <Users size={16} />
                      Invite
                    </button>
                  ) : (
                    <button
                      onClick={handleLeaveGroup}
                      disabled={leavingGroup}
                      className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-rose-400 hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200"
                    >
                      {leavingGroup && <Loader2 size={16} className="animate-spin" />}
                      Leave group
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {activeGroup.members.map((member) => renderGroupMember(member))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-slate-900">Quick polls</h2>
                  <p className="text-sm text-slate-500">Light decisions without the group chat flood</p>
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
                          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-400/60"
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
                        !newPollQuestion.trim() || newPollOptions.filter((option) => option.trim()).length < 2
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
          </>
        )}
      </main>

      {previewImage && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/85 px-4"
          onClick={() => {
            setPreviewImage(null);
            setPreviewAlt('');
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-h-[90vh] w-full max-w-4xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setPreviewImage(null);
                setPreviewAlt('');
              }}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/80 text-white shadow-lg transition hover:bg-slate-900"
              aria-label="Close full-size photo"
            >
              <X size={18} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImage} alt={previewAlt} className="h-full w-full rounded-3xl object-contain" />
          </div>
        </div>
      )}

      <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-around px-5 py-3 text-xs font-medium text-slate-500">
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

      <CreateGroupDialog
        open={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onCreated={(group) => {
          addGroup(group);
          setActiveGroupId(group.id);
        }}
      />

      {inviteGroup && (
        <InviteMembersDialog
          open
          group={inviteGroup}
          onClose={() => setInviteGroup(null)}
        />
      )}
    </div>
  );
}
