"use client";
import { useMemo } from "react";
import { FormField } from "@/components/ui/form";
import { setCurrentProject, upsertProject } from "@/stores/slices/project.slice";
import { RootState } from "@/stores/store";
import { trpc } from "@/lib/trpc";
import { projectSchema } from "../validations/project.schema";
import { projectFields } from "../constants";
import { useEntityForm } from "@/entities/shared/hooks/useEntityForm";
import { useEntityMutations } from "@/entities/shared/hooks/useEntityMutations";
import { FormActions } from "@/entities/shared/components/FormActions";
import { supabase } from '@/lib/supabase/client';
import { DASHBOARD_ROUTES } from "@/constants/routes.config";

interface ProjectFormProps {
  projectId: string;
  mode?: "create" | "edit";
}

export default function ProjectForm({ projectId, mode = "create" }: ProjectFormProps) {
  const {
    formData,
    errors,
    lastSaved,
    handleFieldChange,
    resetForm,
    handleValidationError,
    setLastSaved,
  } = useEntityForm({
    entityId: projectId,
    setCurrentAction: setCurrentProject,
    upsertAction: upsertProject,
    selectItems: (s: RootState) => s.projects.items,
    // No initialType - projects don't have types
  });

  const publishMutation = trpc.project.publish.useMutation();
  const updateMutation = trpc.project.update.useMutation();
  const saveDraftMutation = trpc.project.saveDraft.useMutation();
  const deleteMutation = trpc.project.delete.useMutation();

  const {
    handlePublish,
    handleUpdate,
    handleSaveDraft,
    handleDelete,
    isPublishing,
    isUpdating,
    isSavingDraft,
    isDeleting,
  } = useEntityMutations({
    entityId: projectId,
    formData,
    validationSchema: projectSchema,
    publishMutation,
    updateMutation,
    saveDraftMutation,
    deleteMutation,
    upsertAction: upsertProject,
    redirectPath: DASHBOARD_ROUTES.PROJECTS,
    setLastSaved,
    onValidationError: handleValidationError,
  });

  const progress = useMemo(() => {
    const totalFields = projectFields.length;
    const filledFields = projectFields.filter((field: any) =>
      formData[field.id] !== undefined && formData[field.id] !== ''
    ).length;
    return totalFields > 0 ? (filledFields / totalFields) * 100 : 0;
  }, [formData]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {projectFields.map((field: any) => (
          <FormField
            key={field.id}
            field={field}
            value={formData[field.id]}
            onChange={(value) => handleFieldChange(field.id, value)}
            error={errors[field.id]}
          />
        ))}

        <FormActions
          mode={mode}
          onPublish={handlePublish}
          onUpdate={handleUpdate}
          onSaveDraft={handleSaveDraft}
          onDelete={handleDelete}
          onCancel={() => {
            if (confirm('Discard local changes?')) {
              resetForm();
            }
          }}
          isPublishing={isPublishing}
          isUpdating={isUpdating}
          isSavingDraft={isSavingDraft}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
}
