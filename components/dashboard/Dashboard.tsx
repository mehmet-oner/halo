"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import type { LucideIcon } from "lucide-react";
import {
  Target as TargetIcon,
  ListTodo,
  Loader2,
  MessageCircle,
  Plus,
  Users,
} from "lucide-react";
import { useGroups } from "@/components/dashboard/useGroups";
import CreateGroupDialog from "@/components/dashboard/CreateGroupDialog";
import InviteMembersDialog from "@/components/dashboard/InviteMembersDialog";
import QuickPolls from "@/components/dashboard/QuickPolls";
import GroupTodos from "@/components/dashboard/GroupTodos";
import {
  DEFAULT_STATUSES,
  ICON_MAP,
  findPreset,
  getDisplayName,
  type QuickStatus,
} from "@/components/dashboard/groupPresets";
import type {
  GroupMember,
  GroupRecord,
  GroupStatusRecord,
} from "@/types/groups";
import Header from "./components/Header";
import GroupNav from "./components/GroupNav";
import FooterNav from "./components/FooterNav";
import StatusPanel from "./components/StatusPanel/StatusPanel";
import CirclePanel from "./components/CirclePanel";

type MemberStatus = {
  status: string;
  emoji: string;
  timestamp: string;
  image: string | null;
  expiresAt: number | null;
};

const STATUS_TIMEOUTS: Record<string, number> = {
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "8h": 8 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
};

const STATUS_POLL_INTERVAL_MS = 5_000;

const formatRelativeTimestamp = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) {
    return "Just now";
  }

  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60) {
    return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr${diffHours === 1 ? "" : "s"} ago`;
  }

  return date.toLocaleDateString();
};

export type DashboardView = "home" | "polls" | "lists";

type DashboardProps = {
  userId: string;
  displayName: string;
  email: string | null;
  onSignOut: () => Promise<void> | void;
  view?: DashboardView;
};

const getStatusKey = (groupId: string, memberId: string) =>
  `${groupId}-${memberId}`;

const renderInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

const resolveIcon = (iconKey: string): LucideIcon => ICON_MAP[iconKey] ?? Users;

export default function Dashboard({
  userId,
  displayName,
  email,
  onSignOut,
  view = "home",
}: DashboardProps) {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const { groups, loading, error, addGroup, removeMembership, refresh } =
    useGroups();
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const hasAppliedStoredGroup = useRef(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [inviteGroup, setInviteGroup] = useState<GroupRecord | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewAlt, setPreviewAlt] = useState("");
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const imageReaderRef = useRef<FileReader | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const [memberStatuses, setMemberStatuses] = useState<
    Record<string, MemberStatus>
  >({});
  const [statusTimeout, setStatusTimeout] = useState<string>("4h");
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showCustomStatus, setShowCustomStatus] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [statusImage, setStatusImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const resetCustomStatusForm = () => {
    setCustomMessage("");
    setStatusImage(null);
    setIsUploadingImage(false);
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
      photoInputRef.current.removeAttribute("capture");
    }
    if (imageReaderRef.current) {
      imageReaderRef.current.abort();
      imageReaderRef.current = null;
    }
  };

  const [leavingGroup, setLeavingGroup] = useState(false);
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
  const [pendingLeaveGroup, setPendingLeaveGroup] =
    useState<GroupRecord | null>(null);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const activeView = view;
  const navItems: Array<{
    key: DashboardView;
    label: string;
    icon?: LucideIcon;
    imageSrc?: string;
    imageAlt?: string;
    href?: string;
    onClick?: () => void;
  }> = [
    {
      key: "home",
      label: "Halo",
      imageSrc: "/halo-logo.png",
      imageAlt: "Halo home",
      href: "/",
    },
    { key: "polls", label: "Polls", icon: MessageCircle, href: "/polls" },
    { key: "lists", label: "Lists", icon: ListTodo, href: "/lists" },
  ];

  const activeGroup = useMemo(() => {
    if (!groups.length) return null;
    const targeted = groups.find((group) => group.id === activeGroupId);
    return targeted ?? groups[0];
  }, [groups, activeGroupId]);

  useEffect(() => {
    if (!groups.length) {
      return;
    }

    if (!hasAppliedStoredGroup.current) {
      hasAppliedStoredGroup.current = true;
      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem("halo:last-group-id");
        const match =
          stored && groups.some((group) => group.id === stored) ? stored : null;
        setActiveGroupId(match ?? groups[0].id);
        return;
      }
    }

    if (!activeGroupId) {
      setActiveGroupId(groups[0].id);
    }
  }, [groups, activeGroupId]);

  useEffect(() => {
    if (typeof window === "undefined" || !activeGroupId) {
      return;
    }
    window.localStorage.setItem("halo:last-group-id", activeGroupId);
  }, [activeGroupId]);

  const isOwner = activeGroup?.ownerId === userId;
  const presetConfig = findPreset(activeGroup?.preset ?? undefined);
  const quickStatuses: QuickStatus[] =
    presetConfig?.statuses ?? DEFAULT_STATUSES;
  const initials = useMemo(() => renderInitials(displayName), [displayName]);
  const IconForActiveGroup = resolveIcon(activeGroup?.icon ?? "users");

  const syncGroupStatuses = useCallback(
    (groupId: string, records: GroupStatusRecord[], replace: boolean) => {
      setMemberStatuses((prev) => {
        const next = { ...prev };

        if (replace) {
          Object.keys(next).forEach((key) => {
            if (key.startsWith(`${groupId}-`)) {
              delete next[key];
            }
          });
        }

        records.forEach((record) => {
          next[getStatusKey(groupId, record.userId)] = {
            status: record.status,
            emoji: record.emoji ?? "",
            timestamp: formatRelativeTimestamp(record.updatedAt),
            image: record.image,
            expiresAt: record.expiresAt
              ? new Date(record.expiresAt).getTime()
              : null,
          };
        });

        return next;
      });
    },
    []
  );

  const fetchGroupStatuses = useCallback(
    async (groupId: string) => {
      try {
        const response = await fetch(`/api/groups/${groupId}/statuses`, {
          cache: "no-store",
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error ?? "Unable to load statuses.");
        }
        const payload = (await response.json()) as {
          statuses: GroupStatusRecord[];
        };
        syncGroupStatuses(groupId, payload.statuses ?? [], true);
      } catch (error) {
        console.error("Failed to fetch statuses", error);
      }
    },
    [syncGroupStatuses]
  );

  const activeGroupIdForFetch = activeGroup?.id ?? null;

  useEffect(() => {
    if (!activeGroupIdForFetch) {
      return;
    }
    void fetchGroupStatuses(activeGroupIdForFetch);
  }, [activeGroupIdForFetch, fetchGroupStatuses]);

  useEffect(() => {
    if (!activeGroupIdForFetch) {
      return;
    }

    const interval = window.setInterval(() => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return;
      }
      void fetchGroupStatuses(activeGroupIdForFetch);
    }, STATUS_POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [activeGroupIdForFetch, fetchGroupStatuses]);

  useEffect(() => {
    if (!showAccountMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setShowAccountMenu(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowAccountMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showAccountMenu]);

  useEffect(() => {
    if (!previewImage) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewImage(null);
        setPreviewAlt("");
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
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
        await supabase.from("profiles").upsert(
          {
            id: userId,
            display_name: displayName,
            email,
            username: displayName,
          },
          { onConflict: "id" }
        );
      } catch (syncError) {
        console.error("Failed to upsert profile", syncError);
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
    if (timeoutKey === "never") return null;
    const duration = STATUS_TIMEOUTS[timeoutKey];
    if (!duration) return null;
    return Date.now() + duration;
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      photoInputRef.current?.removeAttribute("capture");
      return;
    }

    if (imageReaderRef.current) {
      imageReaderRef.current.abort();
      imageReaderRef.current = null;
    }

    setStatusImage(null);
    setIsUploadingImage(true);

    const reader = new FileReader();
    imageReaderRef.current = reader;
    reader.onerror = () => {
      setIsUploadingImage(false);
      imageReaderRef.current = null;
      photoInputRef.current?.removeAttribute("capture");
    };
    reader.onabort = () => {
      setIsUploadingImage(false);
      imageReaderRef.current = null;
      photoInputRef.current?.removeAttribute("capture");
    };
    reader.onloadend = () => {
      if (typeof reader.result === "string" && !reader.error) {
        setStatusImage(reader.result);
      }
      setIsUploadingImage(false);
      imageReaderRef.current = null;
      photoInputRef.current?.removeAttribute("capture");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const triggerPhotoPicker = (mode: "camera" | "library") => {
    const input = photoInputRef.current;
    if (!input) return;
    input.value = "";
    if (mode === "camera") {
      input.setAttribute("capture", "environment");
    } else {
      input.removeAttribute("capture");
    }
    input.click();
  };

  const submitStatus = useCallback(
    async (payload: {
      status: string;
      emoji: string | null;
      image: string | null;
      expiresAt: number | null;
    }) => {
      if (!activeGroup) return;

      const response = await fetch(`/api/groups/${activeGroup.id}/statuses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const problem = await response.json().catch(() => ({}));
        throw new Error(problem.error ?? "Unable to update status.");
      }

      const result = (await response.json()) as { status: GroupStatusRecord };
      syncGroupStatuses(activeGroup.id, [result.status], false);
    },
    [activeGroup, syncGroupStatuses]
  );

  const updateStatus = async (status: QuickStatus) => {
    if (!activeGroup) return;
    const expiresAt = getExpirationTime(statusTimeout);

    try {
      await submitStatus({
        status: status.label,
        emoji: status.emoji,
        image: null,
        expiresAt,
      });
    } catch (error) {
      console.error("Failed to post status", error);
    }

    resetCustomStatusForm();
    setShowStatusPicker(false);
    setShowCustomStatus(false);
    setStatusTimeout("4h");
  };

  const saveCustomStatus = async () => {
    if (!activeGroup) return;
    if (isUploadingImage) return;
    if (!customMessage.trim() && !statusImage) return;

    const expiresAt = getExpirationTime(statusTimeout);

    try {
      await submitStatus({
        status: customMessage.trim() || "Custom status",
        emoji: "💬",
        image: statusImage,
        expiresAt,
      });
    } catch (error) {
      console.error("Failed to post custom status", error);
    }

    resetCustomStatusForm();
    setShowCustomStatus(false);
    setShowStatusPicker(false);
    setStatusTimeout("4h");
  };

  const renderStatusExpirySelect = (
    value: string,
    onChange: (next: string) => void
  ) => (
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

  const openLeaveConfirmation = () => {
    if (!activeGroup) return;
    setPendingLeaveGroup(activeGroup);
    setLeaveError(null);
    setShowLeaveConfirmation(true);
  };

  const closeLeaveConfirmation = () => {
    if (leavingGroup) return;
    setShowLeaveConfirmation(false);
    setPendingLeaveGroup(null);
    setLeaveError(null);
  };

  const handleLeaveGroup = async () => {
    const targetGroup = pendingLeaveGroup;
    if (!targetGroup) return;
    try {
      setLeavingGroup(true);
      setLeaveError(null);
      const response = await fetch(
        `/api/groups/${targetGroup.id}/members/${userId}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Unable to leave group.");
      }
      removeMembership(targetGroup.id, userId);
      setActiveGroupId((previous) => {
        if (previous !== targetGroup.id) return previous;
        const next = groups.filter((group) => group.id !== targetGroup.id);
        return next.length ? next[0].id : null;
      });
      void refresh();
      setShowLeaveConfirmation(false);
      setPendingLeaveGroup(null);
      setLeaveError(null);
    } catch (leaveError) {
      console.error("Failed to leave group", leaveError);
      const message =
        leaveError instanceof Error
          ? leaveError.message
          : "Failed to leave the group.";
      setLeaveError(message);
    } finally {
      setLeavingGroup(false);
    }
  };

  const emptyState = !loading && groups.length === 0;

  const renderGroupMember = (member: GroupMember) => {
    const statusKey = activeGroup
      ? getStatusKey(activeGroup.id, member.id)
      : "";
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
                  {currentStatus.emoji && (
                    <span className="text-base">{currentStatus.emoji}</span>
                  )}
                  <span>{currentStatus.status}</span>
                </div>
                {currentStatus.image && (
                  <button
                    type="button"
                    onClick={() =>
                      openImagePreview(
                        currentStatus.image!,
                        `${resolvedName} status photo`
                      )
                    }
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
          <span className="ml-3 text-xs text-slate-400">
            {currentStatus.timestamp}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-stone-100 font-sans text-slate-900">
      <Header
        displayName={displayName}
        email={email}
        onSignOut={onSignOut}
        setShowCreateGroup={setShowCreateGroup}
      />

      <GroupNav
        groups={groups}
        activeGroupId={activeGroupId}
        onSelectGroup={setActiveGroupId}
        onCreateGroup={() => setShowCreateGroup(true)}
      />

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
            <h2 className="mt-4 text-xl font-semibold text-slate-900">
              Create your first group
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Pick a template, invite the people you trust, and start sharing
              quick updates.
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
            {activeView === "home" && (
              <StatusPanel
                userId={userId}
                groupId={activeGroup.id}
                quickStatuses={quickStatuses}
              />
            )}

            <CirclePanel
              activeGroup={activeGroup}
              isOwner={isOwner}
              leavingGroup={leavingGroup}
              openLeaveConfirmation={openLeaveConfirmation}
              renderGroupMember={renderGroupMember}
              setInviteGroup={setInviteGroup}
            />

            {(activeView === "home" || activeView === "polls") && (
              <QuickPolls
                key={`polls-${activeGroup.id}`}
                userId={userId}
                groupId={activeGroup.id}
              />
            )}

            {(activeView === "home" || activeView === "lists") && (
              <GroupTodos
                key={`todos-${activeGroup.id}`}
                groupId={activeGroup.id}
              />
            )}
          </>
        )}
      </main>

      <FooterNav
        activeView={activeView}
        onNavigate={(key, href) => router.push(href)}
      />

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
