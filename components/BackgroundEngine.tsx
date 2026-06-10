"use client";

import React, { useEffect } from "react";
import { useMotionValue, useSpring, useTransform } from "framer-motion";
import { useVibe } from "./VibeProvider";

export default function BackgroundEngine() {
  const { vibe } = useVibe();

  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const sx = useSpring(mx, { damping: 20, stiffness: 150 });
  const sy = useSpring(my, { damping: 20, stiffness: 150 });

  useEffect(() => {
    if (vibe !== "triton") return;
    function onMove(e: MouseEvent) {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      mx.set(x);
      my.set(y);
    }
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [vibe, mx, my]);

  const bgPosX = useTransform(sx, (v) => `${v}%`);
  const bgPosY = useTransform(sy, (v) => `${v}%`);

  return (
    <div aria-hidden className="fixed inset-0 -z-10 pointer-events-none">
      {/* Hyperdrive grid */}
      {vibe === "hyperdrive" && (
        <div className="hyperdrive-grid" />
      )}

      {/* Triton spotlight */}
      {vibe === "triton" && (
        <div
          className="triton-spotlight"
          style={{
            backgroundImage: `radial-gradient(600px circle at ${bgPosX} ${bgPosY}, rgba(16,185,129,0.12), transparent 20%)`,
          }}
        />
      )}

      {/* Ghost minimal subtle texture */}
      {vibe === "ghost" && <div className="ghost-texture" />}

      {/* Common SVG noise overlay */}
      <svg className="absolute inset-0 h-full w-full opacity-5" preserveAspectRatio="none">
        <filter id="ff-noise">
          <feTurbulence baseFrequency="0.8" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#ff-noise)" opacity="0.05" />
      </svg>
    </div>
  );
}
