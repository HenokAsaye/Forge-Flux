"use client";

import { SessionProvider } from "next-auth/react";
import { VibeProvider } from "@/components/vibe-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <VibeProvider>{children}</VibeProvider>
    </SessionProvider>
  );
}
