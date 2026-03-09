"use client";
import { useMemo } from "react";
import { FormField } from "@/components/ui/form";
import { setCurrentTeam, upsertTeam } from "@/stores/slices/team.slice";
import { RootState } from "@/stores/store";
import { trpc } from "@/lib/trpc";
import { teamSchema } from "../validations/team.schema";
import { useEntityForm } from "@/entities/shared/hooks/useEntityForm";
import { useEntityMutations } from "@/entities/shared/hooks/useEntityMutations";
import { FormActions } from "@/entities/shared/components/FormActions";
import { teamFields } from "../constants";
import { DASHBOARD_ROUTES } from "@/constants/routes.config";

interface TeamFormProps {
  teamId: string;
  mode?: "create" | "edit";
}

export default function TeamForm({ teamId, mode = "create" }: TeamFormProps) {
  const {
    formData,
    errors,
    lastSaved,
    handleFieldChange,
    resetForm,
    handleValidationError,
    setLastSaved,
  } = useEntityForm({
    entityId: teamId,
    setCurrentAction: setCurrentTeam,
    upsertAction: upsertTeam,
    selectItems: (s: RootState) => s.teams.items,
  });

  const { data: projects } = trpc.project.list.useQuery({});

  const publishMutation = trpc.team.publish.useMutation();
  const updateMutation = trpc.team.update.useMutation();
  const saveDraftMutation = trpc.team.saveDraft.useMutation();
  const deleteMutation = trpc.team.delete.useMutation();

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
    entityId: teamId,
    formData,
    validationSchema: teamSchema,
    publishMutation,
    updateMutation,
    saveDraftMutation,
    deleteMutation,
    upsertAction: upsertTeam,
    redirectPath: DASHBOARD_ROUTES.TEAMS,
    setLastSaved,
    onValidationError: handleValidationError,
  });

  const formFields = useMemo(() => {
    return teamFields.map((field: any) => {
      if (field.id === 'projectId') {
        return {
          ...field,
          options: (projects?.items || []).map((p: any) => ({
            value: p.id,
            label: p.name
          }))
        };
      }
      return field;
    });
  }, [projects]);

  const progress = useMemo(() => {
    const totalFields = formFields.length;
    const filledFields = formFields.filter((field: any) =>
      formData[field.id] !== undefined && formData[field.id] !== ''
    ).length;
    return totalFields > 0 ? (filledFields / totalFields) * 100 : 0;
  }, [formFields, formData]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {formFields.map((field: any) => (
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
