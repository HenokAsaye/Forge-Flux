import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

const GITHUB_GRAPHQL = "https://api.github.com/graphql";
const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";

type YearParam = number | "all";

type SignalsRequest =
  | { mode: "validate"; lcUser: string }
  | {
      mode?: "fetch";
      lcUser?: string;
      ghToken?: string;
      ghLogin?: string;
      persona?: string;
      year?: number | "all";
    };

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

function dayYear(day: string) {
  return new Date(`${day}T12:00:00Z`).getUTCFullYear();
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

function buildGithubQuery(forLogin: boolean, includeRepos: boolean) {
  const vars = ["$from: DateTime!", "$to: DateTime!"];
  if (includeRepos) vars.push("$reposFirst: Int!");
  if (forLogin) vars.push("$login: String!");
  const root = forLogin ? "user(login: $login)" : "viewer";
  const reposBlock = includeRepos
    ? `repositories(first: $reposFirst, ownerAffiliations: OWNER, privacy: PUBLIC, orderBy: {field: PUSHED_AT, direction: DESC}) {
          nodes { languages(first: 10, orderBy: {field: SIZE, direction: DESC}) { edges { size node { name color } } } }
        }`
    : "";
  return `
    query ForgeFluxSignals(${vars.join(", ")}) {
      ${root} {
        login
        createdAt
        contributionsCollection(from: $from, to: $to) {
          totalCommitContributions
          totalPullRequestContributions
          contributionCalendar {
            totalContributions
            weeks { contributionDays { date contributionCount } }
          }
        }
        ${reposBlock}
      }
    }
  `;
}

async function fetchGithubYearData(
  accessToken: string,
  year: number,
  login?: string,
  includeRepos = true,
): Promise<GithubYearData> {
  const { from, to } = yearWindow(year);
  const forLogin = Boolean(login);
  const variables: Record<string, unknown> = { from: from.toISOString(), to: to.toISOString() };
  if (includeRepos) variables.reposFirst = 35;
  if (forLogin) variables.login = login;

  const res = await fetch(GITHUB_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: buildGithubQuery(forLogin, includeRepos), variables }),
    next: { revalidate: 0 },
  });

  const body = (await res.json()) as {
    data?: {
      viewer?: GithubNode;
      user?: GithubNode | null;
    };
    errors?: Array<{ message: string }>;
  };

  if (!res.ok || body.errors?.length) {
    throw new Error(body.errors?.[0]?.message ?? "GitHub fetch failed");
  }

  const node = body.data?.viewer ?? body.data?.user;
  if (!node?.login) {
    throw new Error(forLogin ? `GitHub user "${login}" not found` : "GitHub viewer not available");
  }

  const days =
    node.contributionsCollection?.contributionCalendar?.weeks
      ?.flatMap((w) => w.contributionDays ?? [])
      .filter((d): d is { date: string; contributionCount: number } => Boolean(d.date))
      .map((d) => ({ day: d.date, count: d.contributionCount ?? 0 }))
      .sort((a, b) => (a.day < b.day ? -1 : 1)) ?? [];

  const langMap = new Map<string, { value: number; color?: string }>();
  for (const r of node.repositories?.nodes ?? []) {
    for (const e of r?.languages?.edges ?? []) {
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
    login: node.login,
    createdAt: node.createdAt ?? new Date().toISOString(),
    calendarDays: days,
    languages,
    topLanguage: langSorted[0]?.[0] ?? null,
    totals: {
      commits: node.contributionsCollection?.totalCommitContributions ?? 0,
      pullRequests: node.contributionsCollection?.totalPullRequestContributions ?? 0,
      contributions: node.contributionsCollection?.contributionCalendar?.totalContributions ?? 0,
      longestStreak: longestStreak(days),
    },
  };
}

type GithubNode = {
  login?: string;
  createdAt?: string;
  contributionsCollection?: {
    totalCommitContributions?: number;
    totalPullRequestContributions?: number;
    contributionCalendar?: {
      totalContributions?: number;
      weeks?: Array<{ contributionDays?: Array<{ date?: string; contributionCount?: number }> }>;
    };
  };
  repositories?: {
    nodes?: Array<{
      languages?: { edges?: Array<{ size?: number; node?: { name?: string; color?: string | null } }> };
    } | null>;
  };
};

async function fetchGithubAllTime(accessToken: string, login?: string): Promise<GithubYearData> {
  const now = new Date().getUTCFullYear();
  const base = await fetchGithubYearData(accessToken, now, login, true);
  const startYear = new Date(base.createdAt).getUTCFullYear();

  const dayMap = new Map(base.calendarDays.map((d) => [d.day, d.count]));
  let commits = base.totals.commits;
  let pullRequests = base.totals.pullRequests;
  let contributions = base.totals.contributions;

  for (let y = startYear; y < now; y += 1) {
    const yd = await fetchGithubYearData(accessToken, y, login, false);
    for (const d of yd.calendarDays) dayMap.set(d.day, (dayMap.get(d.day) ?? 0) + d.count);
    commits += yd.totals.commits;
    pullRequests += yd.totals.pullRequests;
    contributions += yd.totals.contributions;
  }

  const calendarDays = Array.from(dayMap.entries())
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => (a.day < b.day ? -1 : 1));

  return {
    ...base,
    calendarDays,
    totals: { commits, pullRequests, contributions, longestStreak: longestStreak(calendarDays) },
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

async function fetchLeetCodeYearData(username: string, year: YearParam): Promise<LeetCodeYearData | null> {
  const normalized = normalizeLeetCodeInput(username);
  if (!normalized) return null;

  const query = `
    query getLeetCodeSignals($username: String!) {
      matchedUser(username: $username) {
        username
        submitStatsGlobal { acSubmissionNum { difficulty count } }
        languageProblemCount { languageName problemsSolved }
        userCalendar { submissionCalendar }
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
        submitStatsGlobal?: { acSubmissionNum?: Array<{ difficulty?: string; count?: number }> };
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

  const calRaw = user.userCalendar?.submissionCalendar
    ? (JSON.parse(user.userCalendar.submissionCalendar) as Record<string, number>)
    : {};

  let entries = Object.entries(calRaw).map(([unix, count]) => ({ unix: Number(unix), count: Number(count) }));
  if (year !== "all") {
    const { from, to } = yearWindow(year);
    const fromTs = Math.floor(from.getTime() / 1000);
    const toTs = Math.floor(to.getTime() / 1000);
    entries = entries.filter((d) => d.unix >= fromTs && d.unix <= toTs);
  }
  const calendar = entries
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
      .map((l) => ({ languageName: l.languageName ?? "Unknown", problemsSolved: l.problemsSolved ?? 0 })),
  };
}

function buildSeries(
  year: YearParam,
  gh: Array<{ day: string; count: number }>,
  lc: Array<{ day: string; count: number }>,
) {
  if (year === "all") {
    const years = new Set<number>();
    gh.forEach((d) => years.add(dayYear(d.day)));
    lc.forEach((d) => years.add(dayYear(d.day)));
    return Array.from(years)
      .sort((a, b) => a - b)
      .map((y) => ({
        month: String(y),
        github: gh.filter((d) => dayYear(d.day) === y).reduce((s, d) => s + d.count, 0),
        leetcode: lc.filter((d) => dayYear(d.day) === y).reduce((s, d) => s + d.count, 0),
      }));
  }

  const series = Array.from({ length: 12 }).map((_, i) => ({
    month: new Date(Date.UTC(year, i, 1)).toLocaleString("en-US", { month: "short" }),
    github: 0,
    leetcode: 0,
  }));
  for (const d of gh) series[new Date(`${d.day}T12:00:00Z`).getUTCMonth()].github += d.count;
  for (const d of lc) series[new Date(`${d.day}T12:00:00Z`).getUTCMonth()].leetcode += d.count;
  return series;
}

function intensityScore(days: Array<{ day: string; count: number }>, year: YearParam) {
  const active = days.filter((d) => d.count > 0).length;
  if (year === "all") {
    if (!days.length) return 0;
    const span = Math.max(1, Math.round((parseDay(days[days.length - 1].day) - parseDay(days[0].day)) / 86400000) + 1);
    return Math.round((active / span) * 100);
  }
  const isLeap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return Math.round((active / (isLeap ? 366 : 365)) * 100);
}

type AdviceSummary = {
  totalCommits: number;
  totalSolves: number;
  topLanguage: string | null;
  longestStreak: number;
  intensityScore: number;
  difficultyRatio: { easy: number; medium: number; hard: number };
  period: string;
};

function localAdvice(s: AdviceSummary): string {
  const recognition =
    s.longestStreak >= 14
      ? `Outstanding consistency this ${s.period} — a ${s.longestStreak}-day streak shows real discipline.`
      : s.longestStreak >= 5
        ? `Solid rhythm this ${s.period}: your best streak reached ${s.longestStreak} days and your activity is staying ~${s.intensityScore}% of days.`
        : `You're building momentum this ${s.period} with ${s.totalCommits} contributions logged — the habit is forming.`;

  const totalSolves = s.difficultyRatio.easy + s.difficultyRatio.medium + s.difficultyRatio.hard;
  const focusLogic = (() => {
    if (totalSolves === 0) {
      return "Focus 1: Link a LeetCode handle and aim for 3 problems a week — even small algorithm reps sharpen the building you already do.";
    }
    if (s.difficultyRatio.hard / Math.max(1, totalSolves) < 0.15) {
      return `Focus 1: You've cleared ${s.difficultyRatio.easy + s.difficultyRatio.medium} easy/medium problems — start mixing in 1–2 Hard problems weekly to push past the comfort zone.`;
    }
    return `Focus 1: Strong difficulty spread (${s.difficultyRatio.hard} hard solved). Keep a spaced-repetition list of the ones that fought back.`;
  })();

  const focusBuild =
    s.intensityScore < 40
      ? `Focus 2: Activity sits near ${s.intensityScore}% of days. Try a fixed 30-minute daily slot in ${s.topLanguage ?? "your main stack"} to lift consistency.`
      : `Focus 2: You're shipping steadily in ${s.topLanguage ?? "your primary stack"}. Channel that into one larger project so the ${s.totalCommits} contributions compound into something portfolio-worthy.`;

  return [recognition, focusLogic, focusBuild].join("\n\n");
}

async function generateAdvice(summary: AdviceSummary): Promise<string> {
  const prompt = [
    `Act as a Senior Tech Lead. Analyze this dev's activity for ${summary.period}.`,
    "Give 1 punchy sentence of appreciation for their consistency.",
    "Then give 2 specific, technical recommendations.",
    "Structured summary:",
    JSON.stringify(summary, null, 2),
  ].join("\n");

  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, temperature: 0.7, max_tokens: 420, messages: [{ role: "user", content: prompt }] }),
      });
      const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
      if (!res.ok) throw new Error(body.error?.message ?? "OpenAI request failed");
      const text = body.choices?.[0]?.message?.content?.trim();
      if (text) return text;
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
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
      const body = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
      if (text) return text;
    }
  } catch {
    return localAdvice(summary);
  }

  return localAdvice(summary);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = (await req.json()) as SignalsRequest;

  if (payload.mode === "validate") {
    const lcUser = normalizeLeetCodeInput(payload.lcUser);
    if (!lcUser) return NextResponse.json({ valid: false });
    const data = await fetchLeetCodeYearData(lcUser, new Date().getUTCFullYear());
    return NextResponse.json({ valid: Boolean(data), normalized: lcUser });
  }

  const selectedYear: YearParam = payload.year === "all" ? "all" : Number(payload.year) || new Date().getUTCFullYear();
  const ghLogin = payload.ghLogin?.trim() || undefined;
  const accessToken = payload.ghToken || session.accessToken;
  if (!accessToken) return NextResponse.json({ error: "Missing GitHub access token" }, { status: 401 });

  try {
    const github =
      selectedYear === "all"
        ? await fetchGithubAllTime(accessToken, ghLogin)
        : await fetchGithubYearData(accessToken, selectedYear, ghLogin);

    const lcUser = payload.lcUser ? normalizeLeetCodeInput(payload.lcUser) : "";
    const leetcode = lcUser ? await fetchLeetCodeYearData(lcUser, selectedYear) : null;

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

    const totalCommits = github.totals.commits + github.totals.pullRequests;
    const period = selectedYear === "all" ? "all time" : String(selectedYear);
    const intensity = intensityScore(github.calendarDays, selectedYear);

    const summary: AdviceSummary = {
      totalCommits,
      totalSolves: lcSafe.acceptedTotal,
      topLanguage: github.topLanguage,
      longestStreak: github.totals.longestStreak,
      intensityScore: intensity,
      difficultyRatio: lcSafe.solvedByDifficulty,
      period,
    };

    const advice = await generateAdvice(summary);
    const monthly = buildSeries(selectedYear, github.calendarDays, lcSafe.calendar);

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
        intensityScore: intensity,
        logicAcRate: lcSafe.acceptedTotal,
        buildVelocity: totalCommits,
        primaryStack: github.topLanguage ?? "Unknown",
        weekendWarrior: weekend >= weekday,
        deepWorkIndex: activeGh ? Math.round((totalCommits / activeGh) * 10) / 10 : 0,
      },
      ratio: { commits: totalCommits, solves: lcSafe.acceptedTotal },
      charts: {
        monthly,
        radar: [
          { metric: "Problem Solving", value: Math.max(lcSafe.acceptedTotal, 1) },
          { metric: "Building", value: Math.max(totalCommits, 1) },
          { metric: "Documentation", value: Math.max(Math.round(totalCommits * 0.22), 1) },
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
