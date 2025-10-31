import type { QuickStatus } from "@/components/dashboard/groupPresets";
import CustomStatusComponent from "./CustomStatusComponent";

type StatusPickerProps = {
  allowUpdates: boolean;
  quickStatuses: QuickStatus[];
  timeout: string;
  onTimeoutChange: (value: string) => void;
  onSelect: (status: QuickStatus) => Promise<void>;
  isUploadingImage: boolean;
  setIsUploadingImage: (isUploading: boolean) => void;
  showCustomStatus: boolean;
  setShowCustomStatus: React.Dispatch<React.SetStateAction<boolean>>;
  onSubmitCustomStatus: (payload: {
    message: string;
    image: string | null;
    emoji?: string;
  }) => Promise<void>;
};

export default function StatusPicker({
  allowUpdates,
  quickStatuses,
  timeout,
  onTimeoutChange,
  onSelect,
  isUploadingImage,
  setIsUploadingImage,
  showCustomStatus,
  setShowCustomStatus,
  onSubmitCustomStatus,
}: StatusPickerProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-inner">
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">Suggested</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {quickStatuses.map((status) => (
            <button
              key={status.label}
              type="button"
              onClick={() => void onSelect(status)}
              disabled={!allowUpdates || isUploadingImage}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
            >
              <span className="text-lg">{status.emoji}</span>
              <span>{status.label}</span>
            </button>
          ))}
        </div>
      </div>

      <CustomStatusComponent
        allowUpdates={allowUpdates}
        isUploadingImage={isUploadingImage}
        onSubmit={onSubmitCustomStatus}
        setIsUploadingImage={setIsUploadingImage}
        setShowCustomStatus={setShowCustomStatus}
        showCustomStatus={showCustomStatus}
      />

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">
          Status expiry
        </p>
        <select
          value={timeout}
          onChange={(event) => onTimeoutChange(event.target.value)}
          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-slate-700"
        >
          <option value="30m">30 minutes</option>
          <option value="1h">1 hour</option>
          <option value="4h">4 hours</option>
          <option value="8h">8 hours</option>
          <option value="24h">24 hours</option>
          <option value="never">Never expire</option>
        </select>
      </div>
    </div>
  );
}
