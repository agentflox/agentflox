import React from 'react';
import { cn } from '@/lib/utils';
import {
    MessageSquare,
    Search,
    Sparkles,
    Cog,
    CheckCircle2,
    Network,
    Wand2,
    BrainCircuit,
    Check,
} from 'lucide-react';

/** A single completed thinking step */
export interface ThinkingStep {
    step: string;
    node?: string;
    timestamp: number;
}

interface StreamingMessageProps {
    /** Completed thinking steps (checkmarks) */
    thinkingSteps: ThinkingStep[];
    /** Current in-progress step (spinner label) */
    currentStep: string | null;
    /** Current graph node for the in-progress step */
    currentNode: string | null;
    /** Accumulated streamed response text (grows character-by-character) */
    streamingContent: string;
    /** True once first token received — switches from thinking to streaming mode */
    isStreaming: boolean;
    /** Optional display name for the agent brand label */
    agentLabel?: string;
    className?: string;
}

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

function pickIcon(node?: string, step?: string): React.FC<any> {
    if (node && NODE_ICONS[node]) return NODE_ICONS[node];
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

/** Colorful multi-stop sparkle SVG icon matching the brand style in the image */
const AgentfloxSparkleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
    >
        <defs>
            <linearGradient id="sparkle-grad-a" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
            <linearGradient id="sparkle-grad-b" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
        </defs>
        {/* Petals */}
        <path
            d="M12 2C12 2 13.5 6.5 12 9C10.5 6.5 12 2 12 2Z"
            fill="url(#sparkle-grad-a)"
        />
        <path
            d="M12 22C12 22 10.5 17.5 12 15C13.5 17.5 12 22 12 22Z"
            fill="url(#sparkle-grad-a)"
        />
        <path
            d="M2 12C2 12 6.5 10.5 9 12C6.5 13.5 2 12 2 12Z"
            fill="url(#sparkle-grad-b)"
        />
        <path
            d="M22 12C22 12 17.5 13.5 15 12C17.5 10.5 22 12 22 12Z"
            fill="url(#sparkle-grad-b)"
        />
        {/* Diagonal petals */}
        <path
            d="M5.636 5.636C5.636 5.636 9.172 8.343 8.485 11C5.829 10.313 5.636 5.636 5.636 5.636Z"
            fill="url(#sparkle-grad-a)"
        />
        <path
            d="M18.364 18.364C18.364 18.364 14.828 15.657 15.515 13C18.171 13.687 18.364 18.364 18.364 18.364Z"
            fill="url(#sparkle-grad-a)"
        />
        <path
            d="M18.364 5.636C18.364 5.636 15.657 9.172 13 8.485C13.687 5.829 18.364 5.636 18.364 5.636Z"
            fill="url(#sparkle-grad-b)"
        />
        <path
            d="M5.636 18.364C5.636 18.364 8.343 14.828 11 15.515C10.313 18.171 5.636 18.364 5.636 18.364Z"
            fill="url(#sparkle-grad-b)"
        />
        {/* Center */}
        <circle cx="12" cy="12" r="2.5" fill="url(#sparkle-grad-a)" />
    </svg>
);

/**
 * StreamingMessage
 *
 * A unified assistant message bubble that shows:
 *   1. A branded agent name header (icon + label) matching the image design
 *   2. Completed thinking steps as green checkmarks (appear and stay)
 *   3. The current in-progress step with a spinner + typing dots
 *   4. The streaming response text growing character-by-character below the steps
 *
 * Designed to live in the chat list as the "pending" message while the server
 * is processing, then be replaced by the final DB message on `complete`.
 */
export const StreamingMessage: React.FC<StreamingMessageProps> = ({
    thinkingSteps,
    currentStep,
    currentNode,
    streamingContent,
    isStreaming,
    agentLabel,
    className,
}) => {
    const CurrentIcon = pickIcon(currentNode ?? undefined, currentStep ?? undefined);

    return (
        <div className={cn('flex flex-col gap-2 py-1', className)}>
            {/* ─── Agent brand header (icon + name) ───────────────────────────── */}
            <div className="flex items-center gap-2 mb-0.5">
                <AgentfloxSparkleIcon className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-semibold text-foreground/90 tracking-tight">
                    {agentLabel ?? 'Agentflox Agent'}
                </span>
            </div>

            {/* ─── Completed thinking steps (green checkmarks) ────────────────── */}
            {thinkingSteps.map((s, i) => {
                const Icon = pickIcon(s.node, s.step);
                return (
                    <div
                        key={i}
                        className="flex items-center gap-2 text-xs text-muted-foreground/70 animate-in fade-in slide-in-from-left-2 duration-300"
                    >
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15 flex-shrink-0">
                            <Check className="h-2.5 w-2.5 text-emerald-500" />
                        </span>
                        <span className="font-medium">{s.step}</span>
                        {s.node && (
                            <span className="text-[9px] uppercase tracking-widest text-primary/40 bg-primary/8 rounded px-1">
                                {s.node.charAt(0) + s.node.slice(1).toLowerCase()}
                            </span>
                        )}
                    </div>
                );
            })}

            {/* ─── Current in-progress step (spinner) ─────────────────────────── */}
            {currentStep && !isStreaming && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground animate-in fade-in duration-200">
                    <div className="relative flex-shrink-0 h-4 w-4">
                        <CurrentIcon
                            className="h-4 w-4 text-primary animate-spin"
                            style={{ animationDuration: '1.4s' }}
                        />
                        <div className="absolute inset-0 bg-primary/15 blur-sm rounded-full animate-ping" />
                    </div>
                    <span className="font-medium tracking-tight">{currentStep}</span>
                    {/* Typing dots */}
                    <span className="flex gap-0.5">
                        {[0, 1, 2].map(i => (
                            <span
                                key={i}
                                className="w-1 h-1 rounded-full bg-muted-foreground/50 animate-bounce"
                                style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
                            />
                        ))}
                    </span>
                </div>
            )}

            {/* ─── Streaming response text ─────────────────────────────────────── */}
            {streamingContent && (
                <div className={cn(
                    'mt-0.5 text-[15px] text-slate-800 leading-relaxed whitespace-pre-wrap',
                    'animate-in fade-in duration-150',
                )}>
                    {streamingContent}
                    {/* Blinking cursor while streaming */}
                    <span
                        className="inline-block w-[2px] h-[1em] bg-slate-600/70 ml-0.5 align-middle animate-[blink_1s_step-end_infinite]"
                    />
                </div>
            )}

            {/* Fallback: no steps and no content yet — initial heartbeat */}
            {thinkingSteps.length === 0 && !currentStep && !streamingContent && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                    <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary/50" />
                    <span>Starting...</span>
                </div>
            )}
        </div>
    );
};
