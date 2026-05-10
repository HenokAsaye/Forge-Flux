import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { fetchGithubCoachDataset } from "@/lib/github-data";

type SignalsRequest =
  | { mode: "validate"; lcUser: string }
  | { mode?: "fetch"; lcUser?: string; ghToken?: string; persona?: string };

type LeetCodeStats = {
  username: string;
  solvedTotal: number;
  solvedByDifficulty: { easy: number; medium: number; hard: number };
  calendar: Array<{ day: string; count: number }>;
  languageProblemCount: Array<{ languageName: string; problemsSolved: number }>;
};

const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";

async function fetchLeetCodeProfile(username: string): Promise<LeetCodeStats | null> {
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
    body: JSON.stringify({ query, variables: { username } }),
    next: { revalidate: 0 },
  });
  const body = (await res.json()) as {
    data?: {
      matchedUser?: {
        username?: string;
        userCalendar?: {
          submissionCalendar?: string;
        };
        submitStatsGlobal?: {
          acSubmissionNum?: Array<{ difficulty?: string; count?: number }>;
        };
        languageProblemCount?: Array<{
          languageName?: string;
          problemsSolved?: number;
        }>;
      } | null;
    };
    errors?: Array<{ message: string }>;
  };
  if (!res.ok || body.errors?.length) {
    throw new Error(body.errors?.[0]?.message ?? "LeetCode fetch failed");
  }

  const user = body.data?.matchedUser;
  if (!user?.username) return null;

  const counts = user.submitStatsGlobal?.acSubmissionNum ?? [];
  const solvedByDifficulty = {
    easy: counts.find((c) => c.difficulty === "Easy")?.count ?? 0,
    medium: counts.find((c) => c.difficulty === "Medium")?.count ?? 0,
    hard: counts.find((c) => c.difficulty === "Hard")?.count ?? 0,
  };
  const solvedTotal = solvedByDifficulty.easy + solvedByDifficulty.medium + solvedByDifficulty.hard;

  const calRaw = user.userCalendar?.submissionCalendar
    ? (JSON.parse(user.userCalendar.submissionCalendar) as Record<string, number>)
    : {};
  const calendar = Object.entries(calRaw)
    .map(([unix, count]) => {
      const ts = Number(unix) * 1000;
      const date = new Date(ts).toISOString().slice(0, 10);
      return { day: date, count: Number(count) };
    })
    .sort((a, b) => (a.day < b.day ? -1 : 1));

  return {
    username: user.username,
    solvedTotal,
    solvedByDifficulty,
    calendar,
    languageProblemCount: (user.languageProblemCount ?? [])
      .filter((l) => Boolean(l.languageName))
      .map((l) => ({
        languageName: l.languageName ?? "Unknown",
        problemsSolved: l.problemsSolved ?? 0,
      })),
  };
}

function getLast30DaySummary(
  githubDays: Array<{ day: string; count: number }>,
  leetcodeDays: Array<{ day: string; count: number }>,
) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const c = cutoff.toISOString().slice(0, 10);

  const gh = githubDays.filter((d) => d.day >= c);
  const lc = leetcodeDays.filter((d) => d.day >= c);
  const ghTotal = gh.reduce((s, d) => s + d.count, 0);
  const lcTotal = lc.reduce((s, d) => s + d.count, 0);
  const ghActive = gh.filter((d) => d.count > 0).length;
  const lcActive = lc.filter((d) => d.count > 0).length;

  return { ghTotal, lcTotal, ghActive, lcActive };
}

async function generateAdvice(input: {
  summary: ReturnType<typeof getLast30DaySummary>;
  topGitHubLanguage: string | null;
  leetCodeHard: number;
  persona: string;
}) {
  const prompt = [
    `Persona: ${input.persona || "Mentor"}`,
    "You are Forge Flux Coach. Return two short sections with headers: Appreciation and Actionable Advice.",
    `Last 30 days GitHub contributions: ${input.summary.ghTotal}`,
    `Last 30 days LeetCode accepted submissions: ${input.summary.lcTotal}`,
    `GitHub active days: ${input.summary.ghActive}`,
    `LeetCode active days: ${input.summary.lcActive}`,
    `LeetCode hard solved total: ${input.leetCodeHard}`,
    `Top GitHub language: ${input.topGitHubLanguage ?? "Unknown"}`,
    "Advice must include one specific pivot for next week.",
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
        max_tokens: 450,
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
  if (!geminiKey) return "Configure OPENAI_API_KEY (or GEMINI_API_KEY) to enable AI coaching.";

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 450 },
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
  const lcUser = payload.lcUser?.trim();

  if (payload.mode === "validate") {
    if (!lcUser) return NextResponse.json({ valid: false });
    const data = await fetchLeetCodeProfile(lcUser);
    return NextResponse.json({ valid: Boolean(data) });
  }

  const accessToken = payload.ghToken || session.accessToken;
  if (!accessToken) {
    return NextResponse.json({ error: "Missing GitHub access token" }, { status: 401 });
  }

  try {
    const [github, leetcode] = await Promise.all([
      fetchGithubCoachDataset(accessToken),
      lcUser ? fetchLeetCodeProfile(lcUser) : Promise.resolve(null),
    ]);

    const summary = getLast30DaySummary(github.calendarDays, leetcode?.calendar ?? []);
    const advice = await generateAdvice({
      summary,
      topGitHubLanguage: github.topLanguage,
      leetCodeHard: leetcode?.solvedByDifficulty.hard ?? 0,
      persona: payload.persona ?? "Mentor",
    });

    const radarData = [
      {
        domain: "GitHub",
        commits: Math.max(summary.ghTotal, 1),
        solves: Math.max(summary.lcTotal / 2, 1),
        consistency: Math.max(summary.ghActive, 1),
      },
      {
        domain: "LeetCode",
        commits: Math.max(summary.ghTotal / 2, 1),
        solves: Math.max(summary.lcTotal, 1),
        consistency: Math.max(summary.lcActive, 1),
      },
    ];

    return NextResponse.json({
      github,
      leetcode:
        leetcode ?? {
          username: null,
          solvedTotal: 0,
          solvedByDifficulty: { easy: 0, medium: 0, hard: 0 },
          calendar: [],
          languageProblemCount: [],
        },
      summary,
      ratio: {
        commits: summary.ghTotal,
        solves: summary.lcTotal,
      },
      radarData,
      advice,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch signals";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
