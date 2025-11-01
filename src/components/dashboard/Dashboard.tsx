"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Loader2, Plus, X } from "lucide-react";
import { useGroups } from "@/hooks/useGroups";
import { useStatus, getStatusKey } from "@/hooks/useStatus";
import CreateGroupDialog from "@/components/dashboard/CreateGroupDialog";
import InviteMembersDialog from "@/components/dashboard/InviteMembersDialog";
import QuickPolls from "@/components/dashboard/QuickPolls";
import GroupTodos from "@/components/dashboard/GroupTodos";
import StatusPanel from "@/components/dashboard/StatusPanel/StatusPanel";
import CirclePanel from "@/components/dashboard/CirclePanel";
import Header from "@/components/dashboard/Header";
import GroupNav from "@/components/dashboard/GroupNav";
import FooterNav from "@/components/dashboard/FooterNav";
import LeaveGroupDialog from "@/components/dashboard/LeaveGroupDialog";
import {
  DEFAULT_STATUSES,
  findPreset,
  getDisplayName,
} from "@/components/dashboard/groupPresets";
import type { GroupMember, GroupRecord } from "@/types/groups";
import type { DashboardView } from "@/types/navigation";

const renderInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

type DashboardProps = {
  userId: string;
  displayName: string;
  email: string | null;
  onSignOut: () => Promise<void> | void;
  view?: DashboardView;
};

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
  const [pendingLeaveGroup, setPendingLeaveGroup] =
    useState<GroupRecord | null>(null);

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
  const quickStatuses =
    presetConfig?.statuses?.length ? presetConfig.statuses : DEFAULT_STATUSES;

  const { memberStatuses, userStatus, postStatus } = useStatus(
    activeGroup?.id ?? null,
    userId
  );

  const openImagePreview = useCallback((src: string, alt: string) => {
    setPreviewImage(src);
    setPreviewAlt(alt);
  }, []);

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

  const openLeaveConfirmation = useCallback(() => {
    if (!activeGroup) return;
    setPendingLeaveGroup(activeGroup);
  }, [activeGroup]);

  const closeLeaveConfirmation = useCallback(() => {
    setPendingLeaveGroup(null);
  }, []);

  const handleLeaveSuccess = useCallback(
    (group: GroupRecord) => {
      removeMembership(group.id, userId);
      setActiveGroupId((previous) => {
        if (previous !== group.id) return previous;
        const next = groups.filter((item) => item.id !== group.id);
        return next.length ? next[0].id : null;
      });
      void refresh();
      setPendingLeaveGroup(null);
    },
    [groups, refresh, removeMembership, userId]
  );

  const emptyState = !loading && groups.length === 0;

  const renderGroupMember = useCallback(
    (member: GroupMember) => {
      if (!activeGroup) return null;

      const statusKey = getStatusKey(activeGroup.id, member.id);
      const currentStatus = memberStatuses[statusKey] ?? null;
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
                          currentStatus.image as string,
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
    },
    [activeGroup, memberStatuses, openImagePreview]
  );

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

  const handleNavigate = useCallback(
    (_key: DashboardView, href: string) => {
      router.push(href);
    },
    [router]
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header
        displayName={displayName}
        email={email}
        onSignOut={onSignOut}
        setShowCreateGroup={setShowCreateGroup}
      />

      <GroupNav
        groups={groups}
        activeGroupId={activeGroup?.id ?? null}
        onSelectGroup={setActiveGroupId}
        onCreateGroup={() => setShowCreateGroup(true)}
      />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-5 pb-24 pt-6">
        {loading && (
          <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white/80 p-10 text-sm text-slate-500 shadow-sm">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading your circles…
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600 shadow-sm">
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
            {view === "home" && (
              <StatusPanel
                quickStatuses={quickStatuses}
                userStatus={userStatus}
                onPostStatus={postStatus}
                allowUpdates={Boolean(activeGroup)}
              />
            )}

            <CirclePanel
              activeGroup={activeGroup}
              isOwner={isOwner}
              leavingGroup={Boolean(pendingLeaveGroup)}
              openLeaveConfirmation={openLeaveConfirmation}
              renderGroupMember={renderGroupMember}
              setInviteGroup={setInviteGroup}
            />

            {(view === "home" || view === "polls") && (
              <QuickPolls
                key={`polls-${activeGroup.id}`}
                userId={userId}
                groupId={activeGroup.id}
              />
            )}

            {(view === "home" || view === "lists") && (
              <GroupTodos
                key={`todos-${activeGroup.id}`}
                groupId={activeGroup.id}
                userId={userId}
              />
            )}
          </>
        )}
      </main>

      {previewImage && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/85 px-4"
          onClick={() => {
            setPreviewImage(null);
            setPreviewAlt("");
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
                setPreviewAlt("");
              }}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/80 text-white shadow-lg transition hover:bg-slate-900"
              aria-label="Close full-size photo"
            >
              <X size={18} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage}
              alt={previewAlt}
              className="h-full w-full rounded-3xl object-contain"
            />
          </div>
        </div>
      )}

      <FooterNav activeView={view} onNavigate={handleNavigate} />

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

      {pendingLeaveGroup && (
        <LeaveGroupDialog
          open
          group={pendingLeaveGroup}
          userId={userId}
          onClose={closeLeaveConfirmation}
          onLeaveSuccess={handleLeaveSuccess}
        />
      )}
    </div>
  );
}
