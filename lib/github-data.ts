import {
  flattenContributionCalendar,
  currentTrailingStreak,
  longestStreak,
  totalContributions,
  weekendActivityRatio,
} from "./contributions-stats";

const GITHUB_GRAPHQL = "https://api.github.com/graphql";

export type GithubCoachDataset = {
  login: string;
  calendarDays: Array<{ day: string; count: number; weekday?: number }>;
  nivoCalendar: Array<{ day: string; value: number }>;
  languages: Array<{ id: string; label: string; value: number; color?: string }>;
  topLanguage: string | null;
  recentCommitIso: string[];
  aggregates: {
    totalContributions: number;
    longestStreak: number;
    currentStreakApprox: number;
    weekendContributionShare: number;
  };
};

const QUERY = `#graphql
  query ForgeFluxCoach($from: DateTime!, $to: DateTime!, $reposFirst: Int!) {
    viewer {
      login
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          weeks {
            contributionDays {
              date
              contributionCount
              weekday
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
          defaultBranchRef {
            target {
              ... on Commit {
                history(first: 24) {
                  nodes {
                    committedDate
                  }
                }
              }
            }
          }
          languages(first: 14, orderBy: {field: SIZE, direction: DESC}) {
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

type ContributionWeek = {
  contributionDays: Array<{
    date: string;
    contributionCount: number;
    weekday?: number;
  }>;
};

type LanguageEdge = {
  size: number;
  node: { name?: string | null; color?: string | null };
};

type RepoNode = {
  languages?: { edges?: LanguageEdge[] };
  defaultBranchRef?: {
    target?: {
      history?: { nodes?: Array<{ committedDate?: string | null }> };
    };
  };
};

type GithubViewer = {
  login?: string;
  contributionsCollection?: {
    contributionCalendar?: { weeks?: ContributionWeek[] };
  };
  repositories?: { nodes?: Array<RepoNode | null | undefined> };
};

type GraphQLBody = {
  data?: { viewer?: GithubViewer };
  errors?: Array<{ message: string }>;
};

export async function fetchGithubCoachDataset(accessToken: string): Promise<GithubCoachDataset> {
  const to = new Date();
  const from = new Date();
  from.setFullYear(from.getFullYear() - 1);

  const variables = {
    from: from.toISOString(),
    to: to.toISOString(),
    reposFirst: 35,
  };

  const res = await fetch(GITHUB_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: QUERY, variables }),
    next: { revalidate: 0 },
  });

  const body = (await res.json()) as GraphQLBody;
  if (!res.ok || body.errors?.length) {
    const msg =
      body.errors?.map((e) => e.message).join("; ") ??
      `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }

  const viewer = body.data?.viewer;
  const login = viewer?.login ?? "unknown";
  const weeks = viewer?.contributionsCollection?.contributionCalendar?.weeks ?? [];

  const flat = flattenContributionCalendar(weeks);
  const nivoCalendar = flat.map((d) => ({
    day: d.day,
    value: Math.min(d.count, 12),
  }));

  const langTotals = new Map<string, { value: number; color?: string }>();
  const recentCommitIso: string[] = [];

  const repoNodes = viewer?.repositories?.nodes ?? [];

  for (const repo of repoNodes) {
    if (!repo || typeof repo !== "object") continue;
    const langEdges =
      repo.languages?.edges ??
      ([] as Array<{ size: number; node: { name?: string; color?: string } }>);
    for (const edge of langEdges) {
      const name = edge.node?.name;
      if (!name) continue;
      const prev = langTotals.get(name) ?? { value: 0, color: edge.node?.color ?? undefined };
      prev.value += edge.size ?? 0;
      if (!prev.color && edge.node?.color) prev.color = edge.node.color;
      langTotals.set(name, prev);
    }

    const historyNodes =
      repo.defaultBranchRef?.target?.history?.nodes ??
      ([] as Array<{ committedDate?: string }>);
    for (const c of historyNodes) {
      if (c?.committedDate) recentCommitIso.push(c.committedDate);
    }
  }

  recentCommitIso.sort((a, b) => Date.parse(b) - Date.parse(a));

  const languagesSorted = Array.from(langTotals.entries()).sort(
    (a, b) => b[1].value - a[1].value,
  );
  const languages = languagesSorted.slice(0, 8).map(([name, v], i) => ({
    id: `${name}-${i}`,
    label: name,
    value: v.value,
    color: v.color,
  }));

  const topLanguage = languagesSorted.length ? languagesSorted[0][0] : null;

  return {
    login,
    calendarDays: flat.map(({ day, count, weekday }) => ({ day, count, weekday })),
    nivoCalendar,
    languages,
    topLanguage,
    recentCommitIso: recentCommitIso.slice(0, 80),
    aggregates: {
      totalContributions: totalContributions(flat),
      longestStreak: longestStreak(flat),
      currentStreakApprox: currentTrailingStreak(flat),
      weekendContributionShare: weekendActivityRatio(flat),
    },
  };
}
