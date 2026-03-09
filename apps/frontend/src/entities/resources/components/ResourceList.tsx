import { CardSkeleton } from "@/components/ui/card.skeleton";
import type { Resource } from "../types";
import { ResourceCard } from "./ResourceCard";

interface ResourceListProps {
  resources: Resource[];
  isLoading?: boolean;
  onEdit?: (resource: Resource) => void;
  onDelete?: (resource: Resource) => void;
}

export function ResourceList({ resources, isLoading, onEdit, onDelete }: ResourceListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No resources found.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {resources.map((resource) => (
        <ResourceCard
          key={resource.id}
          resource={resource}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
