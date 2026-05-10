"use client";

import { motion } from "framer-motion";
import { ArrowRight, Bot, Database, GitBranch, Monitor } from "lucide-react";

const flow = [
  { label: "GitHub API", icon: GitBranch, tone: "text-emerald-300 border-emerald-500/40" },
  { label: "AI Engine", icon: Bot, tone: "text-blue-300 border-blue-500/40" },
  { label: "User Browser", icon: Monitor, tone: "text-slate-200 border-slate-600/70" },
];

export function StatelessFlow() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
      <p className="mb-4 text-xs uppercase tracking-[0.2em] text-slate-400">
        Stateless Flow
      </p>
      <div className="flex flex-col items-center gap-3 md:flex-row md:justify-between">
        {flow.map((item, i) => (
          <div key={item.label} className="flex items-center gap-3">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className={`flex h-16 w-40 items-center gap-2 rounded-xl border bg-slate-900/70 px-3 ${item.tone}`}
            >
              <item.icon className="h-4 w-4" />
              <span className="text-sm font-medium">{item.label}</span>
            </motion.div>
            {i < flow.length - 1 ? (
              <ArrowRight className="hidden h-4 w-4 text-slate-500 md:block" />
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-xl border border-dashed border-rose-500/40 bg-rose-500/5 p-3 text-center">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-rose-300">Bypassed</p>
        <div className="mx-auto flex w-fit items-center gap-2 text-rose-200">
          <Database className="h-4 w-4" />
          <span className="text-sm">Database (Not Used)</span>
        </div>
      </div>
    </div>
  );
}
