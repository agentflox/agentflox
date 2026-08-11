import React, { useState, useEffect } from 'react';
import { Wand2, Activity, Cpu, Sparkles } from 'lucide-react';

interface AgentChatEmptyStateProps {
  agentName?: string;
  agentAvatar?: string | null;
  type?: 'builder' | 'operator' | 'executor';
}

export const AgentChatEmptyState: React.FC<AgentChatEmptyStateProps> = ({
  agentName = 'Agent',
  type = 'executor',
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  const fullDescription =
    type === 'builder'
      ? 'Describe what you want your agent to accomplish. Share its main goals, preferred tone, or specific instructions, and we will help shape it to fit your exact workflow perfectly.'
      : type === 'operator'
        ? 'Easily oversee live agent sessions and step in whenever needed. You can take full control at any moment to guide responses, answer tricky questions, or keep conversations running smoothly.'
        : 'Type a message below to start chatting right away. Your agent is ready to help you brainstorm ideas, answer questions, or tackle complex tasks together step by step.';

  // Typing effect hook
  useEffect(() => {
    setDisplayedText('');
    setIsTyping(true);
    let index = 0;

    const intervalId = setInterval(() => {
      if (index < fullDescription.length) {
        setDisplayedText(fullDescription.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(intervalId);
      }
    }, 20); // Speed in milliseconds per character

    return () => clearInterval(intervalId);
  }, [fullDescription]);

  // Dynamic gradient based on agent type
  const agentNameGradient =
    type === 'builder'
      ? 'from-indigo-600 via-purple-600 to-pink-600'
      : type === 'operator'
        ? 'from-blue-600 via-cyan-600 to-teal-600'
        : 'from-orange-500 via-amber-400 to-cyan-500';

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-2xl mx-auto px-6 py-12 -mt-12 text-center animate-in fade-in zoom-in-[0.98] duration-700 ease-out">
      <div className="relative mb-8 group">
        {/* Dynamic Gradient Background Glows */}
        <div className="absolute -inset-10 rounded-full bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-pink-500/20 blur-3xl z-0 transition-all duration-1000 group-hover:opacity-100 opacity-60 animate-in fade-in" />
        <div className="absolute -inset-6 rounded-full bg-gradient-to-bl from-blue-500/20 via-cyan-500/20 to-teal-500/20 blur-2xl z-0 transition-all duration-1000 group-hover:opacity-100 opacity-50" />

        {/* Decorative Inner Ring / Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl blur-md opacity-20 group-hover:opacity-40 transition-opacity duration-700" />

        {/* Central Icon Container */}
        <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-white to-white/90 border border-white/60 shadow-xl backdrop-blur-xl transition-transform duration-700 group-hover:scale-[1.03]">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-indigo-500/10 to-pink-500/10 opacity-50" />

          <div className="relative">
            {type === 'builder' ? (
              <Wand2 className="h-7 w-7 text-indigo-500 drop-shadow-sm" strokeWidth={1.5} />
            ) : type === 'operator' ? (
              <Activity className="h-7 w-7 text-blue-500 drop-shadow-sm" strokeWidth={1.5} />
            ) : (
              <Cpu className="h-7 w-7 text-emerald-500 drop-shadow-sm" strokeWidth={1.5} />
            )}
          </div>
        </div>

        {/* Floating Sparkles around the box */}
        <Sparkles className="absolute -top-3 -right-3 h-4 w-4 text-indigo-400/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 z-20 animate-pulse" />
        <Sparkles className="absolute -bottom-1 -left-4 h-3 w-3 text-pink-400/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-300 z-20 animate-pulse" />
        <Sparkles className="absolute -top-4 -left-2 h-3 w-3 text-pink-400/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-200 z-20 animate-pulse" />
        <Sparkles className="absolute -bottom-4 -right-2 h-3 w-3 text-indigo-400/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-400 z-20 animate-pulse" />
      </div>

      <div className="relative z-10 space-y-3 mt-2 flex flex-col items-center">
        {/* Heading with Gradient Text on agentName */}
        <h2 className="text-2xl font-bold tracking-tight text-slate-800">
          {type === 'builder' ? 'Build ' : type === 'operator' ? 'Operate ' : 'Chat with '}
          <span className={`bg-gradient-to-r ${agentNameGradient} bg-clip-text text-transparent`}>
            {agentName}
          </span>
        </h2>

        {/* Description with typing animation */}
        <p className="text-[15px] text-slate-500 max-w-lg mx-auto leading-relaxed text-justify min-h-[72px]">
          {displayedText}
          {isTyping && (
            <span className="inline-block w-0.5 h-4 ml-0.5 bg-indigo-500 animate-pulse align-middle" />
          )}
        </p>
      </div>
    </div>
  );
};