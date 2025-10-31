"use client";

import { useState } from "react";
import { Users, Loader2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import type { GroupRecord } from "@/types/groups";

type LeaveGroupDialogProps = {
  open: boolean;
  group: GroupRecord;
  userId: string;
  onClose: () => void;
  onLeaveSuccess: (group: GroupRecord) => void;
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

      onLeaveSuccess(group);
    } catch (err) {
      console.error("Failed to leave group", err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLeaving(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={() => {
        if (!leaving) {
          onClose();
        }
      }}
      contentClassName="max-w-md"
      showCloseButton={!leaving}
    >
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
    </Modal>
  );
}
