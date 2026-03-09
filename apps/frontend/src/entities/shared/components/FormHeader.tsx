import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Button from "@/components/ui/button";

interface FormHeaderProps {
  onBack: () => void;
  selectedTypeTitle?: string;
  lastSaved: Date | null;
  progress: number;
}

export function FormHeader({ onBack, selectedTypeTitle, lastSaved, progress }: FormHeaderProps) {
  return (
    <div className="mb-6">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          ← Back to Selection
        </Button>
        <div className="flex items-center gap-2">
          {selectedTypeTitle && (
            <Badge variant="outline">{selectedTypeTitle}</Badge>
          )}
          {lastSaved && (
            <span className="text-xs text-muted-foreground">
              Auto-saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}
