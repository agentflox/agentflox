"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Compass,
  Briefcase,
  Users,
  Folder,
  ListChecks,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

const CYCLING_ICONS = [
  { icon: Building2, color: "text-sky-500", glow: "from-sky-500/20 to-blue-500/0", label: "Workspace" },
  { icon: Compass, color: "text-indigo-400", glow: "from-indigo-500/20 to-violet-500/0", label: "Space" },
  { icon: Briefcase, color: "text-fuchsia-400", glow: "from-fuchsia-500/20 to-pink-500/0", label: "Project" },
  { icon: Users, color: "text-emerald-400", glow: "from-emerald-500/20 to-teal-500/0", label: "Team" },
  { icon: Folder, color: "text-amber-400", glow: "from-amber-500/20 to-orange-500/0", label: "Folder" },
  { icon: ListChecks, color: "text-rose-400", glow: "from-rose-500/20 to-red-500/0", label: "Hierarchy" },
];

export function DashboardLoadingState({ message }: { message?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadeState, setFadeState] = useState<"in" | "out">("in");

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeState("out");
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % CYCLING_ICONS.length);
        setFadeState("in");
      }, 250);
    }, 1400);

    return () => clearInterval(interval);
  }, []);

  const activeItem = CYCLING_ICONS[currentIndex];
  const CurrentIcon = activeItem.icon;

  // Use custom message if provided, otherwise default to "Loading [label]..."
  const displayMessage = message || `Loading ${activeItem.label.toLowerCase()}...`;

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-background/60 backdrop-blur-xl">
      {/* Ambient background aura that shifts colors gracefully */}
      <div className={cn(
        "absolute h-72 w-72 rounded-full blur-3xl transition-all duration-700 opacity-60 bg-gradient-to-tr",
        activeItem.glow
      )} />

      {/* Center Loader Composition */}
      <div className="relative flex items-center justify-center">
        {/* Soft subtle outer ring */}
        <div className="absolute h-20 w-20 rounded-full border border-primary/10 bg-primary/[0.01]" />

        {/* Central Icon Container with Glassmorphism */}
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-background/80 shadow-xl ring-1 ring-border/80 backdrop-blur-md">
          <CurrentIcon
            key={currentIndex}
            className={cn(
              "h-5 w-5 transition-all duration-300",
              activeItem.color,
              fadeState === "in"
                ? "opacity-100 scale-100 translate-y-0"
                : "opacity-0 scale-50 translate-y-2"
            )}
          />
        </div>
      </div>

      {/* Single Unified Status Text */}
      <div className="mt-8 flex flex-col items-center space-y-2 text-center">
        <p className={cn(
          "text-sm font-medium text-foreground/90 transition-all duration-300",
          fadeState === "in" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
        )}>
          {displayMessage}
        </p>

        {/* Modern minimal loader dots */}
        <div className="flex items-center gap-1.5 pt-1">
          <div className="h-1 w-4 animate-pulse rounded-full bg-primary/40" style={{ animationDelay: "0ms" }} />
          <div className="h-1 w-6 animate-pulse rounded-full bg-primary" style={{ animationDelay: "200ms" }} />
          <div className="h-1 w-4 animate-pulse rounded-full bg-primary/40" style={{ animationDelay: "400ms" }} />
        </div>
      </div>
    </div>
  );
}

export function DashboardErrorState({ title = "Unable to load data", message }: { title?: string; message: string }) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center space-y-4">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 animate-pulse rounded-full bg-destructive/10 blur-xl" />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-destructive/20 backdrop-blur-sm">
          <AlertCircle className="h-5 w-5 text-destructive" />
        </div>
      </div>
      <div className="text-center space-y-1">
        <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {message}
        </p>
      </div>
    </div>
  );
}
