"use client";

import { useEffect, useRef, useState } from "react";
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
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef<number | null>(null);
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

  useEffect(() => {
    if (!isOpen) {
      setDragOffset(0);
      setIsDragging(false);
      dragStartY.current = null;
    }
  }, [isOpen]);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    dragStartY.current = event.touches[0]?.clientY ?? null;
    setIsDragging(true);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (dragStartY.current === null) return;
    const currentY = event.touches[0]?.clientY;
    if (typeof currentY !== "number") return;
    const delta = currentY - dragStartY.current;
    if (delta > 0) {
      setDragOffset(delta);
    }
  };

  const handleTouchEnd = () => {
    if (dragOffset > 80) {
      onClose();
    } else {
      setDragOffset(0);
    }
    dragStartY.current = null;
    setIsDragging(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`${baseOverlayClass} ${overlayClassName ?? ""}`.trim()}
      style={{
        transform: `translateY(${dragOffset}px)`,
        transition: isDragging ? "none" : "transform 0.2s ease",
      }}
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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
