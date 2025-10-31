"use client";
import { GroupRecord } from "@/types/groups";
import { ChevronDown, Loader2 } from "lucide-react";
import { ChangeEvent, useRef, useState } from "react";
interface CustomStatusComponentProps {
  activeGroup: GroupRecord | null;
  getExpirationTime: (timeout: string) => number | null;
  isUploadingImage: boolean;
  setIsUploadingImage: (uploading: boolean) => void;
  submitStatus: (data: {
    status: string;
    emoji: string;
    image: string | null;
    expiresAt: number | null;
  }) => Promise<void>;
  setShowCustomStatus: React.Dispatch<React.SetStateAction<boolean>>;
  showCustomStatus: boolean;
}
export default function CustomStatusComponent({
  activeGroup,
  getExpirationTime,
  isUploadingImage,
  setIsUploadingImage,
  submitStatus,
  setShowCustomStatus,
  showCustomStatus,
}: CustomStatusComponentProps) {
  const [customMessage, setCustomMessage] = useState("");
  const [statusTimeout] = useState("4h");
  console.log("heeloo");
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const imageReaderRef = useRef<FileReader | null>(null);
  const [statusImage, setStatusImage] = useState<string | null>(null);

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      photoInputRef.current?.removeAttribute("capture");
      return;
    }

    if (imageReaderRef.current) {
      imageReaderRef.current.abort();
      imageReaderRef.current = null;
    }

    setStatusImage(null);
    setIsUploadingImage(true);

    const reader = new FileReader();
    imageReaderRef.current = reader;
    reader.onerror = () => {
      setIsUploadingImage(false);
      imageReaderRef.current = null;
      photoInputRef.current?.removeAttribute("capture");
    };
    reader.onabort = () => {
      setIsUploadingImage(false);
      imageReaderRef.current = null;
      photoInputRef.current?.removeAttribute("capture");
    };
    reader.onloadend = () => {
      if (typeof reader.result === "string" && !reader.error) {
        setStatusImage(reader.result);
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
  const resetCustomStatusForm = () => {
    setCustomMessage("");
    setStatusImage(null);
    setIsUploadingImage(false);
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
      photoInputRef.current.removeAttribute("capture");
    }
    if (imageReaderRef.current) {
      imageReaderRef.current.abort();
      imageReaderRef.current = null;
    }
  };

  const saveCustomStatus = async () => {
    if (!activeGroup) return;
    if (isUploadingImage) return;
    if (!customMessage.trim() && !statusImage) return;

    const expiresAt = getExpirationTime(statusTimeout);

    try {
      await submitStatus({
        status: customMessage.trim() || "Custom status",
        emoji: "💬",
        image: statusImage,
        expiresAt,
      });
    } catch (error) {
      console.error("Failed to post custom status", error);
    }

    resetCustomStatusForm();
    setShowCustomStatus(false);
    // setShowStatusPicker(false);
    // setStatusTimeout("4h");
  };

  return (
    <div>
      <button
        onClick={() =>
          setShowCustomStatus((previous) => {
            if (previous) {
              resetCustomStatusForm();
            }
            return !previous;
          })
        }
        className="flex w-full items-center justify-between rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-100/60"
      >
        <span>Create custom status</span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition ${
            showCustomStatus ? "rotate-180" : ""
          }`}
        />
      </button>
      {showCustomStatus && (
        <div className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-white/70 p-4">
          <textarea
            value={customMessage}
            onChange={(event) => setCustomMessage(event.target.value)}
            placeholder="Write a short update..."
            rows={3}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-400/60"
          />

          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Add photo</p>
              <p className="mt-1 text-xs text-slate-500">
                Attach a snapshot to pair with your custom update.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
              <button
                type="button"
                onClick={() => triggerPhotoPicker("library")}
                className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 transition hover:border-slate-400 hover:bg-slate-100/60"
              >
                <span className="mb-2 text-lg">🖼️</span>
                <span className="font-medium text-slate-600">
                  Choose from library
                </span>
              </button>
              <button
                type="button"
                onClick={() => triggerPhotoPicker("camera")}
                className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 transition hover:border-slate-400 hover:bg-slate-100/60"
              >
                <span className="mb-2 text-lg">📸</span>
                <span className="font-medium text-slate-600">Take photo</span>
              </button>
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />

            {isUploadingImage && (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-500">
                <Loader2 size={16} className="animate-spin text-slate-600" />
                <span>Uploading photo...</span>
              </div>
            )}

            {statusImage && !isUploadingImage && (
              <div className="space-y-2">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={statusImage}
                    alt="Status photo preview"
                    className="max-h-60 w-full object-contain"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setStatusImage(null)}
                  className="w-full rounded-xl px-4 py-2 text-xs font-medium text-slate-500 transition hover:bg-white"
                >
                  Remove photo
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => void saveCustomStatus()}
              disabled={
                (!customMessage.trim() && !statusImage) || isUploadingImage
              }
              className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              {isUploadingImage ? "Uploading..." : "Save"}
            </button>
            <button
              onClick={() => {
                resetCustomStatusForm();
                setShowCustomStatus(false);
              }}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100/70"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
