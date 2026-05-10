"use client";

import {
  AnimatePresence,
  motion,
  type Variants,
} from "framer-motion";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type VibeTheme = "triton" | "hyperdrive" | "ghost";

type VibeContextValue = {
  theme: VibeTheme;
  setTheme: (theme: VibeTheme) => void;
};

const STORAGE_KEY = "forgeflux:vibe-theme:v1";

const VibeContext = createContext<VibeContextValue | undefined>(undefined);

const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export function VibeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<VibeTheme>("triton");

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    if (raw === "triton" || raw === "hyperdrive" || raw === "ghost") {
      setThemeState(raw);
    }
  }, []);

  const setTheme = useCallback((next: VibeTheme) => {
    setThemeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return (
    <VibeContext.Provider value={value}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={theme}
          data-vibe-theme={theme}
          className="min-h-screen"
          variants={fadeVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </VibeContext.Provider>
  );
}

export function useVibe() {
  const ctx = useContext(VibeContext);
  if (!ctx) {
    throw new Error("useVibe must be used within VibeProvider");
  }
  return ctx;
}
