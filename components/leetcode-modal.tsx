"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Props = {
  open: boolean;
  onSaved: (username: string) => void;
  onClose: () => void;
};

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

export default function LeetCodeModal({ open, onSaved, onClose }: Props) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function validateAndSave() {
    const normalized = normalizeLeetCodeInput(username);
    if (!normalized) {
      setError("Username required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "validate", lcUser: normalized }),
      });
      const body = (await res.json()) as { valid?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Validation failed");
      if (!body.valid) throw new Error("Username not found on LeetCode.");

      window.localStorage.setItem("forge_leetcode_user", normalized);
      onSaved(normalized);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-lg"
      >
        <Card className="border-white/10 bg-slate-900/55 p-6 backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            One-time setup
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-100">
            Link your LeetCode identity
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            We store this locally in your browser only. No database write.
          </p>

          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="leetcode username or profile URL"
            className="mt-5 w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400/60"
          />
          {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Not now
            </Button>
            <Button onClick={validateAndSave} disabled={loading}>
              {loading ? "Validating..." : "Validate & Continue"}
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
