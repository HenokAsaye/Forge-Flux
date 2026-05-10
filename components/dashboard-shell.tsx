"use client";

import { ActivityCalendar, type Activity } from "react-activity-calendar";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import AICoach from "@/components/ai-coach";
import LeetCodeModal from "@/components/leetcode-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SignalsResponse = {
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
  advice: string;
};

const FALLBACK_ACTIVITIES: Activity[] = [
  {
    date: new Date().toISOString().slice(0, 10),
    count: 0,
    level: 0,
  },
];

function toCalendar(data: Array<{ day: string; count: number }>): Activity[] {
  const cleaned = data
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.day))
    .map((d) => ({ date: d.day, count: d.count, level: d.count > 0 ? 4 : 0 }));

  if (cleaned.length > 0) return cleaned;

  const today = new Date().toISOString().slice(0, 10);
  return [{ date: today, count: 0, level: 0 }];
}

export default function DashboardShell() {
  const { data: session } = useSession();
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
  }, [lcUser, persona, session?.accessToken]);

  const githubHeatmap = useMemo(
    () => (data ? toCalendar(data.github.calendarDays) : FALLBACK_ACTIVITIES),
    [data],
  );
  const leetcodeHeatmap = useMemo(
    () => (data ? toCalendar(data.leetcode.calendar) : FALLBACK_ACTIVITIES),
    [data],
  );

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
          <div className="flex items-center gap-4 text-sm">
            <SyncDot label="GitHub" on />
            <SyncDot label="LeetCode" on={Boolean(lcUser)} />
            {!lcUser ? (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 transition hover:border-emerald-400/50"
              >
                Add LeetCode (handle or URL)
              </button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-rose-500/40 bg-rose-950/30">
          <CardContent className="p-4 text-rose-100">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-white/10 bg-slate-900/40 lg:col-span-2">
          <CardHeader><CardTitle className="text-slate-100">GitHub Pro Graph</CardTitle></CardHeader>
          <CardContent>
            {loading ? <SkeletonBlock /> : (
              <ActivityCalendar
                data={githubHeatmap}
                blockSize={12}
                blockMargin={4}
                theme={{
                  dark: ["#0f172a", "#064e3b", "#065f46", "#047857", "#10b981"],
                  light: ["#0f172a", "#064e3b", "#065f46", "#047857", "#10b981"],
                }}
                colorScheme="dark"
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-900/40">
          <CardHeader><CardTitle className="text-slate-100">Commits vs Solves</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-bold text-slate-100">
              {data ? `${data.ratio.commits} : ${data.ratio.solves}` : "-- : --"}
            </p>
            <p className="text-sm text-slate-400">30-day intensity ratio</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10 bg-slate-900/40">
        <CardHeader><CardTitle className="text-slate-100">LeetCode Pro Graph</CardTitle></CardHeader>
        <CardContent>
          {loading ? <SkeletonBlock /> : (
            <ActivityCalendar
              data={leetcodeHeatmap}
              blockSize={12}
              blockMargin={4}
              theme={{
                dark: ["#0f172a", "#78350f", "#92400e", "#b45309", "#f59e0b"],
                light: ["#0f172a", "#78350f", "#92400e", "#b45309", "#f59e0b"],
              }}
              colorScheme="dark"
            />
          )}
          {!lcUser ? (
            <p className="mt-3 text-sm text-slate-400">
              LeetCode is optional. Add your handle or profile URL to compare solve trends.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AICoach advice={data?.advice ?? ""} persona={persona} onPersonaChange={setPersona} loading={loading} />
        </div>
        <Card className="border-white/10 bg-slate-900/45 backdrop-blur-xl">
          <CardHeader><CardTitle className="text-slate-100">Language Radar</CardTitle></CardHeader>
          <CardContent>
            <RadarMini
              github={data?.github.languages ?? []}
              leetcode={data?.leetcode.languageProblemCount ?? []}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SyncDot({ label, on }: { label: string; on: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-slate-300">
      <span className={`h-2.5 w-2.5 rounded-full ${on ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
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

function RadarMini({
  github,
  leetcode,
}: {
  github: Array<{ label: string; value: number }>;
  leetcode: Array<{ languageName: string; problemsSolved: number }>;
}) {
  const g = github.slice(0, 3).reduce((s, l) => s + l.value, 0);
  const l = leetcode.slice(0, 3).reduce((s, x) => s + x.problemsSolved, 0);
  const c1 = Math.min(90, Math.max(20, g > 0 ? 80 : 30));
  const c2 = Math.min(90, Math.max(20, l > 0 ? 70 : 28));

  return (
    <svg viewBox="0 0 220 220" className="mx-auto h-52 w-52">
      <polygon points="110,25 190,75 165,180 55,180 30,75" fill="none" stroke="#334155" strokeWidth="1" />
      <polygon points={`110,${110 - c1} ${110 + c2},95 150,160 ${70},160 ${110 - c2},95`} fill="rgba(16,185,129,0.35)" stroke="#10b981" />
      <text x="110" y="18" fill="#94a3b8" textAnchor="middle" fontSize="10">Shipping</text>
      <text x="203" y="82" fill="#94a3b8" textAnchor="end" fontSize="10">Logic</text>
      <text x="110" y="196" fill="#94a3b8" textAnchor="middle" fontSize="10">Depth</text>
    </svg>
  );
}
