import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import {
  fetchRecommendations,
  fetchTopLanguages,
  type RecommendationLevel,
} from "@/lib/recommendations";

type RecommendationsRequest = {
  ghToken?: string;
  ghLogin?: string;
  languages?: string[];
  level?: RecommendationLevel;
  minStars?: number;
  limit?: number;
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = (await req.json()) as RecommendationsRequest;
  const accessToken = payload.ghToken || session.accessToken;
  if (!accessToken) {
    return NextResponse.json({ error: "Missing GitHub access token" }, { status: 401 });
  }

  const ghLogin = payload.ghLogin?.trim() || undefined;
  const level: RecommendationLevel = payload.level === "any" ? "any" : "beginner";

  try {
    const languages =
      payload.languages?.length
        ? payload.languages
        : await fetchTopLanguages(accessToken, ghLogin);

    const result = await fetchRecommendations(accessToken, {
      languages,
      level,
      minStars: typeof payload.minStars === "number" ? payload.minStars : undefined,
      limit: typeof payload.limit === "number" ? payload.limit : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch recommendations";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
















