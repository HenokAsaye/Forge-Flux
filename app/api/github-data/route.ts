import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { fetchGithubCoachDataset } from "@/lib/github-data";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await fetchGithubCoachDataset(session.accessToken);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "GitHub fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
