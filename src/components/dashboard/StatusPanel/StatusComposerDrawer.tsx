"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Camera,
  Clock,
  ImagePlus,
  Loader2,
  ChevronDown,
  Check,
  PencilLine,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import type { QuickStatus } from "@/components/dashboard/groupPresets";
import type { MemberStatus } from "@/hooks/useStatus";
import { STATUS_TIMEOUTS, getExpirationTime } from "@/utils/time";

const EXPIRY_OPTIONS: Array<{ key: string; label: string }> = [
  { key: "30m", label: "30 min" },
  { key: "1h", label: "1 hour" },
  { key: "4h", label: "4 hours" },
  { key: "8h", label: "8 hours" },
  { key: "24h", label: "24 hours" },
  { key: "never", label: "Never" },
];

type SavedStatusState = {
  version: 1;
  mode: "preset" | "custom";
  status: string;
  emoji: string;
  timeoutKey: string;
  image: string | null;
  presetLabel?: string | null;
};

type StatusComposerDrawerProps = {
  groupId: string;
  open: boolean;
  onClose: () => void;
  quickStatuses: QuickStatus[];
  defaultTimeout?: string;
  currentStatus: MemberStatus | null;
  onSubmit: (data: {
    status: string;
    emoji: string;
    image: string | null;
    expiresAt: number | null;
  }) => Promise<void>;
};

export default function StatusComposerDrawer({
  groupId,
  open,
  onClose,
  quickStatuses,
  defaultTimeout = "4h",
  currentStatus,
  onSubmit,
}: StatusComposerDrawerProps) {
  const storageKey = useMemo(
    () => `halo:status:${groupId}`,
    [groupId]
  );
  const [selectedStatus, setSelectedStatus] = useState<QuickStatus | null>(
    null
  );
  const [customMessage, setCustomMessage] = useState("");
  const [statusTimeout, setStatusTimeout] = useState(defaultTimeout);
  const [statusImage, setStatusImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [showExpiryMenu, setShowExpiryMenu] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [initialised, setInitialised] = useState(false);
  const customInputRef = useRef<HTMLInputElement | null>(null);

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const imageReaderRef = useRef<FileReader | null>(null);
  const expiryMenuRef = useRef<HTMLDivElement | null>(null);
  const dragStartYRef = useRef<number | null>(null);
  const dragDeltaRef = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const clearImageState = useCallback(() => {
    setStatusImage(null);
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
      photoInputRef.current.removeAttribute("capture");
    }
    if (imageReaderRef.current) {
      imageReaderRef.current.abort();
      imageReaderRef.current = null;
    }
  }, []);

  const resetState = useCallback(() => {
    setSelectedStatus(null);
    setCustomMessage("");
    setStatusTimeout(defaultTimeout);
    clearImageState();
    setIsUploadingImage(false);
    setSubmitting(false);
    setError(null);
    setCustomMode(false);
    setShowExpiryMenu(false);
    setIsDirty(false);
    setInitialised(false);
    setDragOffset(0);
    setIsDragging(false);
  }, [clearImageState, defaultTimeout]);

  const applyPresetSelection = useCallback(
    (label: string, emoji: string) => {
      const match = quickStatuses.find(
        (item) => item.label === label && item.emoji === emoji
      );
      if (match) {
        setSelectedStatus(match);
        setCustomMode(false);
        setCustomMessage("");
      } else {
        setSelectedStatus(null);
        setCustomMode(true);
        setCustomMessage(label);
      }
    },
    [quickStatuses]
  );

  const bestTimeoutKey = useCallback(
    (expiresAt: number | null | undefined) => {
      if (expiresAt === null) return "never";
      if (!expiresAt) return defaultTimeout;
      const now = Date.now();
      const remaining = expiresAt - now;
      if (!Number.isFinite(remaining) || remaining <= 0) {
        return defaultTimeout;
      }
      let bestKey = defaultTimeout;
      let smallestDiff = Number.POSITIVE_INFINITY;
      for (const [key, duration] of Object.entries(STATUS_TIMEOUTS)) {
        const diff = Math.abs(duration - remaining);
        if (diff < smallestDiff) {
          smallestDiff = diff;
          bestKey = key;
        }
      }
      return bestKey;
    },
    [defaultTimeout]
  );

  const applySavedState = useCallback(
    (state: SavedStatusState) => {
      setStatusTimeout(state.timeoutKey ?? defaultTimeout);
      if (state.mode === "preset" && state.presetLabel) {
        applyPresetSelection(state.presetLabel, state.emoji);
      } else {
        setSelectedStatus(null);
        setCustomMode(false);
        setCustomMessage(state.status);
      }
      setStatusImage(state.image ?? null);
      setIsDirty(false);
      setInitialised(true);
    },
    [applyPresetSelection, defaultTimeout]
  );

  const loadComposerState = useCallback(() => {
    if (typeof window === "undefined") {
      return false;
    }
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return false;
    }
    try {
      const parsed = JSON.parse(raw) as SavedStatusState;
      if (parsed && parsed.version === 1) {
        applySavedState(parsed);
        return true;
      }
    } catch (parseError) {
      console.error("Failed to parse saved status state", parseError);
    }
    return false;
  }, [applySavedState, storageKey]);

  const applyCurrentStatus = useCallback(() => {
    if (!currentStatus) return;
    if (
      quickStatuses.some(
        (item) =>
          item.label === currentStatus.status &&
          item.emoji === (currentStatus.emoji ?? "")
      )
    ) {
      applyPresetSelection(currentStatus.status, currentStatus.emoji ?? "");
    } else {
      setSelectedStatus(null);
      setCustomMode(false);
      setCustomMessage(currentStatus.status);
    }
    setStatusTimeout(bestTimeoutKey(currentStatus.expiresAt));
    setStatusImage(currentStatus.image ?? null);
    setIsDirty(false);
    setInitialised(true);
  }, [applyPresetSelection, bestTimeoutKey, currentStatus, quickStatuses]);

  const persistState = useCallback(
    (state: SavedStatusState) => {
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(state));
      } catch (storageError) {
        console.error("Failed to persist status state", storageError);
      }
    },
    [storageKey]
  );

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open, resetState]);

  useEffect(() => {
    if (!open || isDirty || initialised) return;
    const loaded = loadComposerState();
    if (loaded) {
      return;
    }
    applyCurrentStatus();
  }, [applyCurrentStatus, initialised, isDirty, loadComposerState, open]);

  useEffect(() => {
    if (customMode && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [customMode]);

  useEffect(() => {
    if (!showExpiryMenu) return;
    const handleClick = (event: MouseEvent) => {
      if (
        expiryMenuRef.current &&
        !expiryMenuRef.current.contains(event.target as Node)
      ) {
        setShowExpiryMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showExpiryMenu]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      photoInputRef.current?.removeAttribute("capture");
      return;
    }

    if (imageReaderRef.current) {
      imageReaderRef.current.abort();
      imageReaderRef.current = null;
    }

    setIsUploadingImage(true);
    const reader = new FileReader();
    imageReaderRef.current = reader;
    reader.onerror = () => {
      setIsUploadingImage(false);
      clearImageState();
    };
    reader.onabort = () => {
      setIsUploadingImage(false);
      clearImageState();
    };
    reader.onloadend = () => {
      if (typeof reader.result === "string" && !reader.error) {
        setStatusImage(reader.result);
        setIsDirty(true);
      }
      setIsUploadingImage(false);
      imageReaderRef.current = null;
      photoInputRef.current?.removeAttribute("capture");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const triggerPhotoPicker = (mode: "camera" | "library") => {
    const input = photoInputRef.current;
    if (!input) return;
    input.value = "";
    if (mode === "camera") {
      input.setAttribute("capture", "environment");
    } else {
      input.removeAttribute("capture");
    }
    input.click();
  };

  const resolvedMessage = useMemo(() => {
    const custom = customMessage.trim();
    if (customMode) {
      return custom;
    }
    if (custom.length > 0) return custom;
    return selectedStatus?.label ?? "";
  }, [customMessage, customMode, selectedStatus]);

  const resolvedEmoji = useMemo(() => {
    if (selectedStatus) return selectedStatus.emoji;
    return "💬";
  }, [selectedStatus]);

  const canSubmit =
    resolvedMessage.length > 0 && !isUploadingImage && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        status: resolvedMessage,
        emoji: resolvedEmoji,
        image: statusImage,
        expiresAt: getExpirationTime(statusTimeout),
      });
      persistState({
        version: 1,
        mode: customMode ? "custom" : "preset",
        status: resolvedMessage,
        emoji: resolvedEmoji,
        timeoutKey: statusTimeout,
        image: statusImage,
        presetLabel: customMode ? null : selectedStatus?.label ?? null,
      });
      onClose();
      resetState();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Unable to share your status.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectQuickStatus = (status: QuickStatus) => {
    setSelectedStatus((previous) =>
      previous?.label === status.label ? null : status
    );
    setCustomMode(false);
    setCustomMessage("");
    setIsDirty(true);
  };

  const handleActivateCustom = () => {
    setCustomMode(true);
    setSelectedStatus(null);
    setIsDirty(true);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    dragStartYRef.current = event.touches[0]?.clientY ?? null;
    dragDeltaRef.current = 0;
    setIsDragging(true);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (dragStartYRef.current === null) return;
    const currentY = event.touches[0]?.clientY;
    if (typeof currentY !== "number") return;
    dragDeltaRef.current = currentY - dragStartYRef.current;
    if (dragDeltaRef.current > 0) {
      setDragOffset(dragDeltaRef.current);
    }
  };

  const handleTouchEnd = () => {
    if (
      dragDeltaRef.current > 80 &&
      !submitting &&
      !isUploadingImage
    ) {
      onClose();
    }
    setIsDragging(false);
    setDragOffset(0);
    dragStartYRef.current = null;
    dragDeltaRef.current = 0;
  };

  return (
    <Modal
      isOpen={open}
      onClose={() => {
        if (!submitting && !isUploadingImage) {
          onClose();
        }
      }}
      overlayClassName="items-end sm:items-center"
      contentClassName="w-full max-w-xl rounded-t-3xl border-none bg-white p-0 shadow-2xl sm:rounded-3xl"
      showCloseButton={false}
    >
      <div
        className="flex flex-col gap-6 p-6 sm:p-8"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateY(${dragOffset}px)`,
          transition: isDragging ? "none" : "transform 0.2s ease",
        }}
      >
        <div className="mx-auto h-1 w-12 rounded-full bg-slate-200 sm:hidden" />
        <div>
          <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
            Share an update
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Pick a quick status, personalise it, and choose how long it lasts.
          </p>
        </div>

        {quickStatuses.length > 0 && (
          <section>
            <p className="mb-3 text-sm font-medium text-slate-700">
              Suggested
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {quickStatuses.map((status) => {
                const isActive = selectedStatus?.label === status.label;
                return (
                  <button
                    key={status.label}
                    type="button"
                    onClick={() => handleSelectQuickStatus(status)}
                    className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-sm transition ${
                      isActive
                        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                        : "border-slate-200 bg-slate-50/60 text-slate-700 hover:border-slate-400 hover:bg-white"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">{status.emoji}</span>
                      <span>{status.label}</span>
                    </span>
                    {isActive && <Check size={16} />}
                  </button>
                );
              })}
              {customMode ? (
                <div className="flex min-h-[48px] items-center gap-2 rounded-2xl border border-slate-900 bg-white px-3 text-sm text-slate-900 shadow-sm">
                  <span className="text-base">✏️</span>
                  <input
                    ref={customInputRef}
                    type="text"
                    value={customMessage}
                    onChange={(event) => {
                      setCustomMessage(event.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="Write your own"
                    className="flex-1 border-none bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-500"
                  />
                </div>
              ) : customMessage.trim().length > 0 ? (
                <button
                  type="button"
                  onClick={handleActivateCustom}
                  className="flex min-h-[48px] w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2 text-left">
                    <span className="text-base">✏️</span>
                    <span className="truncate">{customMessage}</span>
                  </span>
                  <PencilLine size={16} className="text-slate-400" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleActivateCustom}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-3 text-sm text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  <span className="text-base">✏️</span>
                  <span>Write your own</span>
                </button>
              )}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <p className="text-sm font-medium text-slate-700">Status expiry</p>
          <div className="relative" ref={expiryMenuRef}>
            <button
              type="button"
              onClick={() => setShowExpiryMenu((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400"
            >
              <span className="flex items-center gap-2">
                <Clock size={18} className="text-slate-500" />
                {
                  EXPIRY_OPTIONS.find((option) => option.key === statusTimeout)
                    ?.label
                }
              </span>
              <ChevronDown
                size={14}
                className={`text-slate-400 transition ${
                  showExpiryMenu ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>
            {showExpiryMenu && (
              <div className="absolute left-0 right-0 z-10 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                {EXPIRY_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setStatusTimeout(option.key);
                      setShowExpiryMenu(false);
                      setIsDirty(true);
                    }}
                    className={`flex w-full items-center justify-between px-4 py-3 text-sm transition hover:bg-slate-50 ${
                      statusTimeout === option.key
                        ? "text-slate-900"
                        : "text-slate-600"
                    }`}
                  >
                    <span>{option.label}</span>
                    {statusTimeout === option.key && <Check size={16} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">
              Photo (optional)
            </p>
            {statusImage && (
              <button
                type="button"
                onClick={() => {
                  setStatusImage(null);
                  setIsDirty(true);
                }}
                className="text-xs font-medium text-slate-500 underline-offset-4 hover:underline"
              >
                Remove photo
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => triggerPhotoPicker("library")}
              disabled={isUploadingImage}
              className="flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              <ImagePlus size={20} />
              Library
            </button>
            <button
              type="button"
              onClick={() => triggerPhotoPicker("camera")}
              disabled={isUploadingImage}
              className="flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              <Camera size={20} />
              Camera
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          {isUploadingImage && (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin text-slate-600" />
              Uploading photo…
            </div>
          )}

          {statusImage && !isUploadingImage && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={statusImage}
                alt="Selected status"
                className="max-h-60 w-full object-cover"
              />
            </div>
          )}
        </section>

        {error && (
          <p className="text-sm text-rose-500" role="alert">
            {error}
          </p>
        )}

        <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => {
              if (!submitting && !isUploadingImage) {
                onClose();
              }
            }}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
            disabled={submitting || isUploadingImage}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Share update
          </button>
        </div>
      </div>
    </Modal>
  );
}
