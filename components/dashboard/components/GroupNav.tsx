"use client";

import { LucideIcon, Plus, Users } from "lucide-react";
import type { GroupRecord } from "@/types/groups";
import { ICON_MAP } from "@/components/dashboard/groupPresets";

type GroupNavProps = {
  groups: GroupRecord[];
  activeGroupId: string | null;
  onSelectGroup: (id: string) => void;
  onCreateGroup: () => void;
};

export default function GroupNav({
  groups,
  activeGroupId,
  onSelectGroup,
  onCreateGroup,
}: GroupNavProps) {
  const resolveIcon = (iconKey: string): LucideIcon =>
    ICON_MAP[iconKey] ?? Users;
  return (
    <nav className="sticky top-[73px] z-10 border-b border-slate-200/60 bg-white/80 backdrop-blur">
      <div className="mx-auto w-full max-w-5xl px-5">
        <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-hide">
          {groups.map((group) => {
            const Icon = resolveIcon(group.icon ?? "users");
            const isActive = group.id === activeGroupId;

            return (
              <button
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100/70 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Icon size={16} />
                <span className="whitespace-nowrap font-medium">
                  {group.name}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={onCreateGroup}
            className="flex items-center gap-2 rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-100/70"
          >
            <Plus size={16} />
            New
          </button>
        </div>
      </div>
    </nav>
  );
}
