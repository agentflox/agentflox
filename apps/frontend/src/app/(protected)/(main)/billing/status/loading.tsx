import Shell from "@/components/layout/Shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatusLoading() {
  return (
    <Shell>
      <div className="flex items-center justify-center min-h-[400px] animate-in fade-in duration-500">
        <Card className="w-full max-w-md shadow-sm border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50">
          <CardHeader className="text-center pb-2">
            <Skeleton className="w-16 h-16 rounded-full mx-auto mb-4" />
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto mt-3" />
            <Skeleton className="h-4 w-56 mx-auto mt-2" />
          </CardHeader>
          <CardContent className="text-center space-y-4 pt-4">
            <div className="space-y-2 py-4">
              <Skeleton className="h-4 w-40 mx-auto" />
              <Skeleton className="h-4 w-32 mx-auto" />
              <Skeleton className="h-4 w-36 mx-auto" />
            </div>
            <div className="space-y-3 pt-2">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
