import React from "react";
import { LayoutDashboard, AlertCircle } from "lucide-react";

export function DashboardLoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center">
      <div className="relative flex items-center justify-center">
        {/* Subtle background glow */}
        <div className="absolute h-24 w-24 animate-pulse rounded-full bg-primary/5 blur-xl" />
        
        {/* Outer rotating ring */}
        <div className="absolute h-16 w-16 animate-[spin_3s_linear_infinite] rounded-full border-b-2 border-l-2 border-primary/30" />
        
        {/* Inner rotating ring */}
        <div className="absolute h-12 w-12 animate-[spin_1.5s_linear_infinite_reverse] rounded-full border-t-2 border-r-2 border-primary/60" />
        
        {/* Center icon */}
        <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-background ring-1 ring-border shadow-sm backdrop-blur-sm">
          <LayoutDashboard className="h-4 w-4 text-primary animate-pulse" />
        </div>
      </div>
      
      <div className="mt-8 flex flex-col items-center space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium tracking-widest text-foreground uppercase">
            Initializing
          </h3>
          <div className="flex gap-1">
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/80" style={{ animationDelay: "0ms" }} />
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/80" style={{ animationDelay: "150ms" }} />
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/80" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
}

export function DashboardErrorState({ title = "Unable to load data", message }: { title?: string; message: string }) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center space-y-4">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 animate-pulse rounded-full bg-destructive/10 blur-xl" />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-destructive/20 backdrop-blur-sm">
          <AlertCircle className="h-5 w-5 text-destructive" />
        </div>
      </div>
      <div className="text-center space-y-1">
        <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {message}
        </p>
      </div>
    </div>
  );
}
