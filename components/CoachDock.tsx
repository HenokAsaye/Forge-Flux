"use client";

import type { Dispatch, SetStateAction } from "react";
import type { GithubCoachDataset } from "@/lib/github-data";
import {
  PERSONAS,
  defaultPrefs,
  type CoachPrefs,
} from "@/lib/preferences";

type Props = {
  prefs: CoachPrefs;
  setPrefs: Dispatch<SetStateAction<CoachPrefs | null>>;
  dataset?: GithubCoachDataset | null;
  advice: string | null;
  adviceLoading: boolean;
  adviceError: string | null;
  adviceDisabledReason?: string | null;
  requestAdvice: () => void;
};

export default function CoachDock({
  prefs,
  setPrefs,
  dataset,
  advice,
  adviceLoading,
  adviceError,
  adviceDisabledReason,
  requestAdvice,
}: Props) {
  const personaStyles: Record<(typeof PERSONAS)[number]["id"], string> = {
    supportive: "from-emerald-500/20 via-teal-600/40 to-emerald-400/55",
    blunt: "from-rose-500/30 via-orange-700/55 to-emerald-500/40",
    data: "from-sky-500/25 via-violet-600/55 to-emerald-500/38",
  };

  const halo = personaStyles[prefs.persona];

  return (
    <div className="space-y-4">
      <div className="relative rounded-3xl border border-emerald-500/20 bg-black/65 shadow-[0_26px_80px_rgba(0,0,0,0.55)] ring-1 ring-emerald-500/10">
        <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${halo}`}>
          <div className="rounded-3xl border border-white/5 bg-black/75 p-[1px] backdrop-blur">
            <div className="space-y-3 rounded-[22px] bg-zinc-950/86 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.16em] text-emerald-200/85">
                    {PERSONAS.find((p) => p.id === prefs.persona)?.label ?? "Coach"}
                  </p>
                  <h3 className="text-lg font-semibold text-white">
                    Your session advice
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={requestAdvice}
                  disabled={Boolean(adviceDisabledReason) || adviceLoading}
                  title={adviceDisabledReason ?? undefined}
                  className="inline-flex items-center justify-center rounded-full border border-emerald-400/50 bg-black/65 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100 transition hover:border-emerald-300 hover:bg-black/95 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-500"
                >
                  {adviceLoading ? "Thinking…" : "Refresh coaching"}
                </button>
              </div>

              {adviceError ? (
                <p className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-3 text-xs text-rose-100">
                  {adviceError}
                </p>
              ) : null}

              {!advice && !adviceLoading && !adviceError ? (
                <p className="text-sm leading-relaxed text-zinc-400">
                  Press refresh to weave your rhythms, streaks, and goal into two
                  short sections: recognition plus next focus—grounded strictly in the
                  public stats we fetched.
                  {dataset
                    ? " If this account is quieter than most, lean on intent and pacing."
                    : null}
                </p>
              ) : null}

              {adviceLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-4 w-full animate-pulse rounded bg-zinc-800/85"
                      style={{ width: `${60 + i * 10}%` }}
                    />
                  ))}
                </div>
              ) : null}

              {advice && !adviceLoading ? (
                <div className="space-y-3 text-[15px] leading-relaxed text-zinc-100">
                  {advice.split("\n").map((line, idx) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <p key={idx}>{line}</p>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <details className="group rounded-2xl border border-dashed border-zinc-700/80 bg-black/65 px-5 py-3 text-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-zinc-300">
          <span>Revise onboarded preferences</span>
          <span className="rounded-full bg-zinc-900 px-3 py-[2px] text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500 group-open:bg-emerald-500/25 group-open:text-emerald-200">
            local-only
          </span>
        </summary>
        <div className="mt-4 space-y-3 text-xs text-zinc-400">
          <textarea
            rows={2}
            className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
            value={prefs.goal}
            onChange={(e) =>
              setPrefs((prev) => ({
                ...(prev ?? defaultPrefs()),
                goal: e.target.value,
              }))
            }
            placeholder="Update your immediate focus..."
          />

          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: "student", label: "Student" },
                { id: "pro", label: "Pro" },
                { id: "hobby", label: "Hobbyist" },
              ] as const
            ).map((opt) => {
              const checked = prefs.role === opt.id;
              return (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer items-center justify-center rounded-xl border px-2 py-1 text-[11px] font-medium ${
                    checked
                      ? "border-emerald-400/65 bg-emerald-500/10 text-emerald-100"
                      : "border-zinc-800 bg-zinc-950 text-zinc-400"
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    checked={checked}
                    onChange={() =>
                      setPrefs((prev) => ({
                        ...(prev ?? defaultPrefs()),
                        role: opt.id,
                      }))
                    }
                  />
                  {opt.label}
                </label>
              );
            })}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {PERSONAS.map((personaOpt) => {
              const checked = prefs.persona === personaOpt.id;
              return (
                <label
                  key={personaOpt.id}
                  className={`flex cursor-pointer items-center rounded-xl border px-3 py-2 text-[11px] ${
                    checked
                      ? "border-emerald-400/65 bg-emerald-500/10 text-emerald-100"
                      : "border-zinc-800 bg-zinc-950 text-zinc-300"
                  }`}
                >
                  <input
                    type="radio"
                    className="mr-2 accent-emerald-400"
                    checked={checked}
                    onChange={() =>
                      setPrefs((prev) => ({
                        ...(prev ?? defaultPrefs()),
                        persona: personaOpt.id,
                      }))
                    }
                  />
                  <span>{personaOpt.label}</span>
                </label>
              );
            })}
          </div>

          <p className="text-[11px] text-zinc-500">
            Edits autosave instantly to{' '}
            <span className="font-mono text-zinc-300">localStorage</span>; sign out wipes
            the GitHub OAuth cookie issued by GitHub—not your questionnaire.
          </p>
        </div>
      </details>
    </div>
  );
}
