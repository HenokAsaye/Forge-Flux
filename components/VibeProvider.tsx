"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type Vibe = "triton" | "hyperdrive" | "ghost";

type VibeContext = {
  vibe: Vibe;
  setVibe: (v: Vibe) => void;
};

const ctx = createContext<VibeContext | undefined>(undefined);

export function useVibe() {
  const c = useContext(ctx);
  if (!c) throw new Error("useVibe must be used within VibeProvider");
  return c;
}

export default function VibeProvider({ children }: { children: React.ReactNode }) {
  const [vibe, setVibeState] = useState<Vibe>(() => {
    try {
      const v = localStorage.getItem("ff:vibe");
      if (v === "hyperdrive" || v === "ghost" || v === "triton") return v;
    } catch (e) {}
    return "triton";
  });

  useEffect(() => {
    try {
      localStorage.setItem("ff:vibe", vibe);
    } catch (e) {}
    // set color-scheme/body attrs for CSS hooks
    document.documentElement.dataset.vibe = vibe;
  }, [vibe]);

  const setVibe = (v: Vibe) => setVibeState(v);

  return (
    <ctx.Provider value={{ vibe, setVibe }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={vibe}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
          className="min-h-screen"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </ctx.Provider>
  );
}
