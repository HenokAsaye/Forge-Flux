"use client";

import { ActivityCalendar, type Activity } from "react-activity-calendar";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import AICoach from "@/components/ai-coach";
import LeetCodeModal from "@/components/leetcode-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SignalsResponse = {
  year: number | "all";
  availableYears: number[];
  github: {
    login: string;
    createdAt: string;
    calendarDays: Array<{ day: string; count: number }>;
    languages: Array<{ label: string; value: number; color?: string }>;
    topLanguage: string | null;
    totals: {
      commits: number;
      pullRequests: number;
      contributions: number;
      longestStreak: number;
    };
  };
  leetcode: {
    username: string | null;
    calendar: Array<{ day: string; count: number }>;
    solvedByDifficulty: { easy: number; medium: number; hard: number };
    acceptedTotal: number;
    languageProblemCount: Array<{ languageName: string; problemsSolved: number }>;
  };
  ratio: { commits: number; solves: number };
  metrics: {
    intensityScore: number;
    logicAcRate: number;
    buildVelocity: number;
    primaryStack: string;
    weekendWarrior: boolean;
    deepWorkIndex: number;
  };
  charts: {
    monthly: Array<{ month: string; github: number; leetcode: number }>;
    radar: Array<{ metric: string; value: number }>;
    difficulty: Array<{ name: string; value: number }>;
  };
  advice: string;
};

const CACHE_PREFIX = "forge_signals_v1_";
const PERSONA_KEY = "forge_coach_persona";
const PALETTE = ["#10b981", "#38bdf8", "#f59e0b", "#a855f7", "#ec4899", "#f43f5e", "#22d3ee", "#84cc16"];
const DIFFICULTY_COLORS: Record<string, string> = { Easy: "#10b981", Medium: "#f59e0b", Hard: "#f43f5e" };
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const FALLBACK_ACTIVITIES: Activity[] = [
  { date: new Date().toISOString().slice(0, 10), count: 0, level: 0 },
];

function fullYearDays(data: Array<{ day: string; count: number }>, year: number) {
  const map = new Map(data.map((d) => [d.day, d.count]));
  const out: Array<{ day: string; count: number }> = [];
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year, 11, 31);
  for (let t = start; t <= end; t += 86400000) {
    const day = new Date(t).toISOString().slice(0, 10);
    out.push({ day, count: map.get(day) ?? 0 });
  }
  return out;
}

function toCalendar(data: Array<{ day: string; count: number }>): Activity[] {
  const counts = data.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.day)).map((d) => d.count);
  const max = Math.max(1, ...counts);
  const cleaned = data
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.day))
    .map((d) => ({
      date: d.day,
      count: d.count,
      level: d.count <= 0 ? 0 : Math.min(4, Math.ceil((d.count / max) * 4)),
    }));
  return cleaned.length ? cleaned : FALLBACK_ACTIVITIES;
}

function weekdayName(day: string) {
  return new Date(`${day}T12:00:00Z`).getUTCDay();
}

export default function DashboardShell() {
  const { data: session } = useSession();
  const router = useRouter();
  const search = useSearchParams();
  const yearParam = search.get("year") === "all" ? "all" : Number(search.get("year")) || new Date().getUTCFullYear();

  const [lcUser, setLcUser] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [persona, setPersona] = useState("Mentor");
  const [data, setData] = useState<SignalsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [viewing, setViewing] = useState<{ gh: string; lc?: string } | null>(null);
  const [ghQuery, setGhQuery] = useState("");
  const [lcQuery, setLcQuery] = useState("");

  const targetGh = viewing?.gh;
  const activeLc = viewing ? viewing.lc ?? null : lcUser;
  const cacheKey = `${CACHE_PREFIX}${targetGh ?? "me"}_${yearParam}`;

  useEffect(() => {
    const key = window.localStorage.getItem("forge_leetcode_user");
    if (key?.trim()) setLcUser(key.trim());
    const savedPersona = window.localStorage.getItem(PERSONA_KEY);
    if (savedPersona) setPersona(savedPersona);
  }, []);

  useEffect(() => {
    const cached = window.localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setData(JSON.parse(cached) as SignalsResponse);
      } catch {
        window.localStorage.removeItem(cacheKey);
      }
    } else {
      setData(null);
    }
  }, [cacheKey]);

  useEffect(() => {
    window.localStorage.setItem(PERSONA_KEY, persona);
  }, [persona]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!session?.accessToken) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/signals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "fetch",
            ghToken: session.accessToken,
            ghLogin: targetGh,
            lcUser: activeLc ?? undefined,
            persona,
            year: yearParam,
          }),
        });
        const body = (await res.json()) as SignalsResponse & { error?: string };
        if (!res.ok) throw new Error(body.error ?? "Signal fetch failed");
        if (cancelled) return;
        setData(body);
        setLastSynced(new Date().toLocaleTimeString());
        window.localStorage.setItem(cacheKey, JSON.stringify(body));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Signal fetch failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [activeLc, persona, session?.accessToken, yearParam, targetGh, cacheKey]);

  function runSearch() {
    const gh = ghQuery.trim().replace(/^@/, "");
    if (!gh) return;
    setViewing({ gh, lc: lcQuery.trim() || undefined });
  }

  function resetToMe() {
    setViewing(null);
    setGhQuery("");
    setLcQuery("");
  }

  const githubHeatmap = useMemo(() => {
    if (!data) return FALLBACK_ACTIVITIES;
    const days = yearParam === "all" ? data.github.calendarDays : fullYearDays(data.github.calendarDays, yearParam);
    return toCalendar(days);
  }, [data, yearParam]);

  const leetcodeHeatmap = useMemo(() => {
    if (!data) return FALLBACK_ACTIVITIES;
    const days = yearParam === "all" ? data.leetcode.calendar : fullYearDays(data.leetcode.calendar, yearParam);
    return toCalendar(days);
  }, [data, yearParam]);

  const cumulative = useMemo(() => {
    let g = 0;
    let l = 0;
    return (data?.charts.monthly ?? []).map((m) => {
      g += m.github;
      l += m.leetcode;
      return { month: m.month, github: g, leetcode: l };
    });
  }, [data]);

  const weekdayData = useMemo(() => {
    const buckets = WEEKDAYS.map((day) => ({ day, github: 0, leetcode: 0 }));
    data?.github.calendarDays.forEach((d) => {
      buckets[weekdayName(d.day)].github += d.count;
    });
    data?.leetcode.calendar.forEach((d) => {
      buckets[weekdayName(d.day)].leetcode += d.count;
    });
    return buckets;
  }, [data]);

  const ghLanguages = useMemo(
    () =>
      (data?.github.languages ?? [])
        .slice(0, 6)
        .map((l, i) => ({ name: l.label, value: l.value, color: l.color ?? PALETTE[i % PALETTE.length] })),
    [data],
  );

  const lcLanguages = useMemo(
    () =>
      [...(data?.leetcode.languageProblemCount ?? [])]
        .sort((a, b) => b.problemsSolved - a.problemsSolved)
        .slice(0, 6)
        .map((l) => ({ name: l.languageName, value: l.problemsSolved })),
    [data],
  );

  const difficultyBars = useMemo(
    () => (data?.charts.difficulty ?? []).map((d) => ({ ...d, color: DIFFICULTY_COLORS[d.name] ?? "#38bdf8" })),
    [data],
  );

  const intensityGauge = useMemo(
    () => [{ name: "Intensity", value: data?.metrics.intensityScore ?? 0, fill: "#10b981" }],
    [data],
  );

  const availableYears = data?.availableYears ?? [typeof yearParam === "number" ? yearParam : new Date().getUTCFullYear()];
  const showSkeleton = loading && !data;

  function changeYear(year: string) {
    const params = new URLSearchParams(search.toString());
    params.set("year", year);
    router.replace(`/dashboard?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pb-16 pt-28 sm:px-6">
      <LeetCodeModal
        open={modalOpen}
        onSaved={(u) => {
          setLcUser(u);
          setModalOpen(false);
        }}
        onClose={() => setModalOpen(false)}
      />

      <Card className="border-white/10 bg-slate-900/45 backdrop-blur-xl">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            {!viewing && session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="avatar" className="h-11 w-11 rounded-full border border-white/20" />
            ) : (
              <div className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-slate-800 text-sm font-semibold text-slate-300">
                {(data?.github.login ?? "?").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-slate-100">
                {viewing ? `Viewing @${viewing.gh}` : session?.user?.name ?? "Developer"}
              </p>
              <p className="text-sm text-slate-400">@{data?.github.login ?? "loading"}</p>
            </div>
            {viewing ? (
              <button
                type="button"
                onClick={resetToMe}
                className="ml-2 rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 transition hover:border-emerald-400/50"
              >
                Back to my dashboard
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <div className="w-36">
              <Select value={yearParam === "all" ? "all" : String(yearParam)} onValueChange={changeYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  {availableYears
                    .slice()
                    .sort((a, b) => b - a)
                    .map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {!viewing && !lcUser ? (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 transition hover:border-emerald-400/50"
              >
                Add LeetCode (handle or URL)
              </button>
            ) : null}
            <SyncDot label="GitHub" on busy={loading} />
            <SyncDot label="LeetCode" on={Boolean(activeLc)} busy={loading && Boolean(activeLc)} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-slate-900/45 backdrop-blur-xl">
        <CardContent className="flex flex-wrap items-end gap-3 p-5">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs uppercase tracking-[0.14em] text-slate-400">GitHub username</label>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 focus-within:border-emerald-400/60">
              <SearchIcon />
              <input
                value={ghQuery}
                onChange={(e) => setGhQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                placeholder="e.g. torvalds"
                className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
              />
            </div>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs uppercase tracking-[0.14em] text-slate-400">LeetCode username (optional)</label>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 focus-within:border-emerald-400/60">
              <SearchIcon />
              <input
                value={lcQuery}
                onChange={(e) => setLcQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                placeholder="e.g. neetcode"
                className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={runSearch}
            className="rounded-lg border border-emerald-400/50 bg-emerald-500/10 px-5 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20"
          >
            View profile
          </button>
        </CardContent>
      </Card>

      {lastSynced ? (
        <p className="-mt-2 text-right text-xs text-slate-500">
          {loading ? "Refreshing live data…" : `Last synced ${lastSynced}`}
        </p>
      ) : null}

      {error ? (
        <Card className="border-rose-500/40 bg-rose-950/30">
          <CardContent className="p-4 text-rose-100">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <SignalCard label="Intensity Score" value={data ? `${data.metrics.intensityScore}%` : "--"} accent="emerald" delay={0} />
        <SignalCard label="Logic AC Rate" value={data ? String(data.metrics.logicAcRate) : "--"} accent="amber" delay={0.04} />
        <SignalCard label="Build Velocity" value={data ? String(data.metrics.buildVelocity) : "--"} accent="sky" delay={0.08} />
        <SignalCard label="Primary Stack" value={data?.metrics.primaryStack ?? "--"} accent="violet" delay={0.12} />
        <SignalCard label="Longest Streak" value={data ? `${data.github.totals.longestStreak}d` : "--"} accent="emerald" delay={0.16} />
        <SignalCard label="Contributions" value={data ? String(data.github.totals.contributions) : "--"} accent="sky" delay={0.2} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="GitHub Contribution Graph" className="lg:col-span-2" delay={0}>
          {showSkeleton ? (
            <SkeletonBlock />
          ) : (
            <div className="overflow-x-auto pb-2">
              <ActivityCalendar
                data={githubHeatmap}
                blockSize={12}
                blockMargin={4}
                theme={{ dark: ["#0f172a", "#064e3b", "#065f46", "#047857", "#10b981"], light: ["#0f172a", "#064e3b", "#065f46", "#047857", "#10b981"] }}
                colorScheme="dark"
              />
            </div>
          )}
        </ChartCard>

        <ChartCard title="Intensity Gauge" delay={0.05}>
          <div className="relative h-44">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="72%" outerRadius="100%" data={intensityGauge} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar background={{ fill: "#1e293b" }} dataKey="value" cornerRadius={12} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-emerald-300">{data?.metrics.intensityScore ?? 0}%</span>
              <span className="text-xs text-slate-400">active days</span>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-slate-400">
            {data?.metrics.weekendWarrior ? "Weekend Warrior" : "Weekday Builder"} · Deep Work {data?.metrics.deepWorkIndex ?? 0}
          </p>
        </ChartCard>
      </div>

      <ChartCard title="LeetCode Submission Graph" delay={0}>
        {showSkeleton ? (
          <SkeletonBlock />
        ) : (
          <div className="overflow-x-auto pb-2">
            <ActivityCalendar
              data={leetcodeHeatmap}
              blockSize={12}
              blockMargin={4}
              theme={{ dark: ["#0f172a", "#78350f", "#92400e", "#b45309", "#f59e0b"], light: ["#0f172a", "#78350f", "#92400e", "#b45309", "#f59e0b"] }}
              colorScheme="dark"
            />
          </div>
        )}
        {!activeLc ? <p className="mt-3 text-sm text-slate-400">LeetCode is optional. Add your handle or profile URL to compare solve trends.</p> : null}
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Monthly Activity" delay={0}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.charts.monthly ?? []}>
                <defs>
                  <linearGradient id="ghFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="lcFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <ReTooltip content={<DarkTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" name="GitHub" dataKey="github" stroke="#10b981" strokeWidth={2} fill="url(#ghFill)" />
                <Area type="monotone" name="LeetCode" dataKey="leetcode" stroke="#f59e0b" strokeWidth={2} fill="url(#lcFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Cumulative Growth" delay={0.05}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumulative}>
                <CartesianGrid stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <ReTooltip content={<DarkTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" name="GitHub" dataKey="github" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
                <Line type="monotone" name="LeetCode" dataKey="leetcode" stroke="#a855f7" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Activity by Weekday" delay={0}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdayData}>
                <CartesianGrid stroke="#1e293b" vertical={false} />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <ReTooltip content={<DarkTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar name="GitHub" dataKey="github" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar name="LeetCode" dataKey="leetcode" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Growth Distribution" delay={0.05}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data?.charts.radar ?? []}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Radar dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                <ReTooltip content={<DarkTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Top Languages (GitHub)" delay={0}>
          <div className="h-60">
            {ghLanguages.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={ghLanguages} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {ghLanguages.map((l) => (
                      <Cell key={l.name} fill={l.color} />
                    ))}
                  </Pie>
                  <ReTooltip content={<DarkTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState label="No language data" />
            )}
          </div>
        </ChartCard>

        <ChartCard title="Solves by Difficulty" delay={0.05}>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={difficultyBars} layout="vertical">
                <CartesianGrid stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={11} />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={60} />
                <ReTooltip content={<DarkTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {difficultyBars.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Top Languages (LeetCode)" delay={0.1}>
          <div className="h-60">
            {lcLanguages.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lcLanguages} layout="vertical">
                  <CartesianGrid stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={72} />
                  <ReTooltip content={<DarkTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {lcLanguages.map((l, i) => (
                      <Cell key={l.name} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState label="Link LeetCode to see data" />
            )}
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AICoach advice={data?.advice ?? ""} persona={persona} onPersonaChange={setPersona} loading={showSkeleton} />
        </div>
        <ChartCard title="Commits vs Solves" delay={0}>
          <p className="text-4xl font-bold text-slate-100">
            {data ? `${data.ratio.commits} : ${data.ratio.solves}` : "-- : --"}
          </p>
          <p className="mt-1 text-sm text-slate-400">Selected year ratio</p>
          <div className="mt-4 space-y-3">
            <RatioBar label="Commits" value={data?.ratio.commits ?? 0} total={(data?.ratio.commits ?? 0) + (data?.ratio.solves ?? 0)} color="#10b981" />
            <RatioBar label="Solves" value={data?.ratio.solves ?? 0} total={(data?.ratio.commits ?? 0) + (data?.ratio.solves ?? 0)} color="#f59e0b" />
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
  className,
  delay = 0,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={className}
    >
      <Card className="h-full border-white/10 bg-slate-900/45 backdrop-blur-xl transition hover:border-emerald-400/30">
        <CardHeader>
          <CardTitle className="text-slate-100">{title}</CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  );
}

const ACCENTS: Record<string, string> = {
  emerald: "text-emerald-300",
  amber: "text-amber-300",
  sky: "text-sky-300",
  violet: "text-violet-300",
};

function SignalCard({ label, value, accent, delay }: { label: string; value: string; accent: string; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay }}>
      <Card className="border-white/10 bg-slate-900/45 backdrop-blur-xl transition hover:border-emerald-400/30">
        <CardContent className="p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className={`mt-2 text-2xl font-semibold ${ACCENTS[accent] ?? "text-slate-100"}`}>{value}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RatioBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/90 px-3 py-2 text-xs shadow-xl backdrop-blur">
      {label ? <p className="mb-1 font-medium text-slate-200">{label}</p> : null}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-slate-300">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color ?? "#10b981" }} />
          {p.name}: <span className="font-semibold text-slate-100">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="grid h-full place-items-center text-sm text-slate-500">{label}</div>;
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-slate-500">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function SyncDot({ label, on, busy }: { label: string; on: boolean; busy?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-300">
      <span className={`h-2.5 w-2.5 rounded-full ${on ? "bg-emerald-400" : "bg-slate-600"} ${busy ? "animate-pulse" : ""}`} />
      {label}
    </span>
  );
}

function SkeletonBlock() {
  return (
    <motion.div
      initial={{ opacity: 0.6 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
      className="h-32 rounded-lg bg-slate-800"
    />
  );
}
