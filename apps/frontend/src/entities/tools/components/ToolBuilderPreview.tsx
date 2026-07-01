"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface ToolPreviewProps {
  hasSteps?: boolean;
  onReadyComplete?: () => void;
}

export const ToolPreview: React.FC<ToolPreviewProps> = ({ hasSteps = false, onReadyComplete }) => {
  const [phase, setPhase] = useState<"building" | "ready">("building");

  useEffect(() => {
    if (!hasSteps) return;
    // Switch to ready image
    setPhase("ready");
    // After 3s show ToolProfile
    const timer = setTimeout(() => {
      onReadyComplete?.();
    }, 3000);
    return () => clearTimeout(timer);
  }, [hasSteps, onReadyComplete]);

  const isReady = phase === "ready";

  return (
    <div className="h-full w-full flex flex-col items-center justify-center relative bg-transparent py-12">
      {/* Central Image Animation Container */}
      <div className="relative flex flex-col items-center gap-10">

        {/* Core Container */}
        <div className="relative w-80 h-80 sm:w-96 sm:h-96 perspective-1000">

          {/* Ambient Base Glow — transitions from green (building) to gold (ready) */}
          <AnimatePresence mode="wait">
            <motion.div
              key={phase + "-glow"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full rounded-full pointer-events-none scale-125"
              style={{
                background: isReady
                  ? "radial-gradient(circle at center, rgba(250, 204, 21, 0.4) 0%, transparent 65%)"
                  : "radial-gradient(circle at center, rgba(16, 185, 129, 0.4) 0%, transparent 65%)",
              }}
            />
          </AnimatePresence>

          {/* Grouped Outer Circle + Radar Line */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] sm:w-[115%] sm:h-[115%] pointer-events-none">

            {/* Outer-to-Inner Radiant Background — green/violet (building) → gold/violet (ready) */}
            <AnimatePresence mode="wait">
              <motion.div
                key={phase + "-ring"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                className="absolute inset-0 rounded-full border border-violet-500/30"
                style={{
                  background: isReady
                    ? "radial-gradient(circle at center, rgba(250, 204, 21, 0.15) 0%, transparent 50%, rgba(139, 92, 246, 0.15) 80%, rgba(139, 92, 246, 0.25) 100%)"
                    : "radial-gradient(circle at center, rgba(16, 185, 129, 0.2) 0%, transparent 50%, rgba(139, 92, 246, 0.15) 80%, rgba(139, 92, 246, 0.25) 100%)",
                }}
              />
            </AnimatePresence>

            {/* Radar Sweep Clock Scan — only show when building */}
            <AnimatePresence>
              {!isReady && (
                <motion.div
                  key="radar"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 rounded-full overflow-hidden mix-blend-multiply dark:mix-blend-screen"
                  style={{ animation: undefined }}
                >
                  <motion.div
                    className="absolute inset-0"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  >
                    <div className="absolute top-0 bottom-0 left-[calc(50%-1px)] w-[2px] bg-indigo-500/80 shadow-[0_0_15px_rgba(99,102,241,0.9)]" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Ready state: pulsing glow ring */}
            <AnimatePresence>
              {isReady && (
                <motion.div
                  key="ready-ring"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: [0.4, 1, 0.4], scale: [0.98, 1.02, 0.98] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full border-2 border-yellow-400/50 shadow-[0_0_30px_rgba(250,204,21,0.3)]"
                />
              )}
            </AnimatePresence>
          </div>

          {/* Rotating Technical Rings */}
          {[280, 340].map((size, i) => (
            <motion.div
              key={i}
              className="absolute top-1/2 left-1/2 border border-indigo-500/40 dark:border-indigo-400/30 rounded-full pointer-events-none"
              style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }}
              animate={{ rotate: i % 2 === 0 ? 360 : -360, opacity: [0.4, 0.9, 0.4] }}
              transition={{ duration: 15 + i * 5, repeat: Infinity, ease: "linear" }}
            >
              <div className="absolute top-0 left-1/2 w-1.5 h-3 bg-indigo-500/80 -translate-x-1/2" />
              <div className="absolute bottom-0 left-1/2 w-1.5 h-3 bg-indigo-500/80 -translate-x-1/2" />
              <div className="absolute left-0 top-1/2 w-3 h-1.5 bg-indigo-500/80 -translate-y-1/2" />
              <div className="absolute right-0 top-1/2 w-3 h-1.5 bg-indigo-500/80 -translate-y-1/2" />
            </motion.div>
          ))}

          {/* Core Image — transitions between building and ready */}
          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0, scale: 0.85, rotateY: -90 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              exit={{ opacity: 0, scale: 0.85, rotateY: 90 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative w-full h-full p-4"
              >
                <Image
                  src={isReady ? "/images/tool-core-ready.png" : "/images/tool-core-building.png"}
                  alt={isReady ? "Tool Core Ready" : "Tool Core Building"}
                  fill
                  className="object-contain drop-shadow-xl brightness-105 dark:brightness-125"
                  style={{
                    filter: isReady
                      ? "drop-shadow(0 0 30px rgba(250, 204, 21, 0.5))"
                      : "drop-shadow(0 0 30px rgba(99, 102, 241, 0.3))",
                    transform: isReady ? "scale(0.72)" : "scale(1)",
                    transition: "transform 0.8s ease",
                  }}
                />
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Status Text */}
        <div className="text-center space-y-3 mt-8">
          <AnimatePresence mode="wait">
            {!isReady ? (
              <motion.div
                key="building-text"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex flex-col items-center gap-3"
              >
                <h2 className="text-xl sm:text-2xl font-bold tracking-wide text-indigo-700 dark:text-indigo-300 drop-shadow-sm">
                  Building In Progress
                  <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>_</motion.span>
                </h2>
                <div className="flex gap-2 mt-1">
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400"
                      animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.3, 0.8] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="ready-text"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex flex-col items-center gap-3"
              >
                <motion.h2
                  className="text-xl sm:text-2xl font-bold tracking-wide text-yellow-600 dark:text-yellow-300 drop-shadow-sm"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  ✦ Tool Ready
                </motion.h2>
                <p className="text-sm text-muted-foreground">Launching profile…</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
