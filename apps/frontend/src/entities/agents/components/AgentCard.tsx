"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentCardProps {
    name: string;
  avatar: string;
  description?: string;
  agentType?: string;
  isActive?: boolean;
  className?: string;
}

export const AgentCard: React.FC<AgentCardProps> = ({
  name,
  avatar,
  description,
  agentType,
  isActive = false,
  className,
}) => {
  return (
    <Card className={cn(
      "relative overflow-hidden border-2 transition-all duration-300",
      isActive ? "border-primary shadow-lg shadow-primary/20" : "border-border",
      className
    )}>
      {/* Holographic gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 opacity-50" />
      
      <CardContent className="relative p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center text-3xl border-2 border-primary/30 shadow-lg">
              {avatar || '🤖'}
            </div>
            {isActive && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-background shadow-lg animate-pulse" />
          )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold truncate flex items-center gap-2">
                  {name || 'Untitled Agent'}
                  {isActive && (
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  )}
                </h3>
                {description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {description}
                  </p>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {agentType && (
                <Badge variant="outline" className="text-xs">
                  <Bot className="h-3 w-3 mr-1" />
                  {agentType.replace('_', ' ')}
                </Badge>
              )}
              {isActive && (
                <Badge variant="default" className="text-xs bg-green-500">
                  Active
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

