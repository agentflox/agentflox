"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AgentActivationStepProps {
  agent: any;
  onActivated: () => void;
  onEdit: (section: string) => void;
}

export function AgentActivationStep({
  agent,
  onActivated,
  onEdit,
}: AgentActivationStepProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{agent?.name || "Agent Review"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Review the generated agent details, then activate it when you're ready.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onEdit("overview")}>
              Edit overview
            </Button>
            <Button type="button" variant="primary" onClick={onActivated}>
              Activate agent
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
