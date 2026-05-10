"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

const message = "AI Coach: You held a 6-day build streak while keeping LeetCode sharp. Keep your momentum focused on one shipping goal this week.";

export function LivePreviewMockup() {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(message.slice(0, i));
      if (i >= message.length) clearInterval(id);
    }, 24);
    return () => clearInterval(id);
  }, []);

  const cells = useMemo(
    () =>
      Array.from({ length: 91 }).map((_, i) => {
        if (i % 8 === 0 || i % 11 === 0) return "bg-amber-500/80";
        if (i % 2 === 0 || i % 5 === 0) return "bg-emerald-500/80";
        return "bg-slate-800";
      }),
    [],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className="rounded-2xl border border-slate-800/90 bg-slate-950/60 p-3 shadow-2xl"
    >
      <div className="rounded-xl border border-slate-800 bg-slate-950/95">
        <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
          <span className="ml-3 text-xs text-slate-400">Forge Flux Live Preview</span>
        </div>
        <div className="grid gap-6 p-5 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-500">
              Unified Heatmap
            </p>
            <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-1">
              {cells.map((tone, idx) => (
                <div key={idx} className={`h-4 w-4 rounded-[3px] ${tone}`} />
              ))}
            </div>
            <div className="mt-3 flex gap-4 text-xs text-slate-400">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                GitHub
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                LeetCode
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-blue-300">
              AI Coach
            </p>
            <p className="min-h-[110px] text-sm leading-relaxed text-slate-200">
              {typed}
              <span className="ml-0.5 inline-block h-4 w-[1px] animate-pulse bg-blue-300 align-middle" />
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
