"use client";
import { useMemo } from "react";
import { FormField } from "@/components/ui/form";
import { setCurrentProposal, upsertProposal } from "@/stores/slices/proposal.slice";
import { RootState } from "@/stores/store";
import { trpc } from "@/lib/trpc";
import { getValidationSchema } from "../helpers";
import { useEntityForm } from "@/entities/shared/hooks/useEntityForm";
import { useEntityMutations } from "@/entities/shared/hooks/useEntityMutations";
import { useProposalFormFields } from "../hooks/useProposalFormFields";
import { mapFormDataToProposal } from "../utils/proposalDataMapper";
import { buildSchemaData } from "../utils/proposalValidator";
import { FormActions } from "@/entities/shared/components/FormActions";

interface ProposalFormProps {
  proposalId: string;
  mode?: "create" | "edit";
}

export default function ProposalForm({ proposalId, mode = "create" }: ProposalFormProps) {
  const {
    selectedType,
    formData,
    errors,
    lastSaved,
    handleFieldChange,
    resetForm,
    handleValidationError,
    setLastSaved,
  } = useEntityForm({
    entityId: proposalId,
    setCurrentAction: setCurrentProposal,
    upsertAction: upsertProposal,
    selectItems: (s: RootState) => s.proposals.items,
  });

  const { formFields, projectOptions } = useProposalFormFields(selectedType);

  const publishMutation = trpc.proposal.publish.useMutation();
  const updateMutation = trpc.proposal.update.useMutation();
  const saveDraftMutation = trpc.proposal.saveDraft.useMutation();
  const deleteMutation = trpc.proposal.delete.useMutation();

  const validationSchema = useMemo(() => 
    selectedType ? getValidationSchema(selectedType) : undefined,
    [selectedType]
  );

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
    entityId: proposalId,
    formData,
    validationSchema,
    publishMutation,
    updateMutation,
    saveDraftMutation,
    deleteMutation,
    upsertAction: upsertProposal,
    redirectPath: "/dashboard/proposals",
    setLastSaved,
    onValidationError: handleValidationError,
    buildSchemaData: (data) => buildSchemaData(data, selectedType!),
    dataMapper: (data) => mapFormDataToProposal(data, proposalId, selectedType!),
    skipValidation: !selectedType,
  });

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
        {formFields.map((field: any) => {
          const isProjectField = field.id === 'projectId';
          const isTeamField = field.id === 'teamId';
          const isEditing = mode === 'edit';
          const isPublished = String(formData?.status || '').toUpperCase() === 'PUBLISHED';
          let fieldWithOptions = isProjectField 
            ? { ...field, options: projectOptions } 
            : field;

          // Lock projectId in edit mode always
          if (isEditing && isProjectField && isPublished) {
            fieldWithOptions = { ...fieldWithOptions, disabled: true };
          }
          // Lock teamId when published
          if (isEditing && isPublished && isTeamField) {
            fieldWithOptions = { ...fieldWithOptions, disabled: true };
          }
          
          return (
            <FormField
              key={field.id}
              field={fieldWithOptions}
              value={formData[field.id]}
              onChange={(value) => handleFieldChange(field.id, value)}
              error={errors[field.id]}
            />
          );
        })}
        
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
