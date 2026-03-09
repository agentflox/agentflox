import { Card, CardContent } from "@/components/ui/card";
import Button from "@/components/ui/button";

interface FormActionsProps {
  mode: "create" | "edit";
  onPublish: () => Promise<boolean>;
  onUpdate: () => Promise<boolean>;
  onSaveDraft: () => Promise<boolean>;
  onDelete: () => Promise<void>;
  onCancel: () => void;
  isPublishing: boolean;
  isUpdating: boolean;
  isSavingDraft: boolean;
  isDeleting: boolean;
}

export function FormActions({
  mode,
  onPublish,
  onUpdate,
  onSaveDraft,
  onDelete,
  onCancel,
  isPublishing,
  isUpdating,
  isSavingDraft,
  isDeleting,
}: FormActionsProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2">
          {mode === "create" ? (
            <>
              <Button
                variant="outline"
                onClick={onSaveDraft}
                disabled={isSavingDraft}
              >
                {isSavingDraft ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button
                variant="primary"
                className="cursor-pointer"
                onClick={onPublish}
                disabled={isPublishing}
              >
                {isPublishing ? 'Publishing...' : 'Publish'}
              </Button>
            </>
          ) : (
            <>
              <Button 
                onClick={onSaveDraft} 
                disabled={isSavingDraft}
                variant="outline"
              >
                {isSavingDraft ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button onClick={onUpdate} disabled={isUpdating}>
                {isUpdating ? 'Updating...' : 'Update'}
              </Button>
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button variant="outline" onClick={onDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
