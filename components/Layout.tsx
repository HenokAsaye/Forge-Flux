"use client";

import { BackgroundEngine } from "@/components/landing/background-engine";
import { cn } from "@/lib/utils";
import { useVibe } from "@/components/vibe-provider";

export function Layout({ children }: { children: React.ReactNode }) {
  const { theme } = useVibe();

  return (
    <main
      className={cn(
        "relative min-h-screen overflow-hidden",
        theme === "ghost" ? "text-zinc-900" : "text-slate-100",
      )}
    >
      <BackgroundEngine />
      {children}
    </main>
  );
}
