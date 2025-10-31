"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { ReactNode } from "react";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  overlayClassName?: string;
  contentClassName?: string;
  showCloseButton?: boolean;
  closeButtonAriaLabel?: string;
};

const baseOverlayClass =
  "fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/70 px-4 py-8";

export default function Modal({
  isOpen,
  onClose,
  children,
  overlayClassName,
  contentClassName,
  showCloseButton = true,
  closeButtonAriaLabel = "Close dialog",
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`${baseOverlayClass} ${overlayClassName ?? ""}`.trim()}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-2xl backdrop-blur ${
          contentClassName ?? ""
        }`.trim()}
        onClick={(event) => event.stopPropagation()}
      >
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
            aria-label={closeButtonAriaLabel}
          >
            <X size={18} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
