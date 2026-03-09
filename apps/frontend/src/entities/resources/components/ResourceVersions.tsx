import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Download, GitCommit } from "lucide-react";
import type { ResourceVersion } from "../types";

interface ResourceVersionsProps {
  resourceId: string;
}

export function ResourceVersions({ resourceId }: ResourceVersionsProps) {
  const { data: versions, isLoading } = trpc.resource.getVersions.useQuery({ resourceId });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (!versions || versions.length === 0) {
    return <p className="text-muted-foreground">No versions found.</p>;
  }

  return (
    <div className="space-y-4">
      {versions.map((version) => (
        <VersionCard key={version.id} version={version} />
      ))}
    </div>
  );
}

function VersionCard({ version }: { version: ResourceVersion }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <GitCommit className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-sm">v{version.version}</span>
            <span className="text-sm text-muted-foreground">
              {format(new Date(version.createdAt), "MMM d, yyyy")}
            </span>
          </div>
          <h3 className="mt-1 font-medium">{version.title}</h3>
          {version.changeLog && (
            <p className="text-sm text-muted-foreground mt-1">
              {version.changeLog}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            {version.creator?.image && (
              <img
                src={version.creator.image}
                alt={version.creator.name || "User"}
                className="h-4 w-4 rounded-full"
              />
            )}
            <span>{version.creator?.name || "Unknown"}</span>
          </div>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>
    </div>
  );
}
