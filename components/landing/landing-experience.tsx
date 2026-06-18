"use client";

import { AnimatePresence, motion, useInView, type Variants } from "framer-motion";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Database,
  Gauge,
  GitBranch,
  Lock,
  ServerCog,
  ShieldCheck,
  Sparkles,
  User,
  X,
  Zap,
} from "lucide-react";
import { signIn } from "next-auth/react";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Heatmap } from "@/components/Heatmap";
import { Layout } from "@/components/Layout";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
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

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-4 pb-8 pt-32 sm:px-6 sm:pt-36">
        <motion.div custom={0} initial="hidden" animate="show" variants={reveal} className="text-center">
          <div className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/[0.08] px-4 py-1.5 text-xs font-medium text-emerald-200 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              Stateless developer coaching · zero data retention
            </span>
          </div>

          <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-[1.05] tracking-tighter sm:text-7xl">
            <span className="bg-gradient-to-b from-white via-white to-slate-500 bg-clip-text text-transparent">
              Forge your{" "}
            </span>
            <span className="relative inline-block">
              <AnimatePresence mode="wait">
                <motion.span
                  key={words[wordIndex]}
                  initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -14, filter: "blur(8px)" }}
                  transition={{ duration: 0.32 }}
                  className="animated-gradient-text inline-block"
                >
                  {words[wordIndex]}
                </motion.span>
              </AnimatePresence>
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
            Connect GitHub and LeetCode, and let an AI coach read your real signal—commits,
            solves, and rhythm—then hand you a sharp daily briefing. No database. Nothing stored.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <MagneticCTA />
            <a
              href="#preview"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "group rounded-full px-7",
              )}
            >
              See it live
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              GitHub OAuth, never your password
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-cyan-400" />
              Preferences stay on your device
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-violet-400" />
              Real-time GraphQL signal
            </span>
          </div>
        </motion.div>
      </section>

      {/* Floating product preview */}
      <section id="preview" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-16 sm:px-6">
        <PreviewWindow typedCount={typedCount} terminalText={terminalText} />
      </section>

      {/* Animated stats */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          <StatTile value={0} display="0%" label="Data retained" accent="emerald" />
          <StatTile value={2} suffix="" decimals={0} display="2" label="Signal sources fused" accent="cyan" />
          <StatTile value={168} display="168" label="Days of activity mapped" accent="violet" />
          <StatTile value={100} suffix="ms" display="<100ms" label="Briefing synthesis" accent="amber" />
        </div>
      </section>

      {/* Feature bento */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <SectionHeading
          eyebrow="The pipeline"
          title="Three steps from token to insight"
          subtitle="Every stage is ephemeral. We read, synthesize, and forget."
        />
        <div className="grid gap-4 md:grid-cols-3">
          <BentoCard
            delay={0.04}
            index="01"
            title="Secure handshake"
            description="Connect via GitHub OAuth. We receive a short-lived token, never your password—and it dies with the session."
            icon={<User className="h-5 w-5 text-emerald-300" />}
            glow="emerald"
          />
          <BentoCard
            delay={0.08}
            index="02"
            title="Signal extraction"
            description="We pull your latest commits and solves over GraphQL in real time, fusing GitHub and LeetCode into one contribution graph."
            icon={<Gauge className="h-5 w-5 text-cyan-300" />}
            glow="cyan"
          />
          <BentoCard
            delay={0.12}
            index="03"
            title="AI synthesis"
            description="Serverless analysis detects your coding rhythm and writes a focused daily briefing—then nothing is written to disk."
            icon={<BrainCircuit className="h-5 w-5 text-violet-300" />}
            glow="violet"
          />
        </div>
      </section>

      {/* Stateless pipeline diagram */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <motion.div custom={0.14} initial="hidden" whileInView="show" viewport={{ once: true }} variants={reveal}>
          <Card className="glass-card p-6">
            <CardHeader className="p-0 pb-5">
              <CardTitle className="text-xl text-slate-100">The stateless pipeline</CardTitle>
              <CardDescription className="text-slate-400">
                Trace the flow end-to-end—persistence is bypassed by design.
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

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <motion.div
          custom={0.05}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={reveal}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/80 px-6 py-14 text-center backdrop-blur-xl sm:px-12"
        >
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-[90px]" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-violet-500/20 blur-[100px]" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Your next streak starts with one honest briefing.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              No signup forms, no stored profiles. Connect GitHub and your dashboard is ready in seconds.
            </p>
            <div className="mt-8 flex justify-center">
              <MagneticCTA />
            </div>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-slate-400 sm:flex-row sm:px-6">
          <div className="inline-flex items-center gap-2 font-semibold text-slate-200">
            <GitBranch className="h-4 w-4 text-emerald-400" />
            Forge Flux
          </div>
          <p>Premium SaaS polish, stateless trust layer.</p>
          <span className="inline-flex items-center gap-1.5 text-xs">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            All systems operational
          </span>
        </div>
      </footer>
    </Layout>
  );
}

function PreviewWindow({
  typedCount,
  terminalText,
}: {
  typedCount: number;
  terminalText: string;
}) {
  return (
    <motion.div
      custom={0.08}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      variants={reveal}
      className="relative"
    >
      {/* glow */}
      <div className="pointer-events-none absolute inset-x-10 -top-6 -bottom-6 rounded-[2rem] bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-violet-500/20 blur-3xl" />

      <div className="float-slow relative">
        <Card className="glass-card overflow-hidden p-0 shadow-[0_30px_80px_rgba(2,6,23,0.6)]">
          {/* browser chrome */}
          <div className="flex items-center gap-3 border-b border-white/10 bg-slate-950/60 px-4 py-3">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-rose-500/80" />
              <span className="h-3 w-3 rounded-full bg-amber-400/80" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
            </div>
            <div className="mx-auto flex max-w-sm flex-1 items-center justify-center gap-2 rounded-md border border-white/5 bg-slate-900/70 px-3 py-1 text-xs text-slate-400">
              <Lock className="h-3 w-3 text-emerald-400" />
              forge-flux.app/dashboard
            </div>
            <Badge className="hidden border-emerald-500/35 bg-emerald-500/10 text-emerald-200 sm:inline-flex">
              Live
            </Badge>
          </div>

          <div className="border-b border-white/10 px-5 py-4">
            <div className="mb-3">
              <Progress
                value={(typedCount / terminalText.length) * 100}
                indicatorClassName="bg-gradient-to-r from-emerald-500 to-cyan-400"
              />
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Unified Contribution Graph
            </p>
          </div>

          <div className="grid gap-6 p-5 md:grid-cols-[1.2fr_0.8fr]">
            <Heatmap />
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur-xl">
                <p className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-blue-300">
                  <Bot className="h-3.5 w-3.5" />
                  AI Coach Stream
                </p>
                <p className="font-mono text-sm leading-relaxed text-slate-200">
                  {terminalText.slice(0, typedCount)}
                  <span className="ml-0.5 inline-block h-4 w-[1px] animate-pulse bg-blue-300 align-middle" />
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="Streak" value="23d" accent="emerald" />
                <MiniStat label="Signal" value="Elite" accent="cyan" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "emerald" | "cyan";
}) {
  const ring =
    accent === "emerald" ? "border-emerald-500/25" : "border-cyan-500/25";
  const text = accent === "emerald" ? "text-emerald-300" : "text-cyan-300";
  return (
    <div className={cn("rounded-xl border bg-slate-900/40 p-3 backdrop-blur-xl", ring)}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={cn("mt-1 text-lg font-semibold", text)}>{value}</p>
    </div>
  );
}

const accentText: Record<string, string> = {
  emerald: "text-emerald-300",
  cyan: "text-cyan-300",
  violet: "text-violet-300",
  amber: "text-amber-300",
};

function StatTile({
  value,
  display,
  label,
  suffix,
  decimals = 0,
  accent,
}: {
  value: number;
  display: string;
  label: string;
  suffix?: string;
  decimals?: number;
  accent: keyof typeof accentText;
}) {
  return (
    <motion.div
      custom={0.04}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      variants={reveal}
      className="glass-card rounded-2xl p-5 text-center"
    >
      <p className={cn("text-3xl font-bold tracking-tight sm:text-4xl", accentText[accent])}>
        <AnimatedCounter to={value} display={display} suffix={suffix} decimals={decimals} />
      </p>
      <p className="mt-1.5 text-xs text-slate-400">{label}</p>
    </motion.div>
  );
}

function AnimatedCounter({
  to,
  display,
  suffix = "",
  decimals = 0,
}: {
  to: number;
  display: string;
  suffix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [val, setVal] = useState(0);
  const settled = inView && Math.abs(val - to) < Math.pow(10, -decimals) / 2;

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const duration = 1300;
    let startTs = 0;
    const tick = (ts: number) => {
      if (!startTs) startTs = ts;
      const t = Math.min(1, (ts - startTs) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(to * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);

  // Once settled, show the curated display string (handles "<100ms", "0%", etc.).
  return <span ref={ref}>{settled ? display : `${val.toFixed(decimals)}${suffix}`}</span>;
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <motion.div
      custom={0.02}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      variants={reveal}
      className="mb-8 text-center"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-slate-400">{subtitle}</p>
    </motion.div>
  );
}

const glowMap: Record<string, string> = {
  emerald: "before:bg-emerald-500/10",
  cyan: "before:bg-cyan-500/10",
  violet: "before:bg-violet-500/10",
};

function BentoCard({
  title,
  description,
  delay,
  icon,
  index,
  glow,
}: {
  title: string;
  description: string;
  delay: number;
  icon: ReactNode;
  index: string;
  glow: keyof typeof glowMap;
}) {
  return (
    <motion.div custom={delay} initial="hidden" whileInView="show" viewport={{ once: true }} variants={reveal}>
      <Card
        className={cn(
          "glass-card group relative h-full overflow-hidden",
          "before:pointer-events-none before:absolute before:-right-10 before:-top-10 before:h-40 before:w-40 before:rounded-full before:blur-2xl before:transition-opacity before:duration-300 before:opacity-0 group-hover:before:opacity-100",
          glowMap[glow],
        )}
      >
        <CardHeader>
          <div className="mb-3 flex items-center justify-between">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-slate-900/60">
              {icon}
            </span>
            <span className="font-mono text-xs text-slate-600">{index}</span>
          </div>
          <CardTitle className="text-slate-100">{title}</CardTitle>
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
  icon: ReactNode;
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
      <GitBranch className="mr-2 h-4 w-4" />
      Continue with GitHub
    </motion.button>
  );
}
