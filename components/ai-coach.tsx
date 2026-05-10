"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  advice: string;
  persona: string;
  onPersonaChange: (persona: string) => void;
  loading: boolean;
};

const personas = ["Mentor", "Critic", "Analyst"] as const;

export default function AICoach({ advice, persona, onPersonaChange, loading }: Props) {
  const [chars, setChars] = useState(0);

  useEffect(() => {
    setChars(0);
  }, [advice, persona]);

  useEffect(() => {
    if (!advice) return;
    const id = setInterval(() => {
      setChars((n) => (n >= advice.length ? n : n + 1));
    }, 10);
    return () => clearInterval(id);
  }, [advice]);

  return (
    <Card className="border-white/10 bg-slate-900/45 backdrop-blur-xl">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-slate-100">Coach Terminal</CardTitle>
          <div className="flex gap-2">
            {personas.map((p) => (
              <button
                key={p}
                onClick={() => onPersonaChange(p)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition",
                  persona === p
                    ? "border-emerald-400/55 bg-emerald-500/10 text-emerald-200"
                    : "border-white/10 bg-slate-900/80 text-slate-300",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <div className="h-4 w-5/6 animate-pulse rounded bg-slate-800" />
            <div className="h-4 w-4/6 animate-pulse rounded bg-slate-800" />
            <div className="h-4 w-3/6 animate-pulse rounded bg-slate-800" />
          </div>
        ) : (
          <p className="font-mono text-sm leading-relaxed text-slate-200">
            {advice.slice(0, chars)}
            <span className="ml-0.5 inline-block h-4 w-[1px] animate-pulse bg-emerald-300 align-middle" />
          </p>
        )}
      </CardContent>
    </Card>
  );
}
