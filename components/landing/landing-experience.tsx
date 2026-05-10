"use client";

import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  Bot,
  BrainCircuit,
  Database,
  Gauge,
  GitBranch,
  ServerCog,
  Sparkles,
  User,
  Workflow,
  X,
} from "lucide-react";
import { signIn } from "next-auth/react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Heatmap } from "@/components/Heatmap";
import { Layout } from "@/components/Layout";
import { Navbar } from "@/components/Navbar";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const words = ["Consistency", "Logic", "Future", "Workflow"];
const reveal: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay, duration: 0.5, ease: "easeOut" },
  }),
};

export function LandingExperience() {
  const [wordIndex, setWordIndex] = useState(0);
  const [typedCount, setTypedCount] = useState(0);
  const terminalText =
    "AI Coach > Your signal quality is elite this week. Ship one scoped feature and keep two logic reps daily.";

  useEffect(() => {
    const id = setInterval(() => setWordIndex((v) => (v + 1) % words.length), 2100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setTypedCount((v) => (v >= terminalText.length ? v : v + 1));
    }, 24);
    return () => clearInterval(id);
  }, [terminalText.length]);

  return (
    <Layout>
      <Navbar />

      <section className="mx-auto max-w-6xl px-4 pb-10 pt-32 sm:px-6">
        <motion.div custom={0} initial="hidden" animate="show" variants={reveal} className="text-center">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-6xl">
            <span className="bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">
              Forge your{" "}
            </span>
            <AnimatePresence mode="wait">
              <motion.span
                key={words[wordIndex]}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24 }}
                className="inline-block bg-gradient-to-r from-emerald-300 via-cyan-300 to-violet-300 bg-clip-text text-transparent"
              >
                {words[wordIndex]}
              </motion.span>
            </AnimatePresence>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-400">
            Premium stateless developer coaching: secure signal extraction, AI synthesis,
            and a daily briefing that respects your data boundaries.
          </p>
          <div className="mt-8 flex justify-center">
            <MagneticCTA />
          </div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        <motion.div custom={0.08} initial="hidden" whileInView="show" viewport={{ once: true }} variants={reveal}>
          <Card className="glass-card p-0">
            <div className="border-b border-white/10 px-5 py-4">
              <div className="mb-3">
                <Progress
                  value={(typedCount / terminalText.length) * 100}
                  indicatorClassName="bg-gradient-to-r from-emerald-500 to-cyan-400"
                />
              </div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Unified Contribution Graph</p>
            </div>
            <div className="grid gap-6 p-5 md:grid-cols-[1.2fr_0.8fr]">
              <Heatmap />
              <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur-xl">
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-blue-300">AI Coach Stream</p>
                <p className="font-mono text-sm leading-relaxed text-slate-200">
                  {terminalText.slice(0, typedCount)}
                  <span className="ml-0.5 inline-block h-4 w-[1px] animate-pulse bg-blue-300 align-middle" />
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-14 sm:px-6 md:grid-cols-3">
        <BentoCard
          delay={0.04}
          title="Secure Handshake"
          description="Connect via GitHub OAuth. We receive a temporary token, not your password."
          icon={<User className="h-4 w-4 text-emerald-300" />}
        />
        <BentoCard
          delay={0.08}
          title="Signal Extraction"
          description="We fetch latest commits and solves via GraphQL in real-time."
          icon={<Gauge className="h-4 w-4 text-amber-300" />}
        />
        <BentoCard
          delay={0.12}
          title="AI Synthesis"
          description="Serverless analysis detects coding rhythm and generates your briefing."
          icon={<BrainCircuit className="h-4 w-4 text-violet-300" />}
        />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        <motion.div custom={0.14} initial="hidden" whileInView="show" viewport={{ once: true }} variants={reveal}>
          <Card className="glass-card p-6">
            <CardHeader className="p-0 pb-5">
              <CardTitle className="text-slate-100">The Stateless Pipeline</CardTitle>
              <CardDescription className="text-slate-400">
                Application flow proves persistence is bypassed end-to-end.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative overflow-x-auto">
                <div className="mx-auto min-w-[760px]">
                  <svg viewBox="0 0 760 180" className="h-[180px] w-full">
                    <defs>
                      <linearGradient id="pipeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="50%" stopColor="#22d3ee" />
                        <stop offset="100%" stopColor="#a78bfa" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M80 90 C150 20, 230 20, 300 90 S450 160, 530 90 S650 20, 700 90"
                      fill="none"
                      stroke="url(#pipeGrad)"
                      strokeWidth="2"
                      strokeDasharray="10 9"
                      className="opacity-90"
                    />
                    {[0, 1, 2, 3].map((idx) => (
                      <motion.circle
                        key={idx}
                        cx="80"
                        cy="90"
                        r="4"
                        fill="#86efac"
                        animate={{ offsetDistance: ["0%", "100%"] }}
                        transition={{
                          duration: 3.2,
                          delay: idx * 0.6,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "linear",
                        }}
                        style={{
                          offsetPath:
                            "path('M80 90 C150 20, 230 20, 300 90 S450 160, 530 90 S650 20, 700 90')",
                        }}
                      />
                    ))}
                    <Node x={70} y={84} label="User" icon={<User className="h-4 w-4" />} />
                    <Node x={190} y={46} label="JWT Session" icon={<GitBranch className="h-4 w-4" />} />
                    <Node x={330} y={122} label="GitHub/LeetCode APIs" icon={<ServerCog className="h-4 w-4" />} />
                    <Node x={520} y={56} label="OpenAI/Gemini Engine" icon={<Sparkles className="h-4 w-4" />} />
                    <Node x={650} y={92} label="User Dashboard" icon={<Bot className="h-4 w-4" />} />
                  </svg>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-center">
                <div className="relative inline-flex items-center gap-3 rounded-xl border border-rose-500/45 bg-rose-950/30 px-5 py-3 text-rose-200">
                  <Database className="h-5 w-5 opacity-80" />
                  <span className="font-semibold tracking-wide">
                    PERSISTENCE BYPASSED: 0% DATA RETENTION
                  </span>
                  <span className="absolute -right-2 -top-2 rounded-full bg-rose-600 p-1 text-white">
                    <X className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-400">
        Premium SaaS polish, stateless trust layer.
      </footer>
    </Layout>
  );
}

function BentoCard({
  title,
  description,
  delay,
  icon,
}: {
  title: string;
  description: string;
  delay: number;
  icon: React.ReactNode;
}) {
  return (
    <motion.div custom={delay} initial="hidden" whileInView="show" viewport={{ once: true }} variants={reveal}>
      <Card className="glass-card h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            {icon}
            {title}
          </CardTitle>
          <CardDescription className="text-slate-400">{description}</CardDescription>
        </CardHeader>
      </Card>
    </motion.div>
  );
}

function Node({
  x,
  y,
  label,
  icon,
}: {
  x: number;
  y: number;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <foreignObject x={x - 50} y={y - 26} width="160" height="52">
      <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/55 px-3 py-2 text-xs text-slate-100 backdrop-blur-xl">
        {icon}
        {label}
      </div>
    </foreignObject>
  );
}

function MagneticCTA() {
  const ref = useRef<HTMLButtonElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  function onMove(e: MouseEvent<HTMLButtonElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    setOffset({ x: dx * 0.1, y: dy * 0.1 });
  }

  return (
    <motion.button
      ref={ref}
      animate={{ x: offset.x, y: offset.y }}
      transition={{ type: "spring", stiffness: 220, damping: 14 }}
      onMouseMove={onMove}
      onMouseLeave={() => setOffset({ x: 0, y: 0 })}
      whileTap={{ scale: 0.95, boxShadow: "0 0 0 rgba(0,0,0,0)" }}
      onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
      className={cn(
        buttonVariants({ size: "lg" }),
        "group relative overflow-hidden rounded-full px-8 shadow-emerald-500/20 hover:scale-105 hover:shadow-emerald-500/20",
      )}
    >
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:animate-[shimmer_1.8s_linear_infinite]" />
      <Workflow className="mr-2 h-4 w-4" />
      Continue with GitHub
    </motion.button>
  );
}
