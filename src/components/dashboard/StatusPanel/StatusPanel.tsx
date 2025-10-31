"use client";

import { useEffect, useState } from "react";
import type { QuickStatus } from "@/components/dashboard/groupPresets";
import type { MemberStatus } from "@/hooks/useStatus";
import { getExpirationTime } from "@/utils/time";
import StatusPicker from "./StatusPicker";

type StatusPanelProps = {
  quickStatuses: QuickStatus[];
  userStatus: MemberStatus | null;
  onPostStatus: (data: {
    status: string;
    emoji: string;
    image: string | null;
    expiresAt: number | null;
  }) => Promise<void>;
  allowUpdates: boolean;
};

export default function StatusPanel({
  quickStatuses,
  userStatus,
  onPostStatus,
  allowUpdates,
}: StatusPanelProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [statusTimeout, setStatusTimeout] = useState("4h");
  const [showCustomStatus, setShowCustomStatus] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    if (!allowUpdates) {
      setShowPicker(false);
      setShowCustomStatus(false);
      setStatusError(null);
      setIsUploadingImage(false);
    }
  }, [allowUpdates]);

  const handlePost = async (payload: {
    status: string;
    emoji: string;
    image: string | null;
    expiresAt: number | null;
  }) => {
    if (!allowUpdates) {
      setStatusError("Select a group to share an update.");
      return;
    }

    try {
      await onPostStatus(payload);
      setStatusError(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update status.";
      setStatusError(message);
      throw error;
    }
  };

  const handleSelectStatus = async (status: QuickStatus) => {
    const expiresAt = getExpirationTime(statusTimeout);

    try {
      await handlePost({
        status: status.label,
        emoji: status.emoji,
        image: null,
        expiresAt,
      });
      setShowPicker(false);
      setShowCustomStatus(false);
    } catch {
      // Errors are surfaced via statusError state.
    }
  };

  const handleCustomStatus = async (data: {
    message: string;
    image: string | null;
    emoji?: string;
  }) => {
    const expiresAt = getExpirationTime(statusTimeout);

    try {
      await handlePost({
        status: data.message,
        emoji: data.emoji ?? "💬",
        image: data.image,
        expiresAt,
      });
      setShowCustomStatus(false);
    } catch {
      // Errors are surfaced via statusError state.
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium text-slate-900">Status</h2>
        <button
          type="button"
          onClick={() => allowUpdates && setShowPicker((prev) => !prev)}
          disabled={!allowUpdates}
          className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
        >
          Updates
        </button>
      </div>

      {userStatus ? (
        <div className="mb-4 flex justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <span className="text-base">{userStatus.emoji}</span>
            <span>{userStatus.status}</span>
          </div>
          <span className="text-xs text-slate-400">{userStatus.timestamp}</span>
        </div>
      ) : (
        <p className="text-sm text-slate-400">No status yet</p>
      )}

      {statusError && (
        <p className="mb-3 text-sm text-rose-500" role="alert">
          {statusError}
        </p>
      )}

      {showPicker && (
        <StatusPicker
          allowUpdates={allowUpdates}
          quickStatuses={quickStatuses}
          onSelect={handleSelectStatus}
          timeout={statusTimeout}
          onTimeoutChange={setStatusTimeout}
          isUploadingImage={isUploadingImage}
          setIsUploadingImage={setIsUploadingImage}
          showCustomStatus={showCustomStatus}
          setShowCustomStatus={setShowCustomStatus}
          onSubmitCustomStatus={handleCustomStatus}
        />
      )}
    </section>
  );
}
