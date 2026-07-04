"use client";
import React, { useEffect, useRef } from 'react';
import { ArrowRight, Sparkles, LayoutDashboard, Bot, Users, ShoppingBag } from 'lucide-react';
import { gsap } from 'gsap';
import Link from 'next/link';
import { ROUTES } from '../../lib/config';

const NODES_META = [
    { id: 'management', title: 'Project Canvas', desc: 'Centralized Planning', icon: LayoutDashboard, color: 'text-indigo-400', iconBg: 'bg-indigo-500/15', iconBorder: 'border-indigo-500/30', nx: 0.50, ny: 0.10, floatClass: 'node-float-1' },
    { id: 'agent', title: 'AI Agent', desc: 'Autonomous Execution', icon: Bot, color: 'text-emerald-400', iconBg: 'bg-emerald-500/15', iconBorder: 'border-emerald-500/30', nx: 0.88, ny: 0.50, floatClass: 'node-float-2' },
    { id: 'workforce', title: 'AI Workforce', desc: 'Team Utilization', icon: Users, color: 'text-purple-400', iconBg: 'bg-purple-500/15', iconBorder: 'border-purple-500/30', nx: 0.50, ny: 0.90, floatClass: 'node-float-3' },
    { id: 'marketplace', title: 'Marketplace', desc: 'Templates & Skills', icon: ShoppingBag, color: 'text-pink-400', iconBg: 'bg-pink-500/15', iconBorder: 'border-pink-500/30', nx: 0.12, ny: 0.50, floatClass: 'node-float-4' },
];

const COLORS = [
    [129, 140, 248],  // indigo
    [52, 211, 153],  // emerald
    [192, 132, 252],  // purple
    [244, 114, 182],  // pink
] as const;

export const HeroSection = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const demoRef = useRef<HTMLDivElement>(null);

    /* GSAP entrance */
    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.timeline({ defaults: { ease: 'power3.out' } })
                .from('.hero-text-block', { y: 30, opacity: 0, duration: 1, stagger: 0.15 })
                .from('.hero-demo-box', { scale: 0.95, opacity: 0, duration: 1, ease: 'expo.out' }, '-=0.5');
        }, containerRef);
        return () => ctx.revert();
    }, []);

    /* Node floating */
    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        gsap.to('.node-float-1', { y: -10, duration: 2.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
        gsap.to('.node-float-2', { y: -13, duration: 2.3, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 0.5 });
        gsap.to('.node-float-3', { y: -9, duration: 2.9, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 1 });
        gsap.to('.node-float-4', { y: -12, duration: 2.5, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 1.5 });
    }, []);

    /* Canvas animation */
    useEffect(() => {
        const canvas = canvasRef.current;
        const demo = demoRef.current;
        if (!canvas || !demo) return;

        const ctx2d = canvas.getContext('2d')!;
        let raf = 0;
        let alive = true;

        // ── dimensions (logical pixels, DPR-aware) ──────────────────────────
        let W = 0, H = 0, DPR = 1;

        const setSize = () => {
            const rect = demo.getBoundingClientRect();
            W = rect.width;
            H = rect.height;
            DPR = window.devicePixelRatio || 1;
            canvas.width = W * DPR;
            canvas.height = H * DPR;
            // reset transform, then scale once for DPR
            ctx2d.setTransform(DPR, 0, 0, DPR, 0, 0);
        };
        setSize();

        const ro = new ResizeObserver(setSize);
        ro.observe(demo);

        // ── particles ────────────────────────────────────────────────────────
        type P = { x: number; y: number; r: number; a: number; dx: number; dy: number };
        const pts: P[] = Array.from({ length: 110 }, () => ({
            x: Math.random(),   // normalized 0-1
            y: Math.random(),
            r: 0.4 + Math.random() * 1.2,
            a: 0.06 + Math.random() * 0.22,
            dx: (Math.random() - 0.5) * 0.00012,
            dy: (Math.random() - 0.5) * 0.00012,
        }));

        // ── helpers ──────────────────────────────────────────────────────────
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

        /**
         * Draw ONE bezier arc between two points with a travelling bright blob.
         */
        const drawEdge = (
            x0: number, y0: number,
            x1: number, y1: number,
            [r, g, b]: readonly [number, number, number],
            t: number,   // 0-1 head progress along the curve
        ) => {
            // off-centre control point for a nice arc
            const cx = (x0 + x1) / 2 + (y1 - y0) * 0.15;
            const cy = (y0 + y1) / 2 - (x1 - x0) * 0.15;

            // ── dim base line ──
            ctx2d.beginPath();
            ctx2d.moveTo(x0, y0);
            ctx2d.quadraticCurveTo(cx, cy, x1, y1);
            ctx2d.strokeStyle = `rgba(${r},${g},${b},0.08)`;
            ctx2d.lineWidth = 1.5;
            ctx2d.stroke();

            // ── glowing head: sample points along the bezier ──
            const N = 100;
            const SPAN = 0.20; // how long the tail is (0-1)

            for (let i = 0; i < N; i++) {
                const frac = i / N;
                const dist = ((t - frac) + 1) % 1; // distance behind head
                if (dist > SPAN) continue;

                const u = frac;
                const pu = (1 - u) * (1 - u);
                const bx = pu * x0 + 2 * (1 - u) * u * cx + u * u * x1;
                const by = pu * y0 + 2 * (1 - u) * u * cy + u * u * y1;
                const power = 1 - dist / SPAN;

                // glow spread
                const grd = ctx2d.createRadialGradient(bx, by, 0, bx, by, 8 * power + 2);
                grd.addColorStop(0, `rgba(${r},${g},${b},${0.85 * power})`);
                grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
                ctx2d.beginPath();
                ctx2d.arc(bx, by, 8 * power + 2, 0, Math.PI * 2);
                ctx2d.fillStyle = grd;
                ctx2d.fill();
            }

            // ── bright dot exactly at head ──
            const hu = t;
            const pu2 = (1 - hu) * (1 - hu);
            const hx = pu2 * x0 + 2 * (1 - hu) * hu * cx + hu * hu * x1;
            const hy = pu2 * y0 + 2 * (1 - hu) * hu * cy + hu * hu * y1;

            const dotG = ctx2d.createRadialGradient(hx, hy, 0, hx, hy, 14);
            dotG.addColorStop(0, `rgba(${r},${g},${b},1)`);
            dotG.addColorStop(0.3, `rgba(${r},${g},${b},0.55)`);
            dotG.addColorStop(1, `rgba(${r},${g},${b},0)`);
            ctx2d.beginPath();
            ctx2d.arc(hx, hy, 14, 0, Math.PI * 2);
            ctx2d.fillStyle = dotG;
            ctx2d.fill();

            // tiny solid core
            ctx2d.beginPath();
            ctx2d.arc(hx, hy, 2.5, 0, Math.PI * 2);
            ctx2d.fillStyle = `rgba(${r},${g},${b},1)`;
            ctx2d.fill();
        };

        const drawPulse = (
            x: number, y: number,
            [r, g, b]: readonly [number, number, number],
            phase: number,
        ) => {
            for (let i = 0; i < 2; i++) {
                const p = ((phase + i * 0.5) % 1);
                const radius = 24 + p * 28;
                const alpha = (1 - p) * 0.3;
                ctx2d.beginPath();
                ctx2d.arc(x, y, radius, 0, Math.PI * 2);
                ctx2d.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
                ctx2d.lineWidth = 1.5;
                ctx2d.stroke();
            }
        };

        // ── animation loop ───────────────────────────────────────────────────
        const start = performance.now();

        const tick = (now: number) => {
            if (!alive) return;
            raf = requestAnimationFrame(tick);

            if (W === 0 || H === 0) return;

            const elapsed = now - start;

            ctx2d.clearRect(0, 0, W, H);

            // node world coords
            const nw = NODES_META.map(n => ({ x: n.nx * W, y: n.ny * H }));
            const edges = [[0, 1], [1, 2], [2, 3], [3, 0]] as const;

            // particles
            for (const p of pts) {
                p.x = (p.x + p.dx + 1) % 1;
                p.y = (p.y + p.dy + 1) % 1;
                ctx2d.beginPath();
                ctx2d.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
                ctx2d.fillStyle = `rgba(150,140,255,${p.a})`;
                ctx2d.fill();
            }

            // edges
            ctx2d.save();
            ctx2d.lineCap = 'round';
            for (let i = 0; i < edges.length; i++) {
                const [a, b] = edges[i];
                const head = ((elapsed * 0.00028) + i * 0.25) % 1;
                drawEdge(nw[a].x, nw[a].y, nw[b].x, nw[b].y, COLORS[i], head);
            }
            ctx2d.restore();

            // pulses
            for (let i = 0; i < NODES_META.length; i++) {
                const phase = ((elapsed * 0.00020) + i * 0.25) % 1;
                drawPulse(nw[i].x, nw[i].y, COLORS[i], phase);
            }

            // centre ambient glow
            const pulse = 0.5 + 0.5 * Math.sin(elapsed * 0.00085);
            const cg = ctx2d.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.min(W, H) * 0.4);
            cg.addColorStop(0, `rgba(99,102,241,${0.10 * pulse})`);
            cg.addColorStop(1, 'rgba(99,102,241,0)');
            ctx2d.beginPath();
            ctx2d.arc(W / 2, H / 2, Math.min(W, H) * 0.4, 0, Math.PI * 2);
            ctx2d.fillStyle = cg;
            ctx2d.fill();
        };

        raf = requestAnimationFrame(tick);

        return () => {
            alive = false;
            cancelAnimationFrame(raf);
            ro.disconnect();
        };
    }, []);

    return (
        <section
            ref={containerRef}
            className="relative min-h-[95vh] w-full flex flex-col justify-center overflow-hidden bg-[#030303] text-white pt-32 pb-16"
        >
            <div className="container relative z-10 mx-auto px-6 lg:px-12">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

                    {/* Left: copy */}
                    <div className="max-w-2xl">
                        <div className="hero-text-block mb-8">
                            <span className="px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-xs font-medium text-indigo-300 uppercase tracking-widest inline-flex items-center gap-2">
                                <Sparkles size={12} className="text-indigo-400" />
                                The Agentic Workspace
                            </span>
                        </div>

                        <h1 className="hero-text-block text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter leading-[1.05] mb-8 text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400">
                            Run your work.<br />
                            <span className="text-white">Delegate to your AI.</span><br />
                            One system.
                        </h1>

                        <p className="hero-text-block text-lg md:text-xl text-gray-400 leading-relaxed mb-10 font-light">
                            Agentflox brings your teams, projects, and autonomous agents into one workspace.
                            Describe what you need done, and your AI workforce builds, executes, and reports back.
                        </p>

                        <div className="hero-text-block flex flex-wrap gap-5 mt-4">
                            {/* Primary Button */}
                            <Link href={ROUTES.SIGNUP} className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-500 rounded-xl hover:scale-[1.02]">
                                {/* Full Gradient Background (Border) */}
                                <div className="absolute inset-0 w-full h-full rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-80 group-hover:opacity-100 transition-opacity duration-500"></div>
                                
                                {/* Inner Dark Background (fades out on hover to reveal vibrant gradient) */}
                                <div className="absolute inset-[1.5px] rounded-[10.5px] bg-[#050505] group-hover:bg-opacity-0 transition-all duration-500 z-0"></div>
                                
                                {/* Light Ray Sweep */}
                                <div className="absolute inset-0 overflow-hidden rounded-xl z-10">
                                    <div className="absolute top-0 left-0 h-full w-[200%] -translate-x-[150%] group-hover:translate-x-[50%] transition-transform duration-1000 ease-out">
                                        <div className="h-full w-24 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-[20deg]" />
                                    </div>
                                </div>

                                {/* Content */}
                                <span className="relative z-20 flex items-center gap-3 text-lg font-semibold text-white transition-all duration-300">
                                    Start Building Free
                                    <ArrowRight size={20} className="text-pink-400 group-hover:text-white group-hover:translate-x-1.5 transition-all duration-300" />
                                </span>
                                
                                {/* Intense Ambient Glow */}
                                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur-xl opacity-30 group-hover:opacity-70 transition-all duration-500 z-[-1]"></div>
                            </Link>

                            {/* Secondary Button */}
                            <Link href="/book-demo" className="group relative inline-flex items-center justify-center px-8 py-4 font-medium text-white transition-all duration-500 rounded-xl hover:scale-[1.02] overflow-hidden bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                                {/* Light Ray Sweep */}
                                <div className="absolute inset-0 overflow-hidden rounded-xl z-10 pointer-events-none">
                                    <div className="absolute top-0 left-0 h-full w-[200%] -translate-x-[150%] group-hover:translate-x-[50%] transition-transform duration-1000 ease-out delay-100">
                                        <div className="h-full w-20 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-[20deg]" />
                                    </div>
                                </div>
                                <span className="relative z-20 flex items-center gap-2 text-lg">
                                    Book a Demo
                                </span>
                            </Link>
                        </div>
                    </div>

                    {/* Right: animated canvas */}
                    <div
                        ref={demoRef}
                        className="hero-demo-box relative w-full aspect-square md:aspect-[4/3] rounded-3xl bg-[#050505] border border-white/[0.07] shadow-[0_0_120px_rgba(79,70,229,0.14)] overflow-hidden"
                    >
                        <canvas
                            ref={canvasRef}
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
                        />

                        {/* Glassmorphic node labels */}
                        <div className="absolute inset-0" style={{ zIndex: 2, pointerEvents: 'none' }}>
                            {NODES_META.map((node) => {
                                const Icon = node.icon;
                                return (
                                    <div
                                        key={node.id}
                                        className={`absolute ${node.floatClass}`}
                                        style={{ left: `${node.nx * 100}%`, top: `${node.ny * 100}%`, transform: 'translate(-50%, -50%)' }}
                                    >
                                        <div className="p-px rounded-2xl bg-gradient-to-b from-white/20 via-white/[0.06] to-transparent">
                                            <div className="rounded-[15px] bg-[#080808]/80 backdrop-blur-2xl px-3 py-2.5 md:px-4 md:py-3 overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] relative">
                                                <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                                                <div className="flex items-center gap-2.5 md:gap-3">
                                                    <div className={`w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center border ${node.iconBg} ${node.iconBorder}`}>
                                                        <Icon size={16} className={node.color} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-white font-semibold text-[11px] md:text-xs tracking-wide leading-tight whitespace-nowrap">{node.title}</h3>
                                                        <p className="text-gray-500 text-[9px] md:text-[10px] mt-0.5 leading-tight whitespace-nowrap">{node.desc}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};