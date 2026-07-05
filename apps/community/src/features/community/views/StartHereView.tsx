"use client";

import { Card } from "@/components/ui/card";
import {
  Rocket,
  LifeBuoy,
  MessageSquare,
  Megaphone,
  ArrowRight,
  Sparkles
} from "lucide-react";

export function StartHereView() {
  const categories = [
    {
      title: "Get started",
      description: "Complete your profile and head over to Introductions to share who you are and what you're building.",
      icon: Rocket,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-500/10",
      hoverBorder: "hover:border-blue-500/30",
    },
    {
      title: "Support",
      description: "Need help using Agentflox? Ask for help from other community members and the Relevance team.",
      icon: LifeBuoy,
      iconColor: "text-indigo-600",
      iconBg: "bg-indigo-500/10",
      hoverBorder: "hover:border-indigo-500/30",
    },
    {
      title: "Discussion",
      description: "Want to discuss your AI work? Join a discussion group to collaborate with people building similar things.",
      icon: MessageSquare,
      iconColor: "text-violet-600",
      iconBg: "bg-violet-500/10",
      hoverBorder: "hover:border-violet-500/30",
    },
    {
      title: "Announcements",
      description: "Check announcements for updates and register for upcoming live sessions with the core team.",
      icon: Megaphone,
      iconColor: "text-fuchsia-600",
      iconBg: "bg-fuchsia-500/10",
      hoverBorder: "hover:border-fuchsia-500/30",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Hero Welcome Section */}
      <Card className="relative overflow-hidden border-slate-200/60 bg-white p-8 shadow-sm sm:p-12">
        {/* Decorative background gradients */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-[80px]" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-violet-500/10 blur-[80px]" />

        <div className="relative z-10 max-w-2xl">
          <div className="mb-4 inline-flex items-center rounded-full border border-indigo-500/20 bg-indigo-50/50 px-3 py-1 text-xs font-medium text-indigo-700 backdrop-blur-sm">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Community Hub
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Welcome to the <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Agentflox Community</span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            We are excited to have you here. This is our dedicated space to chat with fellow Agentflox fans, partners, and members of the core team. Dive in, connect, and let's build the future of AI together.
          </p>
        </div>
      </Card>

      {/* Interactive Grid Navigation */}
      <div className="grid gap-4 sm:grid-cols-2 lg:gap-6">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Card
              key={category.title}
              className={`group relative cursor-pointer overflow-hidden border-slate-200/60 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${category.hoverBorder}`}
            >
              <div className="flex items-start justify-between">
                <div className={`inline-flex rounded-xl p-3 ${category.iconBg}`}>
                  <Icon className={`h-6 w-6 ${category.iconColor}`} />
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-slate-900 transition-colors group-hover:text-indigo-600">
                  {category.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {category.description}
                </p>
              </div>

              {/* Subtle bottom gradient on hover */}
              <div className="absolute inset-x-0 bottom-0 h-1 w-full scale-x-0 bg-gradient-to-r from-indigo-500 to-violet-500 transition-transform duration-300 group-hover:scale-x-100" />
            </Card>
          );
        })}
      </div>
    </div>
  );
}