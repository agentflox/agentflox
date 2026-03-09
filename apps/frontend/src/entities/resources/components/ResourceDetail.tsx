import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Share2, FileText, Clock, User } from "lucide-react";
import { format } from "date-fns";
import type { Resource } from "../types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResourceVersions } from "./ResourceVersions";

interface ResourceDetailProps {
  resource: Resource;
  onEdit?: () => void;
}

export function ResourceDetail({ resource, onEdit }: ResourceDetailProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{resource.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            {resource.category && (
              <Badge variant="outline" className="text-sm">
                {resource.category}
              </Badge>
            )}
            <Badge
              variant={
                resource.status === "PUBLISHED"
                  ? "default"
                  : resource.status === "DRAFT"
                  ? "outline"
                  : "secondary"
              }
            >
              {resource.status}
            </Badge>
            {resource.isPublic && <Badge variant="secondary">Public</Badge>}
            {resource.isFeatured && <Badge variant="secondary">Featured</Badge>}
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button onClick={onEdit}>
            Edit Resource
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    {resource.description || "No description provided."}
                  </div>
                </CardContent>
              </Card>

              {resource.content && (
                <Card>
                  <CardHeader>
                    <CardTitle>Content</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none">
                      {typeof resource.content === "string" ? (
                        <div
                          dangerouslySetInnerHTML={{ __html: resource.content }}
                        />
                      ) : (
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(resource.content, null, 2)}
                        </pre>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Owner:</span>
                    <span>{resource.owner?.name || "Unknown"}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Created:</span>
                    <span>
                      {resource.createdAt
                        ? format(new Date(resource.createdAt), "MMM d, yyyy")
                        : "N/A"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Updated:</span>
                    <span>
                      {resource.updatedAt
                        ? format(new Date(resource.updatedAt), "MMM d, yyyy")
                        : "N/A"}
                    </span>
                  </div>

                  {resource.publishedAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Published:</span>
                      <span>
                        {format(new Date(resource.publishedAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  )}

                  {resource.priceUsd > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">Price:</span>
                      <span>${resource.priceUsd.toFixed(2)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {resource.tags && resource.tags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {resource.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle>Files</CardTitle>
            </CardHeader>
            <CardContent>
              {resource.fileUrl ? (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{resource.fileName || "File"}</p>
                      <p className="text-xs text-muted-foreground">
                        {resource.fileSize ? `${resource.fileSize} bytes` : ""}
                        {resource.fileMimeType ? ` • ${resource.fileMimeType}` : ""}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline">
                    <a href={resource.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </a>
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground">No file attached.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions">
          <ResourceVersions resourceId={resource.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
