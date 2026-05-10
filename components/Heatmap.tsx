"use client";

import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Cell = {
  day: string;
  count: number;
  source: "github" | "leetcode";
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function makeMockCells(): Cell[] {
  const today = new Date();
  const cells: Cell[] = [];
  for (let i = 0; i < 168; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - (167 - i));
    const count = (i * 7) % 6;
    const source: Cell["source"] = i % 9 === 0 || i % 13 === 0 ? "leetcode" : "github";
    cells.push({
      day: d.toISOString().slice(0, 10),
      count,
      source,
    });
  }
  return cells;
}

function toLabel(day: string, count: number) {
  const d = new Date(`${day}T12:00:00Z`);
  return `${count} Activities on ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function tone(source: Cell["source"], count: number) {
  if (count <= 0) return "bg-slate-900";
  if (source === "github") {
    if (count <= 1) return "bg-[#064e3b]";
    if (count <= 2) return "bg-[#065f46]";
    if (count <= 3) return "bg-[#047857]";
    if (count <= 4) return "bg-[#059669]";
    return "bg-[#10b981]";
  }
  if (count <= 1) return "bg-[#78350f]";
  if (count <= 2) return "bg-[#92400e]";
  if (count <= 3) return "bg-[#b45309]";
  if (count <= 4) return "bg-[#d97706]";
  return "bg-[#f59e0b]";
}

export function Heatmap() {
  const cells = makeMockCells();
  const monthMarkers = [0, 31, 59, 90, 120, 151].map((idx) => MONTHS[new Date(`${cells[idx].day}T12:00:00Z`).getUTCMonth()]);

  return (
    <TooltipProvider delayDuration={80}>
      <div className="rounded-2xl border border-slate-800 bg-slate-950/65 p-5 shadow-[0_18px_40px_rgba(2,6,23,0.45)]">
        <div className="mb-3 grid grid-cols-6 text-xs text-slate-400">
          {monthMarkers.map((m, i) => (
            <span key={`${m}-${i}`}>{m}</span>
          ))}
        </div>
        <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-[2px]">
          {cells.map((cell, i) => {
            const active = cell.count > 0;
            const col = i % 24;
            return (
              <Tooltip key={cell.day}>
                <TooltipTrigger asChild>
                  <motion.button
                    type="button"
                    initial={{ x: -5, opacity: 0, scale: 0.96 }}
                    animate={{ x: 0, opacity: 1, scale: 1 }}
                    transition={{ duration: 0.18, delay: col * 0.012 + Math.floor(i / 24) * 0.002 }}
                    className={cn(
                      "h-4 w-4 rounded-[2px] border border-white/5 transition",
                      tone(cell.source, cell.count),
                      active && cell.source === "github" && "hover:shadow-[0_0_14px_rgba(16,185,129,0.75)]",
                      active && cell.source === "leetcode" && "hover:shadow-[0_0_14px_rgba(245,158,11,0.75)]",
                    )}
                    aria-label={toLabel(cell.day, cell.count)}
                  />
                </TooltipTrigger>
                <TooltipContent>{toLabel(cell.day, cell.count)}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end gap-4 text-xs text-slate-400">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
            GitHub
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
            LeetCode
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}
