import type { QuickStatus } from "@/components/dashboard/groupPresets";
import CustomStatusComponent from "./CustomStatusComponent";
import { GroupRecord } from "@/types/groups";

type Props = {
  quickStatuses: QuickStatus[];
  timeout: string;
  onTimeoutChange: (t: string) => void;
  onSelect: (status: QuickStatus) => void;
  activeGroup: GroupRecord | null;
  isUploadingImage: boolean;
  setIsUploadingImage: (isUploading: boolean) => void;
  getExpirationTime: (timeoutKey: string) => number | null;
  submitStatus: (data: {
    status: string;
    emoji: string;
    image: string | null;
    expiresAt: number | null;
  }) => Promise<void>;
  setShowCustomStatus: React.Dispatch<React.SetStateAction<boolean>>;
  showCustomStatus: boolean;
};

export default function StatusPicker({
  quickStatuses,
  timeout,
  onTimeoutChange,
  onSelect,
  activeGroup,
  getExpirationTime,
  setIsUploadingImage,
  isUploadingImage,
  submitStatus,
  setShowCustomStatus,
  showCustomStatus,
}: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-inner space-y-4">
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">Suggested</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {quickStatuses.map((s) => (
            <button
              key={s.label}
              onClick={() => onSelect(s)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100"
            >
              <span className="text-lg">{s.emoji}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <CustomStatusComponent
        activeGroup={activeGroup}
        getExpirationTime={getExpirationTime}
        isUploadingImage={isUploadingImage}
        setIsUploadingImage={setIsUploadingImage}
        setShowCustomStatus={setShowCustomStatus}
        submitStatus={submitStatus}
        showCustomStatus={showCustomStatus}
      />

      <div>
        <p className="text-sm font-semibold text-slate-700 mb-2">
          Status expiry
        </p>
        <select
          value={timeout}
          onChange={(e) => onTimeoutChange(e.target.value)}
          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm"
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
