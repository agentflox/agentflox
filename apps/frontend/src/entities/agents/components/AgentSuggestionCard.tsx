"use client";

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';

export interface AgentSuggestionCardProps {
  id: string;
  title: string;
  description: string;
  icon: string;
  gradient: string;
  message: string;
  onClick: () => void;
  disabled?: boolean;
}

export const AgentSuggestionCard: React.FC<AgentSuggestionCardProps> = ({
  title,
  description,
  icon,
  gradient,
  onClick,
  disabled = false,
}) => {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden cursor-pointer transition-all duration-200",
        "hover:shadow-lg hover:-translate-y-0.5",
        "border hover:border-primary/30",
        "bg-gradient-to-br from-card to-card/50",
        disabled && "opacity-50 cursor-not-allowed pointer-events-none"
      )}
      onClick={() => !disabled && onClick()}
    >
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-200",
        `bg-gradient-to-br ${gradient}`
      )} />
      <CardContent className="relative p-5">
        <div className="flex flex-col gap-3">
          <div className="text-3xl group-hover:scale-110 transition-transform duration-200">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1.5 group-hover:text-primary transition-colors">
              {title}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

