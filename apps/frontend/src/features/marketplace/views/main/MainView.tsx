"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LayoutGrid,
  Bot,
  Users,
  FolderKanban,
  ArrowRight,
  Sparkles,
  BookOpen,
  MapPin,
  Wrench
} from "lucide-react";

// Category card data
const categories = [
  {
    title: "Projects",
    description: "Browse project proposals",
    icon: FolderKanban,
    gradient: "from-violet-500/20 via-purple-500/20 to-fuchsia-500/20",
    iconColor: "text-violet-500",
    borderColor: "border-violet-500/20",
    hoverGlow: "hover:shadow-violet-500/50",
    count: "24+"
  },
  {
    title: "Teams",
    description: "Discover team opportunities",
    icon: Users,
    gradient: "from-blue-500/20 via-cyan-500/20 to-teal-500/20",
    iconColor: "text-blue-500",
    borderColor: "border-blue-500/20",
    hoverGlow: "hover:shadow-blue-500/50",
    count: "18+"
  },
  {
    title: "Tasks",
    description: "Find individual tasks",
    icon: LayoutGrid,
    gradient: "from-emerald-500/20 via-green-500/20 to-lime-500/20",
    iconColor: "text-emerald-500",
    borderColor: "border-emerald-500/20",
    hoverGlow: "hover:shadow-emerald-500/50",
    count: "156+"
  },
  {
    title: "Talents",
    description: "Hire talented individuals",
    icon: Sparkles,
    gradient: "from-amber-500/20 via-orange-500/20 to-red-500/20",
    iconColor: "text-amber-500",
    borderColor: "border-amber-500/20",
    hoverGlow: "hover:shadow-amber-500/50",
    count: "42+"
  },
  {
    title: "Materials",
    description: "Tutorials, e-docs, videos, and learning resources",
    icon: BookOpen,
    gradient: "from-pink-500/20 via-rose-500/20 to-red-500/20",
    iconColor: "text-pink-500",
    borderColor: "border-pink-500/20",
    hoverGlow: "hover:shadow-pink-500/50",
    count: "89+"
  },
  {
    title: "Resources",
    description: "Locations, equipment, and physical assets",
    icon: MapPin,
    gradient: "from-indigo-500/20 via-purple-500/20 to-pink-500/20",
    iconColor: "text-indigo-500",
    borderColor: "border-indigo-500/20",
    hoverGlow: "hover:shadow-indigo-500/50",
    count: "31+"
  },
  {
    title: "Tools",
    description: "Software, add-ins, libraries, and digital tools",
    icon: Wrench,
    gradient: "from-sky-500/20 via-blue-500/20 to-indigo-500/20",
    iconColor: "text-sky-500",
    borderColor: "border-sky-500/20",
    hoverGlow: "hover:shadow-sky-500/50",
    count: "67+"
  },
  {
    title: "AI Agents",
    description: "Explore AI-powered proposals",
    icon: Bot,
    gradient: "from-cyan-500/20 via-teal-500/20 to-emerald-500/20",
    iconColor: "text-cyan-500",
    borderColor: "border-cyan-500/20",
    hoverGlow: "hover:shadow-cyan-500/50",
    count: "12+"
  }
];

export default function MainView() {
  const router = useRouter();

  const handleBrowse = () => {
    router.push("/marketplace/proposals");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">

      {/* Category Cards Grid */}
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <div
                key={category.title}
                className={`group relative overflow-hidden rounded-2xl border ${category.borderColor} bg-gradient-to-br ${category.gradient} backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${category.hoverGlow}`}
              >
                {/* Card content */}
                <div className="relative p-6 space-y-4">
                  {/* Icon and badge */}
                  <div className="flex items-start justify-between">
                    <div className={`rounded-xl bg-background/50 p-3 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                      <Icon className={`h-8 w-8 ${category.iconColor}`} />
                    </div>
                    <Badge variant="secondary" className="bg-background/70 backdrop-blur-sm">
                      {category.count}
                    </Badge>
                  </div>

                  {/* Title and description */}
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold tracking-tight">
                      {category.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {category.description}
                    </p>
                  </div>

                  {/* CTA Button */}
                  <Button
                    onClick={handleBrowse}
                    variant="ghost"
                    className="w-full justify-between group/btn hover:bg-background/70"
                  >
                    <span>Browse</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                  </Button>
                </div>

                {/* Hover glow effect */}
                <div className="absolute inset-0 -z-10 bg-gradient-to-br opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-20"
                  style={{
                    background: `radial-gradient(circle at 50% 0%, ${category.iconColor.replace('text-', 'rgb(var(--')})}, transparent 70%)`
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
