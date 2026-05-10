export type DayPoint = { day: string; count: number; weekday?: number };

function parseDay(day: string) {
  return new Date(`${day}T12:00:00Z`).getTime();
}

export function flattenContributionCalendar(
  weeks: Array<{
    contributionDays: Array<{ date: string; contributionCount: number; weekday?: number }>;
  }>,
): DayPoint[] {
  const map = new Map<string, DayPoint>();

  for (const week of weeks) {
    for (const d of week.contributionDays) {
      const existing = map.get(d.date);
      if (existing) {
        existing.count += d.contributionCount;
      } else {
        map.set(d.date, {
          day: d.date,
          count: d.contributionCount,
          weekday: d.weekday,
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => parseDay(a.day) - parseDay(b.day));
}

export function totalContributions(days: DayPoint[]): number {
  return days.reduce((sum, d) => sum + d.count, 0);
}

/** Longest streak of days with ≥1 contribution. */
export function longestStreak(days: DayPoint[]): number {
  let best = 0;
  let run = 0;
  let prev: number | null = null;

  for (const d of days) {
    const ts = parseDay(d.day);
    const active = d.count > 0;
    if (!active) {
      run = 0;
      prev = null;
      continue;
    }
    if (prev !== null && ts - prev === 86400000) {
      run += 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = ts;
  }

  return best;
}

/** Streak ending on the most recent calendar day in the dataset (approximation). */
export function currentTrailingStreak(days: DayPoint[]): number {
  if (days.length === 0) return 0;
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i -= 1) {
    if (days[i].count > 0) streak += 1;
    else break;
  }
  return streak;
}

export function weekendActivityRatio(days: DayPoint[]): number {
  let weekend = 0;
  let weekday = 0;
  for (const d of days) {
    if (d.weekday === undefined) continue;
    if (d.weekday === 0 || d.weekday === 6) weekend += d.count;
    else weekday += d.count;
  }
  const total = weekend + weekday;
  if (total === 0) return 0;
  return weekend / total;
}

export type CommitRhythmSummary = {
  sampleSize: number;
  lateNightCount: number;
  latenightFrac: number;
  peakLocalHour: number | null;
  quietHoursFrac: number;
};

/** Hours interpreted in IANA timezone (e.g. "America/New_York"). Fallback: UTC. */
export function summarizeCommitRhythm(isoDates: string[], timeZone?: string): CommitRhythmSummary {
  let lateNightCount = 0;
  let quietHoursCount = 0;
  const hourBuckets = new Array(24).fill(0);
  let valid = 0;

  const tz =
    timeZone && timeZone.trim().length > 0 ? timeZone : "UTC";

  for (const iso of isoDates) {
    const t = Date.parse(iso);
    if (Number.isNaN(t)) continue;
    valid += 1;
    const hour = Number(
      new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        hour12: false,
        timeZone: tz,
      }).format(new Date(t)),
    );
    hourBuckets[hour] += 1;
    const h24 = Number.isFinite(hour) ? hour : 12;
    if (h24 >= 0 && h24 < 6) lateNightCount += 1;
    if (h24 >= 23 || h24 < 6) quietHoursCount += 1;
  }

  let peakHour: number | null = null;
  let peakVal = -1;
  hourBuckets.forEach((v, i) => {
    if (v > peakVal) {
      peakVal = v;
      peakHour = i;
    }
  });

  const sampleSize = valid;
  return {
    sampleSize,
    lateNightCount,
    latenightFrac: sampleSize ? lateNightCount / sampleSize : 0,
    peakLocalHour: peakVal <= 0 ? null : peakHour,
    quietHoursFrac: sampleSize ? quietHoursCount / sampleSize : 0,
  };
}
