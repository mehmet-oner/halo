"use client";

import { useState } from "react";
import { X, Users, Loader2 } from "lucide-react";
import type { GroupRecord } from "@/types/groups";

type LeaveGroupDialogProps = {
  open: boolean;
  group: GroupRecord;
  userId: string;
  onClose: () => void;
  onLeaveSuccess: () => void;
};

export default function LeaveGroupDialog({
  open,
  group,
  userId,
  onClose,
  onLeaveSuccess,
}: LeaveGroupDialogProps) {
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleLeave = async () => {
    try {
      setLeaving(true);
      setError(null);

      const response = await fetch(
        `/api/groups/${group.id}/members/${userId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Unable to leave group.");
      }

      onLeaveSuccess();
    } catch (err) {
      console.error("Failed to leave group", err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLeaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/70 px-4 py-8">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-2xl backdrop-blur">
        <button
          type="button"
          onClick={onClose}
          disabled={leaving}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
          aria-label="Close leave group dialog"
        >
          <X size={18} />
        </button>

        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white">
            <Users size={18} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Leave {group.name}?
            </h2>
            <p className="text-sm text-slate-500">
              You’ll lose access to updates, polls, and shared lists for this
              group.
            </p>
          </div>
        </div>

        {error && <p className="mb-4 text-sm text-rose-500">{error}</p>}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={leaving}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-100/60 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Stay
          </button>

          <button
            type="button"
            onClick={handleLeave}
            disabled={leaving}
            className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {leaving && <Loader2 size={16} className="animate-spin" />}
            Leave group
          </button>
        </div>
      </div>
    </div>
  );
}
