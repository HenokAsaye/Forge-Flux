import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import DashboardShell from "@/components/dashboard-shell";
import { authOptions } from "@/lib/auth-options";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  return <DashboardShell />;
}
