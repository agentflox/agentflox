import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
    Sparkles,
    BrainCircuit,
    MessageSquare,
    Cog,
    CheckCircle2,
    Network,
    Search,
    Wand2,
} from 'lucide-react';

interface ThinkingIndicatorProps {
    /** Stage string (legacy compat — used to pick fallback icon set) */
    stage?: string;
    /** Real-time step label pushed from the server via SSE */
    step?: string | null;
    /** Current graph node name (INTENT, BEHAVIOR, etc.) */
    node?: string | null;
    className?: string;
}

// Fallback animation used when no server-driven step is available yet
const FALLBACK_STEPS = [
    { text: 'Analyzing request...', icon: MessageSquare },
    { text: 'Checking context...', icon: Search },
    { text: 'Inferring automations...', icon: Sparkles },
    { text: 'Configuring agent...', icon: Cog },
    { text: 'Finalizing response...', icon: CheckCircle2 },
];

/** Maps graph node names → lucide icons */
const NODE_ICONS: Record<string, React.FC<any>> = {
    INTENT: MessageSquare,
    ROLE: BrainCircuit,
    SCOPE: Search,
    BEHAVIOR: Wand2,
    SKILLS: Sparkles,
    TOOLS: Cog,
    CAPABILITIES: Network,
    TRIGGERS: Cog,
    VERIFICATION: CheckCircle2,
    REFLECTION: BrainCircuit,
    APPROVAL: CheckCircle2,
    LAUNCH: Sparkles,
};

function pickIcon(node: string | null | undefined, step: string | null | undefined): React.FC<any> {
    if (node && NODE_ICONS[node]) return NODE_ICONS[node];
    // heuristic: pick icon from step keyword
    if (step) {
        const s = step.toLowerCase();
        if (s.includes('request') || s.includes('understand')) return MessageSquare;
        if (s.includes('context') || s.includes('load')) return Search;
        if (s.includes('config') || s.includes('extract')) return Cog;
        if (s.includes('graph') || s.includes('workflow') || s.includes('navigat')) return Network;
        if (s.includes('response') || s.includes('compos')) return Sparkles;
        if (s.includes('verif') || s.includes('check')) return CheckCircle2;
        if (s.includes('reflect') || s.includes('infer') || s.includes('skill')) return BrainCircuit;
    }
    return Sparkles;
}

/**
 * ThinkingIndicator
 *
 * Displays an animated thinking indicator while the agent builder is processing
 * a user message.
 *
 * Modes:
 * 1. **Server-driven** (preferred): pass `step` (and optionally `node`) from
 *    the SSE stream. The label updates in real-time as the server emits progress.
 * 2. **Fallback animation**: when `step` is null/undefined, cycles through the
 *    built-in steps at fixed intervals — the same behaviour as v1.
 */
export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
    stage,
    step,
    node,
    className,
}) => {
    // ─── Fallback animation state (used when no server-driven step) ────────────
    const [fallbackIndex, setFallbackIndex] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (step) {
            // Server-driven: no need for fallback timer
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            return;
        }

        // No server step — run animated fallback
        setFallbackIndex(0);
        timerRef.current = setInterval(() => {
            setFallbackIndex(prev => (prev + 1) % FALLBACK_STEPS.length);
        }, 1800);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [step, stage]);

    // ─── Determine display text + icon ────────────────────────────────────────
    const displayText = step ?? FALLBACK_STEPS[fallbackIndex].text;
    const Icon = step
        ? pickIcon(node, step)
        : FALLBACK_STEPS[fallbackIndex].icon;

    // ─── Friendly node label shown as a badge ─────────────────────────────────
    const nodeBadge = node
        ? node.charAt(0).toUpperCase() + node.slice(1).toLowerCase()
        : null;

    return (
        <div
            className={cn(
                'flex items-center gap-3 py-2 px-1 text-muted-foreground',
                className
            )}
        >
            {/* Animated icon */}
            <div className="relative flex-shrink-0">
                <Icon
                    className={cn(
                        'h-4 w-4',
                        step ? 'animate-spin text-primary' : 'animate-bounce'
                    )}
                    style={step ? { animationDuration: '1.4s' } : undefined}
                />
                <div className="absolute inset-0 bg-primary/20 blur-sm rounded-full animate-ping" />
            </div>

            {/* Label */}
            <span
                key={displayText} // trigger re-mount animation on text change
                className="text-sm font-medium tracking-tight transition-all duration-300 animate-in fade-in slide-in-from-left-2"
            >
                {displayText}
            </span>

            {/* Node badge (only in server-driven mode) */}
            {nodeBadge && (
                <span className="ml-auto text-[10px] font-semibold uppercase tracking-widest text-primary/60 bg-primary/10 rounded px-1.5 py-0.5 flex-shrink-0">
                    {nodeBadge}
                </span>
            )}

            {/* Typing dots */}
            <span className="flex gap-0.5 ml-1 flex-shrink-0">
                {[0, 1, 2].map(i => (
                    <span
                        key={i}
                        className="w-1 h-1 rounded-full bg-muted-foreground/60 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
                    />
                ))}
            </span>
        </div>
    );
};
