import { Loader2 } from "lucide-react";
import Shell from "@/components/layout/Shell";

export default function DashboardLoading() {
  return (
    <Shell>
      <div className="flex h-[70vh] w-full flex-col items-center justify-center gap-4">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full blur-xl bg-primary/20 animate-pulse" />
          <Loader2 className="h-10 w-10 animate-spin text-primary relative z-10" strokeWidth={2} />
        </div>
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Loading dashboard...
        </p>
      </div>
    </Shell>
  );
}
