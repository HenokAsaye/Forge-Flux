import { NextResponse } from "next/server";
import type { CommitRhythmSummary } from "@/lib/contributions-stats";

type AdviceRequest = {
  goal: string;
  role: string;
  persona: string;
  timezone: string;
  github: {
    login: string;
    aggregates: {
      totalContributions: number;
      longestStreak: number;
      currentStreakApprox: number;
      weekendContributionShare: number;
    };
    topLanguage: string | null;
    languages: Array<{ label: string; value: number }>;
    rhythm: CommitRhythmSummary;
  };
};

const personaVoice: Record<string, string> = {
  supportive:
    "You are a supportive engineering mentor: kind, steady, celebrate small wins, and suggest one concrete next step.",
  blunt:
    "You are a direct staff+ engineer: crisp, no platitudes, call out gaps, prioritize impact, occasional dry humor.",
  data:
    "You are an analytics-minded coach: quantify patterns, compare to baselines cautiously, avoid over-claiming.",
};

function buildUserMessage(body: AdviceRequest): string {
  const voice = personaVoice[body.persona] ?? personaVoice.supportive;
  const langs = body.github.languages
    .slice(0, 5)
    .map((l) => `${l.label}: ${Math.round(l.value)} bytes est.`)
    .join("; ");

  return [
    voice,
    "",
    `User local timezone: ${body.timezone}`,
    `Goal / current focus: ${body.goal}`,
    `Self-described role: ${body.role}`,
    "",
    `GitHub login (context only): ${body.github.login}`,
    `Contribution totals (approx, public activity): ${body.github.aggregates.totalContributions} in last ~year window returned by GitHub.`,
    `Longest streak (days with ≥1 contribution): ${body.github.aggregates.longestStreak}`,
    `Trailing streak from latest calendar day in payload: ${body.github.aggregates.currentStreakApprox}`,
    `Weekend share of contributions (approx): ${(body.github.aggregates.weekendContributionShare * 100).toFixed(0)}%`,
    `Top language (public repos sampled): ${body.github.topLanguage ?? "unknown"}`,
    `Language mix (sizes are GitHub byte estimates, not authoritative): ${langs || "n/a"}`,
    "",
    "Commit timing sample (recent public default-branch commits, may be incomplete):",
    `- sampleSize: ${body.github.rhythm.sampleSize}`,
    `- lateNightLocal (0–5:59): ${body.github.rhythm.lateNightCount} commits (${(body.github.rhythm.latenightFrac * 100).toFixed(0)}%)`,
    `- peak local hour (0–23): ${body.github.rhythm.peakLocalHour ?? "n/a"}`,
    `- commits between 23:00–06:00 local: ${(body.github.rhythm.quietHoursFrac * 100).toFixed(0)}%`,
    "",
    "Instructions: Write friendly coaching in second person.",
    "- 2 short sections: Recognition (tie to streaks/habits) and Focus (specific to their goal).",
    "- If rhythm suggests possible sleep debt, gently mention wellbeing without moralizing.",
    "- Do not pretend you saw private repos.",
    "- Do not hallucinate repos or employers.",
  ].join("\n");
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server missing GEMINI_API_KEY" },
      { status: 500 },
    );
  }

  let body: AdviceRequest;
  try {
    body = (await req.json()) as AdviceRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.goal?.trim() || body.goal.trim().length < 3) {
    return NextResponse.json({ error: "Goal required" }, { status: 400 });
  }

  const modelEnv = process.env.GEMINI_MODEL?.trim();
  const model = modelEnv && modelEnv.length > 0 ? modelEnv : "gemini-1.5-flash";

  const system =
    "You are Forge Flux Coach, a concise engineering mentor grounded strictly in supplied GitHub-derived numbers. If data is thin, say so briefly and still be helpful.";

  const userMessage = buildUserMessage(body);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${system}\n\n${userMessage}` }],
        },
      ],
      generationConfig: {
        temperature: 0.75,
        maxOutputTokens: 650,
      },
    }),
    },
  );

  const payload = (await res.json()) as {
    error?: { message?: string };
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  if (!res.ok) {
    return NextResponse.json(
      { error: payload.error?.message ?? "Gemini request failed" },
      { status: 502 },
    );
  }

  const advice = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!advice) {
    return NextResponse.json({ error: "Empty model response" }, { status: 502 });
  }

  return NextResponse.json({ advice });
}
