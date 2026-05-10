"use client";

import { PERSONAS, type CoachPrefs } from "@/lib/preferences";

type Props = {
  open: boolean;
  draft: CoachPrefs;
  onChange: (next: CoachPrefs) => void;
  onConfirm: () => void;
};

export default function SetupModal({ open, draft, onChange, onConfirm }: Props) {
  if (!open) return null;

  const disable =
    draft.goal.trim().length < 3;

  return (
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/80 px-5 py-8 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900/95 p-7 shadow-xl shadow-black/60">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.16em] text-emerald-300/85">
            Quick setup • stored only on this device
          </p>
          <h2 className="text-2xl font-semibold text-zinc-50">
            Tune your coach
          </h2>
          <p className="text-sm leading-relaxed text-zinc-400">
            We never write this to our servers—only GitHub-derived stats go to AI
            for your session. Preferences live in{' '}
            <span className="font-mono text-zinc-200">localStorage</span>.
          </p>
        </div>

        <div className="mt-6 space-y-5">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-200">
              What are you optimizing for right now?
            </span>
            <textarea
              rows={3}
              value={draft.goal}
              onChange={(e) => onChange({ ...draft, goal: e.target.value })}
              placeholder="e.g., Job hunt in backend, leveling up Rust OSS, graduating this semester..."
              className="w-full resize-none rounded-xl border border-zinc-800 bg-black/70 px-3 py-3 text-sm text-zinc-100 outline-none ring-emerald-500/0 transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/35"
            />
          </label>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-zinc-200">
              Where do you slot in today?
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "student", label: "Student" },
                  { id: "pro", label: "Pro" },
                  { id: "hobby", label: "Hobbyist" },
                ] as const
              ).map((opt) => {
                const checked = draft.role === opt.id;
                return (
                  <label
                    key={opt.id}
                    className={`flex cursor-pointer flex-col rounded-xl border px-3 py-2 text-sm transition ${
                      checked
                        ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-100"
                        : "border-zinc-800 bg-black/55 text-zinc-300 hover:border-zinc-600"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        className="sr-only"
                        checked={checked}
                        onChange={() => onChange({ ...draft, role: opt.id })}
                      />
                      {opt.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-zinc-200">
              Coach persona
            </legend>
            <div className="space-y-2">
              {PERSONAS.map((p) => {
                const checked = draft.persona === p.id;
                return (
                  <label
                    key={p.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                      checked
                        ? "border-emerald-400/60 bg-emerald-500/10"
                        : "border-zinc-800 bg-black/55 hover:border-zinc-600"
                    }`}
                  >
                    <input
                      type="radio"
                      className="mt-1 accent-emerald-400"
                      checked={checked}
                      onChange={() => onChange({ ...draft, persona: p.id })}
                    />
                    <span>
                      <span className="block font-semibold text-zinc-50">
                        {p.label}
                      </span>
                      <span className="mt-1 block text-zinc-400">{p.blurb}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>

        <div className="mt-7 flex items-center justify-end gap-3">
          <p className="mr-auto hidden text-[11px] text-zinc-500 sm:block">
            You can revise answers anytime from the dock.
          </p>
          <button
            type="button"
            disabled={disable}
            onClick={onConfirm}
            className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-6 py-2 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-35"
          >
            Save preferences
          </button>
        </div>
      </div>
    </div>
  );
}
