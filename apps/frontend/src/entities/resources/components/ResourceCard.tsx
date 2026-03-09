import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { FileText, Download, Share2, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from "next/link";
import type { Resource } from "../types";

interface ResourceCardProps {
  resource: Resource;
  onEdit?: (resource: Resource) => void;
  onDelete?: (resource: Resource) => void;
}

export function ResourceCard({ resource, onEdit, onDelete }: ResourceCardProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold line-clamp-2">{resource.title}</h3>
            {resource.category && (
              <Badge variant="outline" className="text-xs">
                {resource.category}
              </Badge>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(resource)}>Edit</DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => onDelete?.(resource)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {resource.description || "No description provided."}
        </p>
      </CardContent>
      <CardFooter className="pt-2">
        <div className="w-full flex justify-between items-center text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileText className="h-3 w-3" />
            <span>{resource.fileName ? resource.fileName : "No file"}</span>
          </div>
          <div>
            {resource.updatedAt && (
              <span>Updated {format(new Date(resource.updatedAt), "MMM d, yyyy")}</span>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
