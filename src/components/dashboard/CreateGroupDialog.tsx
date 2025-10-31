"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { GROUP_PRESETS, ICON_MAP } from "@/components/dashboard/groupPresets";
import type { GroupRecord } from "@/types/groups";

type CreateGroupDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (group: GroupRecord) => void;
};

type FormState = {
  name: string;
  preset: string;
  icon: string;
};

const presetDefaults: FormState = {
  name: "Home",
  preset: "home",
  icon: "home",
};

const iconOptions = Object.entries(ICON_MAP).map(([key, Icon]) => ({ key, Icon }));

export default function CreateGroupDialog({
  open,
  onClose,
  onCreated,
}: CreateGroupDialogProps) {
  const [form, setForm] = useState<FormState>(presetDefaults);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setForm(presetDefaults);
    setError(null);
    setSubmitting(false);
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const handleClose = () => {
    if (!submitting) {
      resetForm();
      onClose();
    }
  };

  const handlePresetSelect = (presetKey: string, label: string, icon: string) => {
    setForm({ name: label, preset: presetKey, icon });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setError("Group name is required.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          preset: form.preset,
          icon: form.icon,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to create group.");
      }

      const payload = (await response.json()) as { group: GroupRecord };
      onCreated(payload.group);
      resetForm();
      onClose();
    } catch (creationError) {
      const message =
        creationError instanceof Error ? creationError.message : "Unexpected error.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={handleClose}>
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white">
            <Plus size={18} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Create a new group
            </h2>
            <p className="text-sm text-slate-500">
              Pick a template or start with a fresh name.
            </p>
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              Quick templates
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {GROUP_PRESETS.map((preset) => {
                const Icon = ICON_MAP[preset.icon];
                const isActive = form.preset === preset.key;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handlePresetSelect(preset.key, preset.label, preset.icon)}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    <Icon size={18} />
                    <span className="font-medium">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Group name</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, name: event.target.value }))
                }
                placeholder="Trip to Berlin"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Icon</span>
              <div className="flex flex-wrap gap-2">
                {iconOptions.map(({ key, Icon }) => {
                  const isActive = form.icon === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, icon: key }))}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
                        isActive
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                      }`}
                      aria-label={`Use ${key} icon`}
                    >
                      <Icon size={18} />
                    </button>
                  );
                })}
              </div>
            </label>
          </div>

          {error && <p className="text-sm text-rose-500">{error}</p>}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-100/60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              <span>Create group</span>
            </button>
          </div>
        </form>
    </Modal>
  );
}
