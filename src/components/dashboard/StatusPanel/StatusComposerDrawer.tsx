"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type RefObject,
} from 'react';
import { Camera, Clock, ImagePlus, Loader2, Check, PencilLine } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import type { QuickStatus } from '@/components/dashboard/groupPresets';
import type { MemberStatus } from '@/hooks/useStatus';
import { STATUS_TIMEOUTS, getExpirationTime } from '@/utils/time';

const EXPIRY_OPTIONS: Array<{ key: string; label: string }> = [
  { key: '30m', label: '30 min' },
  { key: '1h', label: '1 hour' },
  { key: '4h', label: '4 hours' },
  { key: '8h', label: '8 hours' },
  { key: '24h', label: '24 hours' },
  { key: 'never', label: 'Never' },
];

type QuickStatusPickerProps = {
  statuses: QuickStatus[];
  selectedStatus: QuickStatus | null;
  onToggleStatus: (status: QuickStatus) => void;
  customMessage: string;
  isEditingCustom: boolean;
  onStartCustom: () => void;
  onCustomChange: (value: string) => void;
  onCustomBlur: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
};

function QuickStatusPicker({
  statuses,
  selectedStatus,
  onToggleStatus,
  customMessage,
  isEditingCustom,
  onStartCustom,
  onCustomChange,
  onCustomBlur,
  inputRef,
}: QuickStatusPickerProps) {
  const trimmed = customMessage.trim();

  return (
    <section>
      <p className="mb-3 text-sm font-medium text-slate-700">Suggested</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {statuses.map((status) => {
          const isActive = selectedStatus?.label === status.label && selectedStatus?.emoji === status.emoji;
          return (
            <button
              key={status.label}
              type="button"
              onClick={() => onToggleStatus(status)}
              className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-sm transition ${
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                  : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:border-slate-400 hover:bg-white'
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

        {isEditingCustom ? (
          <div className="flex min-h-[48px] items-center justify-between rounded-2xl border border-slate-900 bg-white px-3 text-sm text-slate-900 shadow-sm">
            <span className="flex flex-1 items-center gap-2">
              <span className="text-base">✏️</span>
              <input
                ref={inputRef}
                type="text"
                value={customMessage}
                onChange={(event) => onCustomChange(event.target.value)}
                onBlur={onCustomBlur}
                placeholder="Write your own"
                className="w-full border-none bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-500"
              />
            </span>
          </div>
        ) : trimmed.length > 0 ? (
          <button
            type="button"
            onClick={onStartCustom}
            className="flex min-h-[48px] w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            <span className="flex items-center gap-2 text-left">
              <span className="text-base">✏️</span>
              <span className="truncate">{trimmed}</span>
            </span>
            <PencilLine size={16} className="text-slate-400" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onStartCustom}
            className="flex min-h-[48px] w-full items-center justify-between rounded-2xl border border-dashed border-slate-300 bg-white px-3 text-sm text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
          >
            <span className="flex items-center gap-2">
              <span className="text-base">✏️</span>
              <span>Write your own</span>
            </span>
          </button>
        )}
      </div>
    </section>
  );
}

type ExpirySelectorProps = {
  value: string;
  onChange: (value: string) => void;
};

function ExpirySelector({ value, onChange }: ExpirySelectorProps) {
  return (
    <section className="space-y-3">
      <p className="text-sm font-medium text-slate-700">Status expiry</p>
      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
        <Clock size={18} className="text-slate-500" />
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="flex-1 appearance-none bg-transparent text-sm font-medium text-slate-700 outline-none"
        >
          {EXPIRY_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}

type PhotoPickerProps = {
  isUploading: boolean;
  image: string | null;
  onPickLibrary: () => void;
  onPickCamera: () => void;
  onRemoveImage: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

function PhotoPicker({
  isUploading,
  image,
  onPickLibrary,
  onPickCamera,
  onRemoveImage,
  fileInputRef,
  onFileChange,
}: PhotoPickerProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">Photo (optional)</p>
        {image && (
          <button
            type="button"
            onClick={onRemoveImage}
            className="text-xs font-medium text-slate-500 underline-offset-4 hover:underline"
          >
            Remove photo
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={onPickLibrary}
          disabled={isUploading}
          className="flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          <ImagePlus size={20} />
          Library
        </button>
        <button
          type="button"
          onClick={onPickCamera}
          disabled={isUploading}
          className="flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          <Camera size={20} />
          Camera
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      {isUploading && (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin text-slate-600" />
          Uploading photo…
        </div>
      )}

      {image && !isUploading && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="Selected status" className="max-h-60 w-full object-cover" />
        </div>
      )}
    </section>
  );
}

type StatusComposerDrawerProps = {
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
  open,
  onClose,
  quickStatuses,
  defaultTimeout = '4h',
  currentStatus,
  onSubmit,
}: StatusComposerDrawerProps) {
  const [selectedStatus, setSelectedStatus] = useState<QuickStatus | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const [statusTimeout, setStatusTimeout] = useState(defaultTimeout);
  const [statusImage, setStatusImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const customInputRef = useRef<HTMLInputElement | null>(null);
  const imageReaderRef = useRef<FileReader | null>(null);

  const clearImageState = useCallback(() => {
    setStatusImage(null);
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
      photoInputRef.current.removeAttribute('capture');
    }
    if (imageReaderRef.current) {
      imageReaderRef.current.abort();
      imageReaderRef.current = null;
    }
  }, []);

  const resetState = useCallback(() => {
    setSelectedStatus(null);
    setCustomMessage('');
    setIsEditingCustom(false);
    setStatusTimeout(defaultTimeout);
    clearImageState();
    setIsUploadingImage(false);
    setSubmitting(false);
    setError(null);
  }, [clearImageState, defaultTimeout]);

  const applyPresetSelection = useCallback(
    (label: string, emoji: string) => {
      const match = quickStatuses.find((item) => item.label === label && item.emoji === emoji);
      if (match) {
        setSelectedStatus(match);
        setIsEditingCustom(false);
        setCustomMessage('');
      } else {
        setSelectedStatus(null);
        setIsEditingCustom(false);
        setCustomMessage(label);
      }
    },
    [quickStatuses]
  );

  const bestTimeoutKey = useCallback(
    (expiresAt: number | null | undefined) => {
      if (expiresAt === null) return 'never';
      if (!expiresAt) return defaultTimeout;
      const remaining = expiresAt - Date.now();
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

  const applyCurrentStatus = useCallback(() => {
    if (!currentStatus) return;
    if (
      quickStatuses.some(
        (item) => item.label === currentStatus.status && item.emoji === (currentStatus.emoji ?? '')
      )
    ) {
      applyPresetSelection(currentStatus.status, currentStatus.emoji ?? '');
    } else {
      setSelectedStatus(null);
      setIsEditingCustom(false);
      setCustomMessage(currentStatus.status);
    }
    setStatusTimeout(bestTimeoutKey(currentStatus.expiresAt));
    setStatusImage(currentStatus.image ?? null);
  }, [applyPresetSelection, bestTimeoutKey, currentStatus, quickStatuses]);

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open, resetState]);

  useEffect(() => {
    if (!open) return;
    applyCurrentStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (isEditingCustom && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [isEditingCustom]);

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      photoInputRef.current?.removeAttribute('capture');
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
      if (typeof reader.result === 'string' && !reader.error) {
        setStatusImage(reader.result);
      }
      setIsUploadingImage(false);
      imageReaderRef.current = null;
      photoInputRef.current?.removeAttribute('capture');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const triggerPhotoPicker = (mode: 'camera' | 'library') => {
    const input = photoInputRef.current;
    if (!input) return;
    input.value = '';
    if (mode === 'camera') {
      input.setAttribute('capture', 'environment');
    } else {
      input.removeAttribute('capture');
    }
    input.click();
  };

  const handleCustomBlur = () => {
    const trimmed = customMessage.trim();
    if (trimmed.length === 0) {
      setCustomMessage('');
      setIsEditingCustom(false);
      return;
    }
    setCustomMessage(trimmed);
    setIsEditingCustom(false);
  };

  const handleToggleQuickStatus = (status: QuickStatus) => {
    setSelectedStatus((previous) =>
      previous && previous.label === status.label && previous.emoji === status.emoji ? null : status
    );
    setIsEditingCustom(false);
    setCustomMessage('');
  };

  const beginCustomEntry = () => {
    setIsEditingCustom(true);
    setSelectedStatus(null);
    if (customMessage.trim().length === 0) {
      setCustomMessage('');
    }
  };

  const handleDrawerOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      return;
    }
    if (submitting || isUploadingImage) {
      return;
    }
    onClose();
  };

  const trimmedCustomMessage = customMessage.trim();
  const resolvedMessage =
    isEditingCustom && trimmedCustomMessage.length === 0
      ? ''
      : trimmedCustomMessage || selectedStatus?.label || '';
  const resolvedEmoji = selectedStatus?.emoji ?? '💬';
  const canSubmit = resolvedMessage.length > 0 && !isUploadingImage && !submitting;

  const submitStatus = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        status: resolvedMessage,
        emoji: resolvedEmoji,
        image: statusImage,
        expiresAt: getExpirationTime(statusTimeout),
      });
      onClose();
      resetState();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : 'Unable to share your status.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={handleDrawerOpenChange}>
      <DrawerContent className="w-full max-w-xl border-none bg-white p-0 shadow-2xl sm:rounded-3xl">
        <form
          onSubmit={submitStatus}
          className="flex max-h-[calc(100vh-6rem)] flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2 sm:px-8 sm:pb-8">
            <div className="flex flex-col gap-6">
              <DrawerHeader className="px-0 pt-0">
                <DrawerTitle>Share an update</DrawerTitle>
                <DrawerDescription>
                  Pick a quick status, personalise it, and choose how long it lasts.
                </DrawerDescription>
              </DrawerHeader>

              {quickStatuses.length > 0 && (
                <QuickStatusPicker
                  statuses={quickStatuses}
                  selectedStatus={selectedStatus}
                  onToggleStatus={handleToggleQuickStatus}
                  customMessage={customMessage}
                  isEditingCustom={isEditingCustom}
                  onStartCustom={beginCustomEntry}
                  onCustomChange={setCustomMessage}
                  onCustomBlur={handleCustomBlur}
                  inputRef={customInputRef}
                />
              )}

              <ExpirySelector value={statusTimeout} onChange={setStatusTimeout} />

              <PhotoPicker
                isUploading={isUploadingImage}
                image={statusImage}
                onPickLibrary={() => triggerPhotoPicker('library')}
                onPickCamera={() => triggerPhotoPicker('camera')}
                onRemoveImage={clearImageState}
                fileInputRef={photoInputRef}
                onFileChange={handleImageUpload}
              />

              {error && (
                <p className="text-sm text-rose-500" role="alert">
                  {error}
                </p>
              )}
            </div>
          </div>

          <DrawerFooter className="bg-white px-6 py-4 sm:px-8">
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
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Share update
            </button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
