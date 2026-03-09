import { useCallback } from "react";
import { z } from "zod";
import { useAppDispatch } from "@/hooks/useReduxStore";
import { serializeDates } from "@/stores/utils/serialize";
import { useToast } from '@/hooks/useToast';

const cleanDataForMutation = (data: any) => {
  const cleaned = { ...data };
  // Convert null values to undefined for optional fields
  if (cleaned.projectId === null) delete cleaned.projectId;
  if (cleaned.expiresAt === null) delete cleaned.expiresAt;
  if (cleaned.timezone === null) delete cleaned.timezone;
  if (cleaned.teamId === null) delete cleaned.teamId;
  if (cleaned.currency === null) delete cleaned.currency;
  if (cleaned.language === null) delete cleaned.language;
  if (cleaned.visibility === null) delete cleaned.visibility;
  return cleaned;
};

interface MutationActions {
  mutateAsync: (data: any) => Promise<any>;
  isPending: boolean;
}

interface UseEntityMutationsConfig {
  entityId: string;
  formData: any;
  validationSchema?: z.ZodSchema;
  publishMutation: MutationActions;
  updateMutation: MutationActions;
  saveDraftMutation: MutationActions;
  deleteMutation: MutationActions;
  upsertAction: (payload: { id: string; data: any }) => any;
  redirectPath: string;
  setLastSaved: (date: Date) => void;
  onValidationError: (error: z.ZodError) => void;
  dataMapper?: (formData: any) => any; // Optional custom data mapping
  buildSchemaData?: (formData: any) => any; // Optional custom data mapping
  skipValidation?: boolean; // For cases where validation is optional
}

export function useEntityMutations({
  entityId,
  formData,
  validationSchema,
  publishMutation,
  updateMutation,
  saveDraftMutation,
  deleteMutation,
  upsertAction,
  redirectPath,
  setLastSaved,
  onValidationError,
  dataMapper,
  buildSchemaData,
  skipValidation = false,
}: UseEntityMutationsConfig) {
  const dispatch = useAppDispatch();
  const { toast } = useToast(); // Initialize the toast hook

  const validateAndMap = useCallback((data: any) => {
    // First clean the data to remove null values
    const cleanedData = cleanDataForMutation(data);

    const mappedData = buildSchemaData ? buildSchemaData(cleanedData) : cleanedData;

    if (skipValidation || !validationSchema) {
      return dataMapper ? dataMapper(mappedData) : mappedData;
    }
    
    const validatedData = validationSchema.parse(mappedData);
    return dataMapper ? dataMapper(validatedData) : validatedData;
  }, [validationSchema, dataMapper, skipValidation]);

  const handlePublish = useCallback(async () => {
    if (!formData || Object.keys(formData).length <= 1) return false;

    try {
      const processedData = validateAndMap(formData);
      const res = await publishMutation.mutateAsync({
        id: entityId,
        ...processedData,
        status: "PUBLISHED"
      });

      dispatch(upsertAction({
        id: res.id,
        data: serializeDates({ ...res.data, cloudSyncedAt: new Date().toISOString() })
      }));

      setLastSaved(new Date());
      toast({ title: "Successfully Published", variant: "default" }); // Success toast
      return true;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        console.log("this is error", error);
        onValidationError(error);
        // Display toast for validation error
        toast({
          title: "Validation Error",
          description: "Please correct the highlighted fields.",
          variant: "destructive",
        });
      } else {
        // Display toast for general mutation error
        console.error('Publish error:', error);
        toast({
          title: "Publish Failed",
          description: error?.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
      return false;
    }
  }, [formData, validateAndMap, publishMutation, dispatch, entityId, upsertAction, setLastSaved, onValidationError, toast]);

  const handleUpdate = useCallback(async () => {
    try {
      const processedData = validateAndMap(formData);
      const res = await updateMutation.mutateAsync({
        id: entityId,
        ...processedData,
        status: "PUBLISHED"
      });

      dispatch(upsertAction({ id: res.id, data: serializeDates(res.data) }));
      setLastSaved(new Date());
      toast({ title: "Successfully Updated", variant: "default" }); // Success toast
      return true;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        onValidationError(error);
        // Display toast for validation error
        toast({
          title: "Validation Error",
          description: "Please correct the highlighted fields.",
          variant: "destructive",
        });
      } else {
        // Display toast for general mutation error
        console.error('Update error:', error);
        toast({
          title: "Update Failed",
          description: error?.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
      return false;
    }
  }, [formData, validateAndMap, updateMutation, dispatch, entityId, upsertAction, setLastSaved, onValidationError, toast]);

  const handleSaveDraft = useCallback(async () => {
    try {
      // Drafts typically don't run full validation, only data cleaning/mapping
      const cleanedData = cleanDataForMutation(formData);
      const processedData = dataMapper ? dataMapper(cleanedData) : cleanedData;
      const res = await saveDraftMutation.mutateAsync({
        id: entityId,
        ...processedData
      });

      dispatch(upsertAction({ id: res.id, data: serializeDates(res.data) }));
      setLastSaved(new Date());
      toast({ title: "Draft Saved", variant: "default" }); // Success toast
      return true;
    } catch (error: any) {
      // ZodError handling is removed as drafts typically don't validate against Zod
      // However, we handle general mutation errors.
      console.error('Save Draft error:', error);
      toast({
        title: "Draft Save Failed",
        description: error?.message || "An unexpected error occurred while saving the draft.",
        variant: "destructive",
      });
      return false;
    }
  }, [formData, saveDraftMutation, dispatch, entityId, upsertAction, setLastSaved, toast, dataMapper]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteMutation.mutateAsync({ id: entityId });
      toast({ title: "Successfully Deleted", variant: "default" }); // Success toast

      // Redirect after a short delay to allow toast to show
      setTimeout(() => {
        if (typeof window !== "undefined") {
          window.location.href = redirectPath;
        }
      }, 500); // 500ms delay for user to see the toast

    } catch (error) {
      console.error('Delete error:', error);
      // Display toast for general mutation error
      toast({
        title: "Delete Failed",
        description: "An unexpected error occurred during deletion.",
        variant: "destructive",
      });
    }
  }, [deleteMutation, entityId, redirectPath, toast]);

  return {
    handlePublish,
    handleUpdate,
    handleSaveDraft,
    handleDelete,
    isPublishing: publishMutation.isPending,
    isUpdating: updateMutation.isPending,
    isSavingDraft: saveDraftMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
