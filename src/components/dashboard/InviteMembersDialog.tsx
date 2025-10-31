"use client";

import { useEffect, useState } from "react";
import { Link2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import type { GroupRecord } from "@/types/groups";

type InviteMembersDialogProps = {
  group: GroupRecord;
  open: boolean;
  onClose: () => void;
};

export default function InviteMembersDialog({ group, open, onClose }: InviteMembersDialogProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setInviteUrl(`${window.location.origin}/groups/${group.id}`);
    }
    if (!open) {
      setFeedback(null);
    }
  }, [group.id, open]);

  if (!open) {
    return null;
  }

  const copyToClipboard = async (value: string) => {
    const text = value.trim();
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      navigator.clipboard.writeText
    ) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    } catch (error) {
      console.error("Fallback copy failed", error);
      return false;
    }
  };

  const handleCopy = async () => {
    const copied = await copyToClipboard(inviteUrl);
    setFeedback(
      copied
        ? "Link copied to clipboard."
        : "Copy not supported on this device."
    );
  };

  return (
    <Modal isOpen={open} onClose={onClose}>
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Share group invite
          </h2>
          <p className="text-sm text-slate-500">
            Send this link to friends who already use Halo. Once they tap it and
            sign in, they can join your group.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white">
              <Link2 size={18} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-700">{inviteUrl}</p>
              <p className="text-xs text-slate-400">Valid for anyone with the link</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Link2 size={16} />
            Copy link
          </button>
        </div>

        {feedback && <p className="mt-4 text-sm text-slate-500">{feedback}</p>}
    </Modal>
  );
}
