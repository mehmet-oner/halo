"use client";
import { useState } from "react";
import { getExpirationTime } from "@/components/dashboard/utils/time";
import type { QuickStatus } from "@/components/dashboard/groupPresets";
import { useStatus } from "../../hooks/useStatus";
import StatusPicker from "./StatusPicker";

type StatusPanelProps = {
  userId: string;
  groupId: string;
  quickStatuses: QuickStatus[];
};

export default function StatusPanel({
  userId,
  groupId,
  quickStatuses,
}: StatusPanelProps) {
  const { userStatus, postStatus } = useStatus(groupId, userId);
  const [showPicker, setShowPicker] = useState(false);
  const [statusTimeout, setStatusTimeout] = useState("4h");

  async function updateStatus(status: QuickStatus) {
    const expiresAt = getExpirationTime(statusTimeout);
    await postStatus({
      status: status.label,
      emoji: status.emoji,
      image: null,
      expiresAt,
    });
    setShowPicker(false);
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium text-slate-900">Status</h2>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Updates
        </button>
      </div>

      {userStatus ? (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <span className="text-base">{userStatus.emoji}</span>
            <span>{userStatus.status}</span>
          </div>
          <span className="text-xs text-slate-400">{userStatus.timestamp}</span>
        </div>
      ) : (
        <p className="text-sm text-slate-400">No status yet</p>
      )}

      {showPicker && (
        <StatusPicker
          quickStatuses={quickStatuses}
          onSelect={updateStatus}
          timeout={statusTimeout}
          onTimeoutChange={setStatusTimeout}
        />
      )}
    </section>
  );
}
