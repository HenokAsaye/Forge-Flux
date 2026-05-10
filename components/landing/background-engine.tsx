"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { useEffect } from "react";
import { useVibe } from "@/components/vibe-provider";

export function BackgroundEngine() {
  const { theme } = useVibe();
  const mouseX = useMotionValue(50);
  const mouseY = useMotionValue(30);
  const smoothX = useSpring(mouseX, { stiffness: 120, damping: 24, mass: 0.4 });
  const smoothY = useSpring(mouseY, { stiffness: 120, damping: 24, mass: 0.4 });

  useEffect(() => {
    if (theme !== "triton") return;
    const onMove = (e: MouseEvent) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      mouseX.set((e.clientX / w) * 100);
      mouseY.set((e.clientY / h) * 100);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mouseX, mouseY, theme]);

  const spotlight = useMotionTemplate`radial-gradient(500px circle at ${smoothX}% ${smoothY}%, rgba(16,185,129,0.22), transparent 45%)`;

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="vibe-base absolute inset-0" />
      {theme === "triton" ? <motion.div className="absolute inset-0" style={{ backgroundImage: spotlight }} /> : null}
      <div className="aurora-blob aurora-indigo absolute -left-24 top-[-120px] h-[360px] w-[360px] rounded-full blur-[100px]" />
      <div className="aurora-blob aurora-emerald absolute left-[35%] top-[20%] h-[340px] w-[340px] rounded-full blur-[100px]" />
      <div className="aurora-blob aurora-violet absolute -right-20 bottom-[5%] h-[360px] w-[360px] rounded-full blur-[100px]" />
      <div className="absolute inset-0 vibe-grid" />
      {theme === "hyperdrive" ? (
        <>
          <div className="absolute inset-0 hyperdrive-starfield" />
          <div className="absolute inset-0 hyperdrive-grid" />
        </>
      ) : null}
      {theme === "ghost" ? (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-100 via-zinc-50 to-zinc-100" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(255,255,255,0.8),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(212,212,216,0.35),transparent_40%)]" />
        </>
      ) : null}

      <svg className="absolute h-0 w-0">
        <filter id="vibe-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="2"
            stitchTiles="stitch"
          />
        </filter>
      </svg>
      <div className="noise-overlay absolute inset-0" />
    </div>
  );
}
