"use client";

import { ResponsiveCalendar } from "@nivo/calendar";
import type { GithubCoachDataset } from "@/lib/github-data";

type Props = {
  dataset: GithubCoachDataset;
};

function bounds(days: GithubCoachDataset["nivoCalendar"]): {
  from: string;
  to: string;
} {
  if (days.length === 0) {
    const today = new Date();
    const past = new Date();
    past.setFullYear(past.getFullYear() - 1);
    return {
      from: past.toISOString().slice(0, 10),
      to: today.toISOString().slice(0, 10),
    };
  }
  let min = days[0].day;
  let max = days[0].day;
  for (const d of days) {
    if (d.day < min) min = d.day;
    if (d.day > max) max = d.day;
  }
  return { from: min, to: max };
}

export default function ContributionHeatmap({ dataset }: Props) {
  const { from, to } = bounds(dataset.nivoCalendar);

  return (
    <div className="w-full rounded-2xl border border-zinc-800 bg-gradient-to-br from-black/85 via-black/70 to-black/95 p-4">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">
            Public contribution rhythm
          </h3>
          <p className="text-xs text-zinc-500">
            Mapped from GitHub&apos;s contributions calendar ({from} → {to}).
          </p>
        </div>
      </div>
      <div className="relative h-[300px] w-full">
        <ResponsiveCalendar
          data={dataset.nivoCalendar}
          from={from}
          to={to}
          emptyColor="#050608"
          colors={["#0b2f1f", "#0f5132", "#1f883d", "#26a641", "#3cd646"]}
          margin={{ top: 16, right: 8, bottom: 36, left: 36 }}
          yearSpacing={36}
          monthBorderColor="#27272f"
          dayBorderWidth={1}
          dayBorderColor="#050608"
          theme={{
            text: {
              fill: "#a3a3a3",
              fontSize: 11,
            },
            tooltip: {
              container: {
                background: "#09090b",
                border: "1px solid #27272a",
                borderRadius: 10,
                boxShadow:
                  "0 18px 45px rgba(0, 0, 0, 0.68), 0 0 0 1px rgba(24,195,143,0.18)",
              },
            },
          }}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-zinc-500">
        <span>
          Aggregated total:&nbsp;
          <span className="font-semibold text-zinc-300">
            {dataset.aggregates.totalContributions}
          </span>
        </span>
        <span>
          Max streak:&nbsp;
          <span className="font-semibold text-zinc-300">
            {dataset.aggregates.longestStreak}d
          </span>
        </span>
        <span>
          Trailing:&nbsp;
          <span className="font-semibold text-zinc-300">
            {dataset.aggregates.currentStreakApprox}d
          </span>
        </span>
        <span>
          Weekend share:&nbsp;
          <span className="font-semibold text-zinc-300">
            {(dataset.aggregates.weekendContributionShare * 100).toFixed(0)}%
          </span>
        </span>
      </div>
    </div>
  );
}
