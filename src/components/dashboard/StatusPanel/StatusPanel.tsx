import { useCallback, useState } from "react";
import type { QuickStatus } from "@/components/dashboard/groupPresets";
import type { MemberStatus } from "@/hooks/useStatus";
import StatusComposerDrawer from "./StatusComposerDrawer";

type StatusPanelProps = {
  groupId: string;
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
  groupId,
  quickStatuses,
  userStatus,
  onPostStatus,
  allowUpdates,
}: StatusPanelProps) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (payload: {
      status: string;
      emoji: string;
      image: string | null;
      expiresAt: number | null;
    }) => {
      try {
        await onPostStatus(payload);
        setPanelError(null);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to update your status.";
        setPanelError(message);
        throw error;
      }
    },
    [onPostStatus]
  );

  const openComposer = () => {
    if (!allowUpdates) {
      setPanelError("Select a group to share an update.");
      return;
    }
    setComposerOpen(true);
  };

  return (
    <>
      <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
              Status
            </h2>
            <p className="text-sm text-slate-500">
              Let your circle know what you’re up to.
            </p>
          </div>
          <button
            type="button"
            onClick={openComposer}
            disabled={!allowUpdates}
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Share update
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
          {userStatus ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 text-sm font-medium text-slate-700 sm:text-base">
                <span className="text-lg sm:text-xl">{userStatus.emoji}</span>
                <span>{userStatus.status}</span>
              </div>
              <span className="text-xs text-slate-400 sm:text-sm">
                Updated {userStatus.timestamp}
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-slate-600">
                No status yet
              </p>
              <p className="text-sm text-slate-500">
                Tap “Share update” to post a quick preset or craft something
                custom with a photo.
              </p>
            </div>
          )}
        </div>

        {panelError && (
          <p className="mt-4 text-sm text-rose-500" role="alert">
            {panelError}
          </p>
        )}
      </section>

      <StatusComposerDrawer
        groupId={groupId}
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        quickStatuses={quickStatuses}
        currentStatus={userStatus}
        onSubmit={handleSubmit}
      />
    </>
  );
}
