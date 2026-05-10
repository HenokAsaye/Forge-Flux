import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

const GITHUB_GRAPHQL = "https://api.github.com/graphql";
const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";

type SignalsRequest =
  | { mode: "validate"; lcUser: string }
  | { mode?: "fetch"; lcUser?: string; ghToken?: string; persona?: string; year?: number };

type GithubYearData = {
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

type LeetCodeYearData = {
  username: string | null;
  calendar: Array<{ day: string; count: number }>;
  solvedByDifficulty: { easy: number; medium: number; hard: number };
  acceptedTotal: number;
  languageProblemCount: Array<{ languageName: string; problemsSolved: number }>;
};

function yearWindow(year: number) {
  const from = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
  const to = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
  return { from, to };
}

function parseDay(day: string) {
  return new Date(`${day}T12:00:00Z`).getTime();
}

function longestStreak(days: Array<{ day: string; count: number }>) {
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of days) {
    const ts = parseDay(d.day);
    if (d.count <= 0) {
      run = 0;
      prev = null;
      continue;
    }
    if (prev !== null && ts - prev === 86400000) run += 1;
    else run = 1;
    prev = ts;
    best = Math.max(best, run);
  }
  return best;
}

async function fetchGithubYearData(accessToken: string, year: number): Promise<GithubYearData> {
  const { from, to } = yearWindow(year);
  const query = `#graphql
    query ForgeFluxSignals($from: DateTime!, $to: DateTime!, $reposFirst: Int!) {
      viewer {
        login
        createdAt
        contributionsCollection(from: $from, to: $to) {
          totalCommitContributions
          totalPullRequestContributions
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
        repositories(
          first: $reposFirst
          ownerAffiliations: OWNER
          privacy: PUBLIC
          orderBy: {field: PUSHED_AT, direction: DESC}
        ) {
          nodes {
            languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
              edges {
                size
                node {
                  name
                  color
                }
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch(GITHUB_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: { from: from.toISOString(), to: to.toISOString(), reposFirst: 35 },
    }),
    next: { revalidate: 0 },
  });

  const body = (await res.json()) as {
    data?: {
      viewer?: {
        login?: string;
        createdAt?: string;
        contributionsCollection?: {
          totalCommitContributions?: number;
          totalPullRequestContributions?: number;
          contributionCalendar?: {
            totalContributions?: number;
            weeks?: Array<{
              contributionDays?: Array<{ date?: string; contributionCount?: number }>;
            }>;
          };
        };
        repositories?: {
          nodes?: Array<{
            languages?: {
              edges?: Array<{
                size?: number;
                node?: { name?: string; color?: string | null };
              }>;
            };
          } | null>;
        };
      };
    };
    errors?: Array<{ message: string }>;
  };

  if (!res.ok || body.errors?.length) {
    throw new Error(body.errors?.[0]?.message ?? "GitHub fetch failed");
  }

  const viewer = body.data?.viewer;
  if (!viewer?.login) throw new Error("GitHub viewer not available");

  const days =
    viewer.contributionsCollection?.contributionCalendar?.weeks
      ?.flatMap((w) => w.contributionDays ?? [])
      .filter((d): d is { date: string; contributionCount: number } => Boolean(d.date))
      .map((d) => ({ day: d.date, count: d.contributionCount ?? 0 }))
      .sort((a, b) => (a.day < b.day ? -1 : 1)) ?? [];

  const langMap = new Map<string, { value: number; color?: string }>();
  const repoNodes = viewer.repositories?.nodes ?? [];
  for (const r of repoNodes) {
    const edges = r?.languages?.edges ?? [];
    for (const e of edges) {
      const name = e.node?.name;
      if (!name) continue;
      const prev = langMap.get(name) ?? { value: 0, color: e.node?.color ?? undefined };
      prev.value += e.size ?? 0;
      langMap.set(name, prev);
    }
  }
  const langSorted = Array.from(langMap.entries()).sort((a, b) => b[1].value - a[1].value);
  const languages = langSorted.slice(0, 8).map(([label, v]) => ({ label, value: v.value, color: v.color }));

  return {
    login: viewer.login,
    createdAt: viewer.createdAt ?? new Date().toISOString(),
    calendarDays: days,
    languages,
    topLanguage: langSorted[0]?.[0] ?? null,
    totals: {
      commits: viewer.contributionsCollection?.totalCommitContributions ?? 0,
      pullRequests: viewer.contributionsCollection?.totalPullRequestContributions ?? 0,
      contributions: viewer.contributionsCollection?.contributionCalendar?.totalContributions ?? 0,
      longestStreak: longestStreak(days),
    },
  };
}

function normalizeLeetCodeInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.includes("leetcode.com")) {
    try {
      const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
      const parts = url.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) => p === "u");
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
      return parts[parts.length - 1] ?? "";
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

async function fetchLeetCodeYearData(username: string, year: number): Promise<LeetCodeYearData | null> {
  const normalized = normalizeLeetCodeInput(username);
  if (!normalized) return null;

  const query = `
    query getLeetCodeSignals($username: String!) {
      matchedUser(username: $username) {
        username
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }
        languageProblemCount {
          languageName
          problemsSolved
        }
        userCalendar {
          submissionCalendar
        }
      }
    }
  `;

  const res = await fetch(LEETCODE_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { username: normalized } }),
    next: { revalidate: 0 },
  });
  const body = (await res.json()) as {
    data?: {
      matchedUser?: {
        username?: string;
        userCalendar?: { submissionCalendar?: string };
        submitStatsGlobal?: {
          acSubmissionNum?: Array<{ difficulty?: string; count?: number }>;
        };
        languageProblemCount?: Array<{ languageName?: string; problemsSolved?: number }>;
      } | null;
    };
    errors?: Array<{ message: string }>;
  };

  if (!res.ok || body.errors?.length) {
    throw new Error(body.errors?.[0]?.message ?? "LeetCode fetch failed");
  }

  const user = body.data?.matchedUser;
  if (!user?.username) return null;

  const { from, to } = yearWindow(year);
  const fromTs = Math.floor(from.getTime() / 1000);
  const toTs = Math.floor(to.getTime() / 1000);

  const calRaw = user.userCalendar?.submissionCalendar
    ? (JSON.parse(user.userCalendar.submissionCalendar) as Record<string, number>)
    : {};
  const calendar = Object.entries(calRaw)
    .map(([unix, count]) => ({ unix: Number(unix), count: Number(count) }))
    .filter((d) => d.unix >= fromTs && d.unix <= toTs)
    .map((d) => ({ day: new Date(d.unix * 1000).toISOString().slice(0, 10), count: d.count }))
    .sort((a, b) => (a.day < b.day ? -1 : 1));

  const byDiff = user.submitStatsGlobal?.acSubmissionNum ?? [];
  return {
    username: user.username,
    calendar,
    solvedByDifficulty: {
      easy: byDiff.find((x) => x.difficulty === "Easy")?.count ?? 0,
      medium: byDiff.find((x) => x.difficulty === "Medium")?.count ?? 0,
      hard: byDiff.find((x) => x.difficulty === "Hard")?.count ?? 0,
    },
    acceptedTotal: calendar.reduce((s, d) => s + d.count, 0),
    languageProblemCount: (user.languageProblemCount ?? [])
      .filter((l) => Boolean(l.languageName))
      .map((l) => ({
        languageName: l.languageName ?? "Unknown",
        problemsSolved: l.problemsSolved ?? 0,
      })),
  };
}

function monthSeries(year: number, gh: Array<{ day: string; count: number }>, lc: Array<{ day: string; count: number }>) {
  const series = Array.from({ length: 12 }).map((_, i) => ({
    month: new Date(Date.UTC(year, i, 1)).toLocaleString("en-US", { month: "short" }),
    github: 0,
    leetcode: 0,
  }));
  for (const d of gh) {
    const m = new Date(`${d.day}T12:00:00Z`).getUTCMonth();
    series[m].github += d.count;
  }
  for (const d of lc) {
    const m = new Date(`${d.day}T12:00:00Z`).getUTCMonth();
    series[m].leetcode += d.count;
  }
  return series;
}

function activeDayRatio(days: Array<{ day: string; count: number }>, year: number) {
  const isLeap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const totalDays = isLeap ? 366 : 365;
  const active = days.filter((d) => d.count > 0).length;
  return Math.round((active / totalDays) * 100);
}

async function generateAdvice(summary: {
  totalCommits: number;
  totalSolves: number;
  topLanguage: string | null;
  longestStreak: number;
  difficultyRatio: { easy: number; medium: number; hard: number };
  currentYear: number;
}) {
  const jsonSummary = JSON.stringify(summary, null, 2);
  const prompt = [
    `Act as a Senior Tech Lead. Analyze this dev's activity for ${summary.currentYear}.`,
    "Give 1 punchy sentence of appreciation for their consistency.",
    "Then give 2 specific, technical recommendations.",
    "Structured summary:",
    jsonSummary,
  ].join("\n");

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 420,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(body.error?.message ?? "OpenAI request failed");
    return body.choices?.[0]?.message?.content?.trim() ?? "No advice generated.";
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return "Configure OPENAI_API_KEY or GEMINI_API_KEY to enable AI coaching.";
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 420 },
      }),
    },
  );
  const body = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() || "No advice generated.";
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = (await req.json()) as SignalsRequest;

  if (payload.mode === "validate") {
    const lcUser = normalizeLeetCodeInput(payload.lcUser);
    if (!lcUser) return NextResponse.json({ valid: false });
    const year = new Date().getUTCFullYear();
    const data = await fetchLeetCodeYearData(lcUser, year);
    return NextResponse.json({ valid: Boolean(data), normalized: lcUser });
  }

  const selectedYear = Number(payload.year) || new Date().getUTCFullYear();
  const accessToken = payload.ghToken || session.accessToken;
  if (!accessToken) return NextResponse.json({ error: "Missing GitHub access token" }, { status: 401 });

  try {
    const github = await fetchGithubYearData(accessToken, selectedYear);
    const lcUser = payload.lcUser ? normalizeLeetCodeInput(payload.lcUser) : "";
    const leetcode = lcUser
      ? await fetchLeetCodeYearData(lcUser, selectedYear)
      : null;

    const currentYear = new Date().getUTCFullYear();
    const startYear = new Date(github.createdAt).getUTCFullYear();
    const availableYears = Array.from({ length: currentYear - startYear + 1 }, (_, i) => startYear + i);

    const lcSafe: LeetCodeYearData = leetcode ?? {
      username: null,
      calendar: [],
      solvedByDifficulty: { easy: 0, medium: 0, hard: 0 },
      acceptedTotal: 0,
      languageProblemCount: [],
    };

    const summary = {
      totalCommits: github.totals.commits + github.totals.pullRequests,
      totalSolves: lcSafe.acceptedTotal,
      topLanguage: github.topLanguage,
      longestStreak: github.totals.longestStreak,
      difficultyRatio: lcSafe.solvedByDifficulty,
      currentYear: selectedYear,
    };

    const advice = await generateAdvice(summary);
    const monthly = monthSeries(selectedYear, github.calendarDays, lcSafe.calendar);

    const activeGh = github.calendarDays.filter((d) => d.count > 0).length;
    const weekend = github.calendarDays
      .filter((d) => [0, 6].includes(new Date(`${d.day}T12:00:00Z`).getUTCDay()))
      .reduce((s, d) => s + d.count, 0);
    const weekday = github.calendarDays
      .filter((d) => ![0, 6].includes(new Date(`${d.day}T12:00:00Z`).getUTCDay()))
      .reduce((s, d) => s + d.count, 0);

    return NextResponse.json({
      year: selectedYear,
      availableYears,
      github,
      leetcode: lcSafe,
      metrics: {
        intensityScore: activeDayRatio(github.calendarDays, selectedYear),
        logicAcRate: lcSafe.acceptedTotal,
        buildVelocity: summary.totalCommits,
        primaryStack: github.topLanguage ?? "Unknown",
        weekendWarrior: weekend >= weekday,
        deepWorkIndex: activeGh ? Math.round((summary.totalCommits / activeGh) * 10) / 10 : 0,
      },
      ratio: {
        commits: summary.totalCommits,
        solves: summary.totalSolves,
      },
      charts: {
        monthly,
        radar: [
          { metric: "Problem Solving", value: Math.max(summary.totalSolves, 1) },
          { metric: "Building", value: Math.max(summary.totalCommits, 1) },
          { metric: "Documentation", value: Math.max(Math.round(summary.totalCommits * 0.22), 1) },
          { metric: "Reviewing", value: Math.max(github.totals.pullRequests, 1) },
        ],
        difficulty: [
          { name: "Easy", value: lcSafe.solvedByDifficulty.easy },
          { name: "Medium", value: lcSafe.solvedByDifficulty.medium },
          { name: "Hard", value: lcSafe.solvedByDifficulty.hard },
        ],
      },
      advice,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch signals";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
