import { ExternalLinkIcon, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
interface ToolData {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  productUrl: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ToolViewProps {
  tool: ToolData;
}

export function ToolView({ tool }: ToolViewProps) {
  return (
    <div className="space-y-8">
      <header className="space-y-3 border-b pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-4xl font-extrabold tracking-tight">{tool.name}</h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm font-semibold">{tool.category}</Badge>
            <Badge variant={tool.isPublic ? "default" : "secondary"} className="text-sm font-semibold">
              {tool.isPublic ? "Public" : "Private"}
            </Badge>
          </div>
        </div>
        <p className="max-w-4xl text-lg text-muted-foreground">{tool.description || "No description provided for this tool."}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">About</h2>
          <p className="text-sm text-muted-foreground">Manage metadata and links for this tool.</p>
        </div>

        <div className="lg:col-span-1 space-y-4">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-xl">Administrative Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 pt-2 border-t">
                <div className="text-xs flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3"/> Created</span>
                  <span className="font-medium text-foreground">{tool.createdAt.toLocaleDateString()}</span>
                </div>
                <div className="text-xs flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3"/> Last Updated</span>
                  <span className="font-medium text-foreground">{tool.updatedAt.toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="py-3">
              <CardTitle className="text-lg">Access</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button variant="outline" className="w-full" asChild>
                <a href={tool.productUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2">
                  Open Tool Link <ExternalLinkIcon className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="pt-4 border-t">
        <div className="flex gap-3">
          <Button variant="primary">Edit Tool</Button>
          <Button variant="destructive">Delete Tool</Button>
        </div>
      </div>
    </div>
  );
}
