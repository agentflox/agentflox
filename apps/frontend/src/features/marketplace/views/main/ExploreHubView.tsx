"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, Sparkles, Box, LayoutTemplate, Briefcase, Zap, Star, Users, UsersRound, Orbit, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import ListingCard from "@/features/marketplace/components/ListingCard";

// ─── SVG icon paths per node ───────────────────────────────────────────────
const ICON_PATHS: Record<string, string> = {
  task: `<path d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h4" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
  agent: `<rect x="2" y="7" width="20" height="13" rx="2" stroke="white" stroke-width="1.5" fill="none"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2M12 12v.01M8 12v.01M16 12v.01" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
  workforce: `<circle cx="12" cy="5" r="3" stroke="white" stroke-width="1.5" fill="none"/><circle cx="5" cy="19" r="3" stroke="white" stroke-width="1.5" fill="none"/><circle cx="19" cy="19" r="3" stroke="white" stroke-width="1.5" fill="none"/><path d="M10.4 7.2l-3.8 9.6M13.6 7.2l3.8 9.6M7.8 19h8.4" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
  project: `<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  template: `<rect x="3" y="3" width="18" height="18" rx="2" stroke="white" stroke-width="1.5" fill="none"/><path d="M3 9h18M9 21V9" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
  tool: `<path d="M14.7 6.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-1-1a1 1 0 010-1.4l8-8a1 1 0 011.4 0l1 1z" stroke="white" stroke-width="1.5" fill="none"/><circle cx="6" cy="18" r="3" stroke="white" stroke-width="1.5" fill="none"/>`,
  team: `<path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/><circle cx="9" cy="7" r="4" stroke="white" stroke-width="1.5" fill="none"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
  talent: `<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
};

// ─── Node definitions ───────────────────────────────────────────────────────
const NODES = [
  { id: "task", name: "Task", sub: "Central hub", cx: 0.50, cy: 0.50, isCenter: true, acc: "#a78bfa", acc2: "#7c3aed" },
  { id: "talent", name: "Talent", sub: "Expert humans", cx: 0.50, cy: 0.10, isCenter: false, acc: "#22d3ee", acc2: "#0891b2" },
  { id: "agent", name: "AI Agent", sub: "Autonomous", cx: 0.83, cy: 0.27, isCenter: false, acc: "#38bdf8", acc2: "#0284c7" },
  { id: "template", name: "Template", sub: "Ready workflows", cx: 0.83, cy: 0.72, isCenter: false, acc: "#818cf8", acc2: "#4f46e5" },
  { id: "workforce", name: "Workforce", sub: "Swarm AI", cx: 0.50, cy: 0.90, isCenter: false, acc: "#fb923c", acc2: "#d97706" },
  { id: "team", name: "Team", sub: "Collaborative", cx: 0.17, cy: 0.72, isCenter: false, acc: "#f472b6", acc2: "#db2777" },
  { id: "tool", name: "Tool", sub: "Modular scripts", cx: 0.17, cy: 0.27, isCenter: false, acc: "#e879f9", acc2: "#a21caf" },
  { id: "project", name: "Project", sub: "Large scale", cx: 0.50, cy: 0.50, isCenter: false, acc: "#34d399", acc2: "#059669" }, // hidden, used for edge only
];

const EDGES = [
  ["task", "talent"], ["task", "agent"], ["task", "template"],
  ["task", "workforce"], ["task", "team"], ["task", "tool"],
];

// We render 6 outer nodes + task center (project removed from visual, kept for data)
const VISUAL_NODES = NODES.filter(n => n.id !== "project");

export function HeroNetwork() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = sceneRef.current!;
    const cvs = canvasRef.current!;
    const wrap = wrapRef.current!;
    const ctx = cvs.getContext("2d")!;
    const H = 460;

    const getW = () => scene.offsetWidth;

    function npos(id: string) {
      const n = VISUAL_NODES.find(x => x.id === id)!;
      return { x: n.cx * getW(), y: n.cy * H };
    }

    function resize() {
      cvs.width = getW();
      cvs.height = H;
    }

    function buildNodes() {
      wrap.innerHTML = "";

      // Inject keyframe animation once
      if (!document.getElementById("hn-style")) {
        const s = document.createElement("style");
        s.id = "hn-style";
        s.textContent = `
          @keyframes hn-spin  { to { transform: rotate(360deg); } }
          @keyframes hn-spin2 { to { transform: rotate(-360deg); } }
          @keyframes hn-float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
        `;
        document.head.appendChild(s);
      }

      VISUAL_NODES.forEach(n => {
        const W = getW();
        const px = n.cx * W;
        const py = n.cy * H;

        const R = n.isCenter ? 52 : 36; // disc radius
        const BW = n.isCenter ? 160 : 120; // bounding box width (for label)

        const el = document.createElement("div");
        el.setAttribute("data-id", n.id);
        el.style.cssText = [
          `position:absolute`,
          `width:${BW}px`,
          `left:${px - BW / 2}px`,
          `top:${py - R - 6}px`,
          `display:flex`,
          `flex-direction:column`,
          `align-items:center`,
          `gap:7px`,
          `cursor:pointer`,
          `animation:hn-float ${3.5 + Math.random()}s ease-in-out infinite`,
          `animation-delay:${Math.random() * 2}s`,
        ].join(";");

        // Hexagonal clip path via SVG polygon for the icon disc background
        const hexPts = (r: number, cx: number, cy: number) =>
          Array.from({ length: 6 }, (_, i) => {
            const a = (Math.PI / 180) * (60 * i - 30);
            return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
          }).join(" ");

        const discSize = R * 2;
        const hexR = R - 2;

        el.innerHTML = `
          <div style="position:relative;width:${discSize}px;height:${discSize}px;flex-shrink:0">

            <!-- outer dashed spin ring -->
            <svg style="position:absolute;inset:-10px;width:${discSize + 20}px;height:${discSize + 20}px;animation:hn-spin ${n.isCenter ? 18 : 12}s linear infinite;pointer-events:none" viewBox="0 0 ${discSize + 20} ${discSize + 20}">
              <polygon
                points="${hexPts(R + 6, (discSize + 20) / 2, (discSize + 20) / 2)}"
                fill="none"
                stroke="${n.acc}"
                stroke-width="1"
                stroke-dasharray="${n.isCenter ? "6 4" : "4 5"}"
                opacity="${n.isCenter ? "0.5" : "0.35"}"
              />
            </svg>

            <!-- inner counter-spin ring -->
            <svg style="position:absolute;inset:-4px;width:${discSize + 8}px;height:${discSize + 8}px;animation:hn-spin2 ${n.isCenter ? 24 : 16}s linear infinite;pointer-events:none" viewBox="0 0 ${discSize + 8} ${discSize + 8}">
              <polygon
                points="${hexPts(R + 1, (discSize + 8) / 2, (discSize + 8) / 2)}"
                fill="none"
                stroke="${n.acc}"
                stroke-width="0.5"
                stroke-dasharray="2 8"
                opacity="0.25"
              />
            </svg>

            <!-- hex disc body -->
            <svg style="position:absolute;inset:0;width:${discSize}px;height:${discSize}px" viewBox="0 0 ${discSize} ${discSize}">
              <defs>
                <radialGradient id="rg-${n.id}" cx="40%" cy="35%">
                  <stop offset="0%" stop-color="${n.acc}" stop-opacity="0.22"/>
                  <stop offset="100%" stop-color="${n.acc2}" stop-opacity="0.06"/>
                </radialGradient>
              </defs>
              <polygon
                points="${hexPts(hexR, R, R)}"
                fill="url(#rg-${n.id})"
                stroke="${n.acc}"
                stroke-width="1.2"
                opacity="0.9"
                class="hex-body-${n.id}"
              />
            </svg>

            <!-- icon -->
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
              <svg width="${n.isCenter ? 26 : 20}" height="${n.isCenter ? 26 : 20}" viewBox="0 0 24 24" fill="none">${ICON_PATHS[n.id] ?? ""}</svg>
            </div>


          </div>

          <!-- label -->
          <div style="text-align:center;pointer-events:none">
            <div style="font-size:${n.isCenter ? 13 : 11}px;font-weight:800;color:rgba(255,255,255,${n.isCenter ? ".95" : ".82"});letter-spacing:.06em;text-transform:uppercase;text-shadow:0 2px 8px rgba(0,0,0,.7)">${n.name}</div>
            <div style="font-size:9px;font-weight:500;color:${n.acc};letter-spacing:.04em;text-transform:uppercase;margin-top:1px;opacity:.8">${n.sub}</div>
          </div>
        `;

        // Hover
        const hexBody = el.querySelector<SVGPolygonElement>(`.hex-body-${n.id}`);
        el.addEventListener("mouseenter", () => {
          el.style.zIndex = "10";
          if (hexBody) {
            hexBody.style.stroke = n.acc;
            hexBody.style.opacity = "1";
            hexBody.style.filter = `drop-shadow(0 0 10px ${n.acc}88)`;
            hexBody.style.strokeWidth = "2";
          }
        });
        el.addEventListener("mouseleave", () => {
          el.style.zIndex = "";
          if (hexBody) {
            hexBody.style.stroke = n.acc;
            hexBody.style.opacity = "0.9";
            hexBody.style.filter = "";
            hexBody.style.strokeWidth = "1.2";
          }
        });

        wrap.appendChild(el);
      });
    }

    function drawEdges() {
      ctx.clearRect(0, 0, getW(), H);
      EDGES.forEach(([a, b]) => {
        const pa = npos(a);
        const pb = npos(b);
        const na = VISUAL_NODES.find(n => n.id === a)!;
        const nb = VISUAL_NODES.find(n => n.id === b)!;
        const g = ctx.createLinearGradient(pa.x, pa.y, pb.x, pb.y);
        g.addColorStop(0, na.acc + "40");
        g.addColorStop(1, nb.acc + "40");
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.strokeStyle = g;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });
    }

    resize();
    buildNodes();
    drawEdges();

    const ro = new ResizeObserver(() => { resize(); buildNodes(); drawEdges(); });
    ro.observe(scene);

    return () => {
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={sceneRef}
      style={{ width: "100%", height: 460, position: "relative", overflow: "visible" }}
    >
      {/* ambient glows — one per accent colour */}
      {[
        { l: "50%", t: "50%", c: "rgba(167,139,250,0.18)", r: 200 },
        { l: "83%", t: "27%", c: "rgba(56,189,248,0.12)", r: 140 },
        { l: "83%", t: "72%", c: "rgba(129,140,248,0.12)", r: 140 },
        { l: "50%", t: "90%", c: "rgba(251,146,60,0.12)", r: 140 },
        { l: "17%", t: "72%", c: "rgba(244,114,182,0.12)", r: 140 },
        { l: "17%", t: "27%", c: "rgba(232,121,249,0.12)", r: 140 },
        { l: "50%", t: "10%", c: "rgba(34,211,238,0.12)", r: 140 },
      ].map((g, i) => (
        <div key={i} style={{
          position: "absolute", left: g.l, top: g.t,
          width: g.r * 2, height: g.r * 2, borderRadius: "50%",
          background: `radial-gradient(circle,${g.c} 0%,transparent 70%)`,
          transform: "translate(-50%,-50%)", pointerEvents: "none", zIndex: 0,
        }} />
      ))}

      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1 }}
      />
      <div
        ref={wrapRef}
        style={{ position: "absolute", inset: 0, zIndex: 2 }}
      />
    </div>
  );
}

// ─── Rest of the page (unchanged) ──────────────────────────────────────────

export default function ExploreHubView() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/marketplace/search?q=${encodeURIComponent(searchQuery)}`);
    } else {
      router.push(`/marketplace/search`);
    }
  };

  const navigateToCategory = (category: string) => {
    router.push(`/marketplace/search?type=${category}`);
  };

  const categories = [
    { id: 'agent', name: 'AI Agents', details: 'Autonomous assistants', icon: <Sparkles className="w-6 h-6" />, color: 'from-blue-600 to-indigo-500' },
    { id: 'tool', name: 'Tools & Scripts', details: 'Modular executions', icon: <Box className="w-6 h-6" />, color: 'from-purple-600 to-pink-500' },
    { id: 'template', name: 'Templates', details: 'Ready-made workflows', icon: <LayoutTemplate className="w-6 h-6" />, color: 'from-emerald-500 to-teal-500' },
    { id: 'workforce', name: 'Workforces', details: 'Swarm intelligence', icon: <Orbit className="w-6 h-6" />, color: 'from-orange-500 to-amber-500' },
    { id: 'talent', name: 'Talents', details: 'Expert humans in the loop', icon: <Users className="w-6 h-6" />, color: 'from-cyan-500 to-sky-500' },
    { id: 'team', name: 'Teams', details: 'Collaborative task forces', icon: <UsersRound className="w-6 h-6" />, color: 'from-rose-500 to-red-500' },
    { id: 'task', name: 'Tasks', details: 'Bounties & open work', icon: <Briefcase className="w-6 h-6" />, color: 'from-gray-600 to-slate-500' },
    { id: 'project', name: 'Projects', details: 'Large scale contracts', icon: <Zap className="w-6 h-6" />, color: 'from-violet-600 to-purple-500' },
  ];

  return (
    <div className="flex flex-col w-full bg-background relative">

      {/* 1. HERO SECTION */}
      <div className="p-4 lg:p-8">
        <div
          className="relative w-full h-auto min-h-[540px] flex items-center overflow-hidden rounded-3xl shadow-xl py-16 lg:py-0 border border-border/10"
          style={{ background: "linear-gradient(135deg, #05081a 0%, #0d1130 30%, #110a2a 60%, #070e1f 100%)" }}
        >
          <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-12">

            {/* Left: Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="flex-1 w-full lg:max-w-2xl space-y-6"
            >
              <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Discover the world's top AI agents with{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                  Agentflox
                </span>
              </h1>
              <p className="text-lg lg:text-xl text-zinc-300 leading-relaxed font-light">
                The premier workforce network to find bleeding-edge autonomous agents, tools, swarm workforces, and top human talent.
              </p>

              <form onSubmit={handleSearchSubmit} className="relative flex items-center mt-10 mb-2 max-w-xl group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/40 to-cyan-500/40 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity rounded-xl z-0" />
                <div className="relative flex items-center w-full z-10 bg-white border hover:border-zinc-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all rounded-xl shadow-lg overflow-hidden pr-2">
                  <Search className="w-6 h-6 ml-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search for integration or use-case..."
                    className="flex-1 bg-transparent border-0 outline-none px-4 py-4 text-[15px] sm:text-base text-zinc-900 placeholder:text-zinc-500 w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Button type="submit" size="lg" className="rounded-lg shadow-md bg-black text-white hover:bg-zinc-800 font-bold h-11 px-6">
                    Explore
                  </Button>
                </div>
              </form>
            </motion.div>

            {/* Right: Orbital Network */}
            <div className="flex-1 w-full hidden lg:flex items-center justify-center relative">
              <HeroNetwork />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 w-full z-10 flex flex-col gap-24">

        {/* 2. PREMIUM CATEGORIES GRID */}
        <section>
          <div className="flex items-end justify-between mb-8">
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Box className="w-6 h-6 text-primary" />
                Browse Categories
              </h3>
              <p className="text-muted-foreground mt-1 text-lg">Select a domain to start discovering specialized assets.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((cat, idx) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => navigateToCategory(cat.id)}
                className="group relative overflow-hidden cursor-pointer rounded-2xl bg-card border border-border p-6 hover:shadow-2xl hover:border-primary/50 hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`absolute right-0 top-0 w-32 h-32 bg-gradient-to-br ${cat.color} blur-3xl opacity-10 group-hover:opacity-30 transition-opacity rounded-full -mr-10 -mt-10`} />
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-white shadow-lg mb-6 group-hover:scale-110 transition-transform`}>
                  {cat.icon}
                </div>
                <h4 className="text-xl font-bold text-foreground">{cat.name}</h4>
                <p className="text-sm text-muted-foreground mt-1">{cat.details}</p>
                <div className="mt-6 flex items-center text-sm font-semibold text-primary opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                  Explore <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 3. DYNAMIC DUAL LAYOUT: FEATURED AGENTS + INFO BANNER */}
        <section className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 w-full min-w-0">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                Featured Agents
              </h3>
              <Button variant="ghost" className="group" onClick={() => navigateToCategory('agent')}>
                View all
                <ChevronRight className="ml-1 w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Button>
            </div>
            <FeedSection type="agent" limit={4} />
          </div>

          <div className="w-full lg:w-[400px] shrink-0 bg-gradient-to-b from-blue-600 to-indigo-800 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute -right-8 -top-8 w-64 h-64 bg-white/10 blur-3xl rounded-full" />
            <div className="absolute bottom-0 left-0 w-full h-full bg-[url('/grid.svg')] opacity-20 pointer-events-none" />
            <div className="relative z-10 w-full h-full flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-6">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-3xl font-extrabold mb-4">Need a custom solution built?</h4>
                <p className="text-blue-100 text-lg leading-relaxed">
                  Post a task or project to the marketplace and have the top 1% of talents and teams construct your vision automatically.
                </p>
              </div>
              <Button size="lg" className="w-full mt-8 bg-white text-blue-900 hover:bg-zinc-100 font-bold group" onClick={() => navigateToCategory('task')}>
                Browse Tasks
                <ChevronRight className="ml-2 w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Button>
            </div>
          </div>
        </section>

        {/* 4. OTHER SECTIONS */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Box className="w-6 h-6 text-purple-500" />
              Popular Tools
            </h3>
            <Button variant="ghost" className="group" onClick={() => navigateToCategory('tool')}>
              View all
              <ChevronRight className="ml-1 w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </Button>
          </div>
          <FeedSection type="tool" limit={4} />
        </section>

        <section>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Orbit className="w-6 h-6 text-orange-500" />
              Featured Workforces
            </h3>
            <Button variant="ghost" className="group" onClick={() => navigateToCategory('workforce')}>
              View all
              <ChevronRight className="ml-1 w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </Button>
          </div>
          <FeedSection type="workforce" limit={4} />
        </section>

        <section className="flex flex-col xl:flex-row gap-8">
          <div className="flex-1 w-full min-w-0">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <LayoutTemplate className="w-6 h-6 text-emerald-500" />
                Top Templates
              </h3>
              <Button variant="ghost" className="group" onClick={() => navigateToCategory('template')}>
                View all
                <ChevronRight className="ml-1 w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Button>
            </div>
            <FeedSection type="template" limit={4} />
          </div>
        </section>

        <section className="flex flex-col xl:flex-row gap-8">
          <div className="flex-1 w-full min-w-0">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-cyan-500" />
                Leading Talents
              </h3>
              <Button variant="ghost" className="group" onClick={() => navigateToCategory('talent')}>
                View all
                <ChevronRight className="ml-1 w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Button>
            </div>
            <FeedSection type="talent" limit={4} />
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <UsersRound className="w-6 h-6 text-rose-500" />
              Top Teams
            </h3>
            <Button variant="ghost" className="group" onClick={() => navigateToCategory('team')}>
              View all
              <ChevronRight className="ml-1 w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </Button>
          </div>
          <FeedSection type="team" limit={4} />
        </section>

      </div>
    </div>
  );
}

// ─── Feed helper (unchanged) ────────────────────────────────────────────────
function FeedSection({ type, limit }: { type: string; limit: number }) {
  const { data: listings, isLoading } = trpc.marketplace.searchListings.useQuery({
    type,
    sortBy: "popular",
    limit,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(limit)].map((_, i) => (
          <div key={i} className="h-48 bg-muted animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!listings || listings.length === 0) {
    return (
      <div className="w-full h-48 rounded-2xl border border-dashed border-border bg-card/50 flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
        <p>No featured <span className="capitalize">{type}</span>s currently available.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {listings.map(listing => (
        <ListingCard key={listing.id} listing={listing as any} />
      ))}
    </div>
  );
}