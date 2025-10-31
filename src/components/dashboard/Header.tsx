"use client";

import Image from "next/image";
import { ChevronDown, Plus } from "lucide-react";
import { useRef, useState, useEffect, useCallback } from "react";

type HeaderProps = {
  displayName: string;
  email: string | null;
  onSignOut: () => Promise<void> | void;
  setShowCreateGroup: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function Header({
  displayName,
  email,
  onSignOut,
  setShowCreateGroup,
}: HeaderProps) {
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  // Compute initials
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Close dropdown on click outside or Esc key
  useEffect(() => {
    if (!showAccountMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(e.target as Node)
      ) {
        setShowAccountMenu(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowAccountMenu(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showAccountMenu]);

  const handleSignOut = useCallback(async () => {
    try {
      setSigningOut(true);
      await onSignOut();
    } finally {
      setSigningOut(false);
      setShowAccountMenu(false);
    }
  }, [onSignOut]);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4">
        {/* Logo & Branding */}
        <div className="flex items-center gap-3">
          <Image
            src="/halo-logo.png"
            alt="Halo logo"
            width={40}
            height={40}
            className="h-10 w-10 rounded-full border border-slate-200 object-cover shadow-sm"
            priority
          />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Halo
            </h1>
            <p className="text-sm text-slate-500">
              Status sharing for close circles
            </p>
          </div>
        </div>
        {/* Right Section: New Group + Account Menu */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowCreateGroup(true)}
            className="hidden items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-100/70 sm:flex"
          >
            <Plus size={16} />
            New group
          </button>
          <div className="relative" ref={accountMenuRef}>
            <button
              type="button"
              onClick={() => setShowAccountMenu((previous) => !previous)}
              className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-left text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-white"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold tracking-tight text-white">
                {initials}
              </div>
              <ChevronDown
                size={16}
                className={`text-slate-400 transition ${
                  showAccountMenu ? "rotate-180" : ""
                }`}
              />
            </button>

            {showAccountMenu && (
              <div className="absolute right-0 z-20 mt-2 w-52 rounded-2xl border border-slate-200 bg-white/95 p-3 text-sm text-slate-700 shadow-xl backdrop-blur">
                <div className="mb-2">
                  <p className="truncate font-semibold text-slate-900">
                    {displayName}
                  </p>
                  {email && (
                    <p className="truncate text-xs text-slate-500">{email}</p>
                  )}
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="flex w-full items-center justify-between rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  <span>Sign out</span>
                  {signingOut && (
                    <span className="text-[10px] uppercase tracking-wide">
                      ...
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>{" "}
      </div>
    </header>
  );
}
