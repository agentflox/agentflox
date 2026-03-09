import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { MessageSquare, Search, BrainCircuit, Sparkles, CheckCircle2 } from 'lucide-react';

interface ChatThinkingIndicatorProps {
    contextType?: string;
    className?: string;
}

const THINKING_STEPS = [
    { text: 'Reading message...', icon: MessageSquare, duration: 1200 },
    { text: 'Gathering context...', icon: Search, duration: 1500 },
    { text: 'Analyzing workspace...', icon: BrainCircuit, duration: 1800 },
    { text: 'Crafting response...', icon: Sparkles, duration: 2000 },
    { text: 'Finalizing...', icon: CheckCircle2, duration: 1000 },
];

export const ChatThinkingIndicator: React.FC<ChatThinkingIndicatorProps> = ({
    contextType,
    className
}) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    useEffect(() => {
        // Reset when component mounts
        setCurrentStepIndex(0);

        let timeoutId: NodeJS.Timeout;

        const advanceStep = () => {
            setCurrentStepIndex((prev) => {
                const next = prev + 1;
                if (next < THINKING_STEPS.length) {
                    timeoutId = setTimeout(advanceStep, THINKING_STEPS[next].duration);
                    return next;
                }
                // Loop back to middle steps if it takes too long
                timeoutId = setTimeout(() => setCurrentStepIndex(1), 1000);
                return prev;
            });
        };

        // Start the cycle
        timeoutId = setTimeout(advanceStep, THINKING_STEPS[0].duration);

        return () => clearTimeout(timeoutId);
    }, [contextType]);

    const CurrentIcon = THINKING_STEPS[currentStepIndex].icon;

    return (
        <div className={cn("flex items-center gap-3 py-3 px-4 text-muted-foreground animate-pulse", className)}>
            <div className="relative">
                <CurrentIcon className="h-4 w-4 animate-bounce" />
                <div className="absolute inset-0 bg-primary/20 blur-sm rounded-full animate-ping" />
            </div>
            <span className="text-sm font-medium tracking-tight">
                {THINKING_STEPS[currentStepIndex].text}
            </span>
        </div>
    );
};
