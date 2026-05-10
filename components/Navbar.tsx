"use client";

import { motion } from "framer-motion";
import { GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Navbar() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-x-0 top-4 z-50 flex justify-center px-4"
    >
      <div className="max-w-fit rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 backdrop-blur-md shadow-[0_12px_40px_rgba(2,6,23,0.4)]">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
            <GitBranch className="h-4 w-4 text-emerald-400" />
            Forge Flux
          </div>
          <Badge className="border-emerald-500/35 bg-emerald-500/10 text-emerald-200">
            <span className="mr-2 inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Systems: Online
          </Badge>
        </div>
      </div>
    </motion.header>
  );
}
