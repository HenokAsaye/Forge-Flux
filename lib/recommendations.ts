const GITHUB_GRAPHQL = "https://api.github.com/graphql";

export type RepoIssue = {
  title: string;
  url: string;
  number: number;
  comments: number;
  createdAt: string;
};

export type RepoReco = {
  id: string;
  nameWithOwner: string;
  owner: string;
  name: string;
  url: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  languageColor: string | null;
  license: string | null;
  updatedAt: string;
  goodFirstIssues: number;
  helpWantedIssues: number;
  topics: string[];
  issues: RepoIssue[];
  matchedLanguage: string;
  score: number;
};

export type RecommendationLevel = "beginner" | "any";

export type RecommendationResult = {
  recommendations: RepoReco[];
  languagesUsed: string[];
};

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

async function githubGraphQL<T>(
  accessToken: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(GITHUB_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 0 },
  });

  const body = (await res.json()) as GraphQLResponse<T>;
  if (!res.ok || body.errors?.length) {
    throw new Error(body.errors?.map((e) => e.message).join("; ") ?? `${res.status} ${res.statusText}`);
  }
  if (!body.data) throw new Error("Empty GitHub response");
  return body.data;
}

function buildLanguagesQuery(forLogin: boolean) {
  const root = forLogin ? "user(login: $login)" : "viewer";
  const vars = forLogin ? "$login: String!, $reposFirst: Int!" : "$reposFirst: Int!";
  return `
    query ForgeFluxLanguages(${vars}) {
      ${root} {
        repositories(first: $reposFirst, ownerAffiliations: OWNER, orderBy: {field: PUSHED_AT, direction: DESC}) {
          nodes {
            languages(first: 8, orderBy: {field: SIZE, direction: DESC}) {
              edges { size node { name color } }
            }
          }
        }
      }
    }
  `;
}

type LangNode = {
  repositories?: {
    nodes?: Array<{
      languages?: { edges?: Array<{ size?: number; node?: { name?: string; color?: string | null } }> };
    } | null>;
  };
};

export async function fetchTopLanguages(
  accessToken: string,
  login?: string,
  limit = 4,
): Promise<string[]> {
  const forLogin = Boolean(login);
  const variables: Record<string, unknown> = { reposFirst: 40 };
  if (forLogin) variables.login = login;

  const data = await githubGraphQL<{ viewer?: LangNode; user?: LangNode | null }>(
    accessToken,
    buildLanguagesQuery(forLogin),
    variables,
  );

  const node = data.viewer ?? data.user;
  const totals = new Map<string, number>();
  for (const repo of node?.repositories?.nodes ?? []) {
    for (const edge of repo?.languages?.edges ?? []) {
      const name = edge.node?.name;
      if (!name) continue;
      totals.set(name, (totals.get(name) ?? 0) + (edge.size ?? 0));
    }
  }

  return Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);
}


const SEARCH_QUERY = `#graphql
  query ForgeFluxRepoSearch($q: String!, $first: Int!) {
    search(query: $q, type: REPOSITORY, first: $first) {
      nodes {
        ... on Repository {
          id
          nameWithOwner
          name
          url
          description
          stargazerCount
          forkCount
          updatedAt
          isArchived
          isDisabled
          primaryLanguage { name color }
          licenseInfo { spdxId }
          repositoryTopics(first: 6) { nodes { topic { name } } }
          goodFirst: issues(states: OPEN, labels: ["good first issue"]) { totalCount }
          helpWanted: issues(states: OPEN, labels: ["help wanted"]) { totalCount }
          sampleIssues: issues(
            states: OPEN
            labels: ["good first issue"]
            first: 3
            orderBy: {field: UPDATED_AT, direction: DESC}
          ) {
            nodes { title url number comments { totalCount } createdAt }
          }
        }
      }
    }
  }
`;

type SearchRepoNode = {
  id: string;
  nameWithOwner: string;
  name: string;
  url: string;
  description: string | null;
  stargazerCount: number;
  forkCount: number;
  updatedAt: string;
  isArchived: boolean;
  isDisabled: boolean;
  primaryLanguage?: { name?: string; color?: string | null } | null;
  licenseInfo?: { spdxId?: string | null } | null;
  repositoryTopics?: { nodes?: Array<{ topic?: { name?: string } } | null> };
  goodFirst?: { totalCount?: number };
  helpWanted?: { totalCount?: number };
  sampleIssues?: {
    nodes?: Array<{
      title?: string;
      url?: string;
      number?: number;
      comments?: { totalCount?: number };
      createdAt?: string;
    } | null>;
  };
};

function daysSince(iso: string): number {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return 9999;
  return (Date.now() - then) / 86400000;
}

function freshness(iso: string): number {
  const d = daysSince(iso);
  return Math.max(0, 1 - d / 365);
}

function popularitySweetSpot(stars: number): number {
  if (stars <= 0) return 0;
  const ideal = 3000;
  const ratio = stars / ideal;
  return 1 / (1 + Math.pow(Math.log(ratio), 2));
}

function scoreRepo(repo: SearchRepoNode, languageRank: number): number {
  const langMatch = 1 - languageRank * 0.15; 
  const gfi = repo.goodFirst?.totalCount ?? 0;
  const issueSignal = Math.min(1, Math.log10(gfi + 1) / Math.log10(30)); 
  const fresh = freshness(repo.updatedAt);
  const pop = popularitySweetSpot(repo.stargazerCount);

  return Number(
    (0.34 * langMatch + 0.3 * issueSignal + 0.22 * fresh + 0.14 * pop).toFixed(4),
  );
}

function toReco(repo: SearchRepoNode, matchedLanguage: string, languageRank: number): RepoReco {
  return {
    id: repo.id,
    nameWithOwner: repo.nameWithOwner,
    owner: repo.nameWithOwner.split("/")[0] ?? "",
    name: repo.name,
    url: repo.url,
    description: repo.description,
    stars: repo.stargazerCount,
    forks: repo.forkCount,
    language: repo.primaryLanguage?.name ?? null,
    languageColor: repo.primaryLanguage?.color ?? null,
    license: repo.licenseInfo?.spdxId ?? null,
    updatedAt: repo.updatedAt,
    goodFirstIssues: repo.goodFirst?.totalCount ?? 0,
    helpWantedIssues: repo.helpWanted?.totalCount ?? 0,
    topics: (repo.repositoryTopics?.nodes ?? [])
      .map((n) => n?.topic?.name)
      .filter((n): n is string => Boolean(n)),
    issues: (repo.sampleIssues?.nodes ?? [])
      .filter((n): n is NonNullable<typeof n> => Boolean(n?.url))
      .map((n) => ({
        title: n.title ?? "Untitled issue",
        url: n.url ?? "",
        number: n.number ?? 0,
        comments: n.comments?.totalCount ?? 0,
        createdAt: n.createdAt ?? new Date(0).toISOString(),
      })),
    matchedLanguage,
    score: scoreRepo(repo, languageRank),
  };
}

function buildSearchQualifier(
  language: string,
  level: RecommendationLevel,
  minStars: number,
): string {
  const parts = [
    `language:"${language}"`,
    "archived:false",
    "is:public",
    `stars:>=${minStars}`,
    "pushed:>2024-06-01",
    "sort:updated",
  ];

  parts.push(level === "beginner" ? "good-first-issues:>=3" : "good-first-issues:>=1");
  return parts.join(" ");
}

export async function fetchRecommendations(
  accessToken: string,
  opts: {
    languages: string[];
    level?: RecommendationLevel;
    minStars?: number;
    limit?: number;
  },
): Promise<RecommendationResult> {
  const level = opts.level ?? "beginner";
  const minStars = opts.minStars ?? 50;
  const limit = opts.limit ?? 12;
  const languages = opts.languages.slice(0, 3);
  if (!languages.length) return { recommendations: [], languagesUsed: [] };

  const perLanguage = Math.max(6, Math.ceil((limit * 1.6) / languages.length));

  const settled = await Promise.all(
    languages.map(async (language, rank) => {
      try {
        let data = await githubGraphQL<{ search?: { nodes?: SearchRepoNode[] } }>(
          accessToken,
          SEARCH_QUERY,
          { q: buildSearchQualifier(language, level, minStars), first: perLanguage },
        );
        let nodes = (data.search?.nodes ?? []).filter((n) => n && n.id);

        // Fallback: broaden if a language returned nothing (e.g. niche stack).
        if (!nodes.length) {
          data = await githubGraphQL<{ search?: { nodes?: SearchRepoNode[] } }>(
            accessToken,
            SEARCH_QUERY,
            { q: buildSearchQualifier(language, "any", 10), first: perLanguage },
          );
          nodes = (data.search?.nodes ?? []).filter((n) => n && n.id);
        }

        return nodes
          .filter((n) => !n.isArchived && !n.isDisabled)
          .map((n) => toReco(n, language, rank));
      } catch {
        return [] as RepoReco[];
      }
    }),
  );

  const byId = new Map<string, RepoReco>();
  for (const reco of settled.flat()) {
    const existing = byId.get(reco.id);
    if (!existing || reco.score > existing.score) byId.set(reco.id, reco);
  }

  const recommendations = Array.from(byId.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return { recommendations, languagesUsed: languages };
}
