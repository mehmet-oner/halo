"use client";

import { GroupMember, GroupRecord } from "@/types/groups";
import { Loader2, TargetIcon, Users } from "lucide-react";
import type { ReactNode } from "react";
type CirclePanelProps = {
  activeGroup: GroupRecord | null;
  openLeaveConfirmation: () => void;
  isOwner: boolean;
  leavingGroup: boolean;
  setInviteGroup: (activeGroup: GroupRecord | null) => void;
  renderGroupMember: (member: GroupMember) => ReactNode;
};

export default function CirclePanel({
  activeGroup,
  openLeaveConfirmation,
  isOwner,
  setInviteGroup,
  leavingGroup,
  renderGroupMember,
}: CirclePanelProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-medium text-slate-900">
            <TargetIcon
              aria-hidden
              className="lucide lucide-target h-[18px] w-[18px]"
            />
            Circle
          </h2>
          <p className="text-sm text-slate-500">
            Check ins in {activeGroup?.name}
          </p>
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
              onClick={openLeaveConfirmation}
              disabled={leavingGroup}
              className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-rose-400 hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200"
            >
              {leavingGroup && <Loader2 size={16} className="animate-spin" />}
              Leave group
            </button>
          )}
        </div>
      </div>
      {activeGroup && (
        <div className="space-y-3">
          {activeGroup.members.map((member) => renderGroupMember(member))}
        </div>
      )}
    </section>
  );
}
