"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  CircleDot,
  Clock,
  Compass,
  GitFork,
  RefreshCw,
  Sparkles,
  Star,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RepoReco } from "@/lib/recommendations";

type RecommendationsResponse = {
  recommendations: RepoReco[];
  languagesUsed: string[];
};

type SortMode = "match" | "stars" | "fresh" | "issues";
type Level = "beginner" | "any";

const CACHE_PREFIX = "forge_recos_v2_";
const SAVED_KEY = "forge_saved_repos";

const SORTS: Array<{ id: SortMode; label: string }> = [
  { id: "match", label: "Best match" },
  { id: "issues", label: "Most good-first-issues" },
  { id: "stars", label: "Most stars" },
  { id: "fresh", label: "Recently active" },
];

function compactNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  if (Number.isNaN(diff)) return "";
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function loadSaved(): Record<string, RepoReco> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SAVED_KEY);
    return raw ? (JSON.parse(raw) as Record<string, RepoReco>) : {};
  } catch {
    return {};
  }
}

export default function RecommendationsPanel({
  token,
  ghLogin,
}: {
  token?: string;
  ghLogin?: string;
}) {
  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState<Level>("beginner");
  const [sort, setSort] = useState<SortMode>("match");
  const [activeLangs, setActiveLangs] = useState<string[]>([]);
  const [saved, setSaved] = useState<Record<string, RepoReco>>({});
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  const cacheKey = `${CACHE_PREFIX}${ghLogin ?? "me"}_${level}`;

  useEffect(() => {
    setSaved(loadSaved());
  }, []);

  const fetchRecos = useCallback(
    async (force: boolean) => {
      if (!token) return;
      if (!force) {
        const cached = window.localStorage.getItem(cacheKey);
        if (cached) {
          try {
            setData(JSON.parse(cached) as RecommendationsResponse);
            return;
          } catch {
            window.localStorage.removeItem(cacheKey);
          }
        }
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ghToken: token, ghLogin, level, limit: 12 }),
        });
        const body = (await res.json()) as RecommendationsResponse & { error?: string };
        if (!res.ok) throw new Error(body.error ?? "Failed to load recommendations");
        setData(body);
        window.localStorage.setItem(cacheKey, JSON.stringify(body));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load recommendations");
      } finally {
        setLoading(false);
      }
    },
    [token, ghLogin, level, cacheKey],
  );

  useEffect(() => {
    void fetchRecos(false);
  }, [fetchRecos]);

  useEffect(() => {
    setActiveLangs(data?.languagesUsed ?? []);
  }, [data?.languagesUsed]);

  function toggleSave(repo: RepoReco) {
    setSaved((prev) => {
      const next = { ...prev };
      if (next[repo.id]) delete next[repo.id];
      else next[repo.id] = repo;
      window.localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      return next;
    });
  }

  function toggleLang(lang: string) {
    setActiveLangs((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    );
  }

  const visible = useMemo(() => {
    const source = showSavedOnly ? Object.values(saved) : data?.recommendations ?? [];
    const filtered = source.filter(
      (r) => !activeLangs.length || activeLangs.includes(r.matchedLanguage) || activeLangs.includes(r.language ?? ""),
    );
    const sorted = [...filtered];
    switch (sort) {
      case "stars":
        sorted.sort((a, b) => b.stars - a.stars);
        break;
      case "fresh":
        sorted.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
        break;
      case "issues":
        sorted.sort((a, b) => b.goodFirstIssues - a.goodFirstIssues);
        break;
      default:
        sorted.sort((a, b) => b.score - a.score);
    }
    return sorted;
  }, [showSavedOnly, saved, data, activeLangs, sort]);

  const savedCount = Object.keys(saved).length;
  const languages = data?.languagesUsed ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-white/10 bg-slate-900/45 backdrop-blur-xl">
        <CardContent className="p-5 sm:p-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-400/30 bg-emerald-500/10">
                <Compass className="h-5 w-5 text-emerald-300" />
              </span>
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
                  Recommended Open-Source Projects
                </h3>
                <p className="text-sm text-slate-400">
                  Matched to your top languages · beginner-friendly issues to start contributing.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-white/10 bg-slate-950/60 p-0.5 text-xs">
                {(["beginner", "any"] as Level[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLevel(lvl)}
                    className={cn(
                      "rounded-md px-3 py-1.5 capitalize transition",
                      level === lvl ? "bg-emerald-500/20 text-emerald-200" : "text-slate-400 hover:text-slate-200",
                    )}
                  >
                    {lvl === "beginner" ? "Beginner" : "Any level"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void fetchRecos(true)}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300 transition hover:border-emerald-400/50 disabled:opacity-50"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                Refresh
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {languages.map((lang) => {
              const on = activeLangs.includes(lang);
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLang(lang)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition",
                    on
                      ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                      : "border-white/10 bg-slate-950/40 text-slate-400 hover:text-slate-200",
                  )}
                >
                  {lang}
                </button>
              );
            })}

            <div className="ml-auto flex items-center gap-2">
              {savedCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowSavedOnly((v) => !v)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition",
                    showSavedOnly
                      ? "border-amber-400/50 bg-amber-500/10 text-amber-200"
                      : "border-white/10 bg-slate-950/60 text-slate-400 hover:text-slate-200",
                  )}
                >
                  <BookmarkCheck className="h-3.5 w-3.5" />
                  Saved ({savedCount})
                </button>
              ) : null}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortMode)}
                className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300 outline-none focus:border-emerald-400/50"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-900">
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Body */}
          <div className="mt-5">
            {error ? (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 text-sm text-rose-100">
                {error}
              </div>
            ) : loading && !data ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <RepoSkeleton key={i} />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div className="grid place-items-center gap-2 rounded-xl border border-white/10 bg-slate-950/40 py-12 text-center">
                <Sparkles className="h-6 w-6 text-slate-500" />
                <p className="text-sm text-slate-400">
                  {showSavedOnly
                    ? "No saved projects yet — bookmark a card to keep it here."
                    : "No matching projects found. Try “Any level” or clear language filters."}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {visible.map((repo) => (
                    <RepoCard
                      key={repo.id}
                      repo={repo}
                      saved={Boolean(saved[repo.id])}
                      onToggleSave={() => toggleSave(repo)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RepoCard({
  repo,
  saved,
  onToggleSave,
}: {
  repo: RepoReco;
  saved: boolean;
  onToggleSave: () => void;
}) {
  const issuesUrl = `${repo.url}/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22`;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25 }}
      className="group flex h-full flex-col rounded-xl border border-white/10 bg-slate-950/40 p-4 transition hover:-translate-y-1 hover:border-emerald-400/40 hover:shadow-[0_14px_34px_rgba(2,6,23,0.5)]"
    >
      <div className="flex items-start justify-between gap-2">
        <a
          href={repo.url}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 flex-1"
        >
          <p className="truncate text-xs text-slate-500">{repo.owner}/</p>
          <p className="flex items-center gap-1 truncate text-base font-semibold text-slate-100 group-hover:text-emerald-200">
            {repo.name}
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition group-hover:opacity-100" />
          </p>
        </a>
        <button
          type="button"
          onClick={onToggleSave}
          aria-label={saved ? "Remove bookmark" : "Save project"}
          className={cn(
            "shrink-0 rounded-lg border p-1.5 transition",
            saved
              ? "border-amber-400/50 bg-amber-500/10 text-amber-300"
              : "border-white/10 text-slate-500 hover:text-slate-200",
          )}
        >
          {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        </button>
      </div>

      <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm text-slate-400">
        {repo.description ?? "No description provided."}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
        {repo.language ? (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: repo.languageColor ?? "#10b981" }}
            />
            {repo.language}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1">
          <Star className="h-3.5 w-3.5 text-amber-300" />
          {compactNumber(repo.stars)}
        </span>
        <span className="inline-flex items-center gap-1">
          <GitFork className="h-3.5 w-3.5" />
          {compactNumber(repo.forks)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {timeAgo(repo.updatedAt)}
        </span>
      </div>

      {/* Match reason */}
      <div className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/5 px-2.5 py-1 text-xs text-emerald-200">
        <Sparkles className="h-3 w-3" />
        Matches your {repo.matchedLanguage} · {repo.goodFirstIssues} good first{" "}
        {repo.goodFirstIssues === 1 ? "issue" : "issues"}
      </div>

      {/* Sample issues */}
      {repo.issues.length ? (
        <ul className="mt-3 space-y-1.5">
          {repo.issues.slice(0, 2).map((issue) => (
            <li key={issue.number}>
              <a
                href={issue.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-2 rounded-lg border border-white/5 bg-slate-900/50 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-emerald-400/30 hover:text-emerald-100"
              >
                <CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span className="line-clamp-1">{issue.title}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-auto flex items-center gap-2 pt-4">
        <a
          href={issuesUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-400/50 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/20"
        >
          Start contributing
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
        {repo.license ? (
          <span className="rounded-lg border border-white/10 px-2.5 py-2 text-[11px] text-slate-400">
            {repo.license}
          </span>
        ) : null}
      </div>
    </motion.div>
  );
}

function RepoSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
      className="h-56 rounded-xl border border-white/10 bg-slate-900/50"
    />
  );
}
