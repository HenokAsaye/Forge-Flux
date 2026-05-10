"use client";

import { ActivityCalendar, type Activity } from "react-activity-calendar";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Line,
  LineChart,
  Pie,
  PieChart,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
  PolarGrid,
  PolarAngleAxis,
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
  year: number;
  availableYears: number[];
  github: {
    login: string;
    calendarDays: Array<{ day: string; count: number }>;
    languages: Array<{ label: string; value: number; color?: string }>;
  };
  leetcode: {
    username: string | null;
    calendar: Array<{ day: string; count: number }>;
    solvedByDifficulty: { easy: number; medium: number; hard: number };
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

const FALLBACK_ACTIVITIES: Activity[] = [
  { date: new Date().toISOString().slice(0, 10), count: 0, level: 0 },
];

function toCalendar(data: Array<{ day: string; count: number }>): Activity[] {
  const cleaned = data
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.day))
    .map((d) => ({ date: d.day, count: d.count, level: d.count > 0 ? 4 : 0 }));
  return cleaned.length ? cleaned : FALLBACK_ACTIVITIES;
}

export default function DashboardShell() {
  const { data: session } = useSession();
  const router = useRouter();
  const search = useSearchParams();
  const yearFromUrl = Number(search.get("year")) || new Date().getUTCFullYear();

  const [lcUser, setLcUser] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [persona, setPersona] = useState("Mentor");
  const [data, setData] = useState<SignalsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const key = window.localStorage.getItem("forge_leetcode_user");
    if (key?.trim()) setLcUser(key.trim());
  }, []);

  useEffect(() => {
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
            lcUser: lcUser ?? undefined,
            persona,
            year: yearFromUrl,
          }),
        });
        const body = (await res.json()) as SignalsResponse & { error?: string };
        if (!res.ok) throw new Error(body.error ?? "Signal fetch failed");
        setData(body);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Signal fetch failed");
      } finally {
        setLoading(false);
      }
    }
    void run();
  }, [lcUser, persona, session?.accessToken, yearFromUrl]);

  const githubHeatmap = useMemo(() => (data ? toCalendar(data.github.calendarDays) : FALLBACK_ACTIVITIES), [data]);
  const leetcodeHeatmap = useMemo(() => (data ? toCalendar(data.leetcode.calendar) : FALLBACK_ACTIVITIES), [data]);

  const availableYears = data?.availableYears ?? [yearFromUrl];

  function changeYear(year: string) {
    const params = new URLSearchParams(search.toString());
    params.set("year", year);
    router.replace(`/dashboard?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pb-12 pt-28 sm:px-6">
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
            {session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="avatar" className="h-11 w-11 rounded-full border border-white/20" />
            ) : (
              <div className="h-11 w-11 rounded-full bg-slate-800" />
            )}
            <div>
              <p className="font-semibold text-slate-100">{session?.user?.name ?? "Developer"}</p>
              <p className="text-sm text-slate-400">@{data?.github.login ?? "loading"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-36">
              <Select value={String(yearFromUrl)} onValueChange={changeYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!lcUser ? (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 transition hover:border-emerald-400/50"
              >
                Add LeetCode (handle or URL)
              </button>
            ) : null}
            <SyncDot label="GitHub" on />
            <SyncDot label="LeetCode" on={Boolean(lcUser)} />
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-rose-500/40 bg-rose-950/30">
          <CardContent className="p-4 text-rose-100">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <SignalCard label="Intensity Score" value={data ? `${data.metrics.intensityScore}%` : "--"} />
        <SignalCard label="Logic AC Rate" value={data ? String(data.metrics.logicAcRate) : "--"} />
        <SignalCard label="Build Velocity" value={data ? String(data.metrics.buildVelocity) : "--"} />
        <SignalCard label="Primary Stack" value={data?.metrics.primaryStack ?? "--"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-white/10 bg-slate-900/40 lg:col-span-2">
          <CardHeader><CardTitle className="text-slate-100">GitHub Pro Graph</CardTitle></CardHeader>
          <CardContent>{loading ? <SkeletonBlock /> : <ActivityCalendar data={githubHeatmap} blockSize={12} blockMargin={4} theme={{ dark: ["#0f172a", "#064e3b", "#065f46", "#047857", "#10b981"], light: ["#0f172a", "#064e3b", "#065f46", "#047857", "#10b981"] }} colorScheme="dark" />}</CardContent>
        </Card>
        <Card className="border-white/10 bg-slate-900/40">
          <CardHeader><CardTitle className="text-slate-100">Commits vs Solves</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-bold text-slate-100">{data ? `${data.ratio.commits} : ${data.ratio.solves}` : "-- : --"}</p>
            <p className="text-sm text-slate-400">Selected year ratio</p>
            {data ? (
              <p className="text-xs text-slate-500">
                {data.metrics.weekendWarrior ? "Weekend Warrior" : "Weekday Builder"} · Deep Work Index {data.metrics.deepWorkIndex}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10 bg-slate-900/40">
        <CardHeader><CardTitle className="text-slate-100">LeetCode Pro Graph</CardTitle></CardHeader>
        <CardContent>
          {loading ? <SkeletonBlock /> : <ActivityCalendar data={leetcodeHeatmap} blockSize={12} blockMargin={4} theme={{ dark: ["#0f172a", "#78350f", "#92400e", "#b45309", "#f59e0b"], light: ["#0f172a", "#78350f", "#92400e", "#b45309", "#f59e0b"] }} colorScheme="dark" />}
          {!lcUser ? <p className="mt-3 text-sm text-slate-400">LeetCode is optional. Add your handle or profile URL to compare solve trends.</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AICoach advice={data?.advice ?? ""} persona={persona} onPersonaChange={setPersona} loading={loading} />
        </div>
        <Card className="border-white/10 bg-slate-900/45 backdrop-blur-xl">
          <CardHeader><CardTitle className="text-slate-100">Growth Distribution</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={data?.charts.radar ?? []}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <Radar dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.charts.difficulty ?? []}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={55}
                    fill="#8884d8"
                    label
                  />
                  <ReTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10 bg-slate-900/45 backdrop-blur-xl">
        <CardHeader><CardTitle className="text-slate-100">Activity Line Chart</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.charts.monthly ?? []}>
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <ReTooltip />
              <Line type="monotone" dataKey="github" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="leetcode" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function SyncDot({ label, on }: { label: string; on: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-slate-300 text-sm">
      <span className={`h-2.5 w-2.5 rounded-full ${on ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
      {label}
    </span>
  );
}

function SignalCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-white/10 bg-slate-900/45 backdrop-blur-xl">
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-slate-100">{value}</p>
      </CardContent>
    </Card>
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
