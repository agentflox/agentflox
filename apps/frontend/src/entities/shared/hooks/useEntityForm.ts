import { useState, useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/hooks/useReduxStore";
import { RootState } from "@/stores/store";
import { z } from "zod";
import { serializeDates } from "@/stores/utils/serialize";

interface UseEntityFormConfig<T> {
  entityId: string;
  setCurrentAction: (id: string) => any;
  upsertAction: (payload: { id: string; data: any }) => any;
  selectItems: (state: RootState) => Record<string, T>;
}

export function useEntityForm<T = any>({
  entityId,
  setCurrentAction,
  upsertAction,
  selectItems,
}: UseEntityFormConfig<T>) {
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectItems);
  const currentDraft = items[entityId] || {};
  const selectedType = (currentDraft as any).category ?? null;
  const [formData, setFormData] = useState<any>(currentDraft || {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    dispatch(setCurrentAction(entityId));
  }, [dispatch, entityId, setCurrentAction]);

  useEffect(() => {
    if (currentDraft && Object.keys(currentDraft).length > 0) {
      setFormData(currentDraft);
    }
  }, [currentDraft]);

  const handleFieldChange = useCallback((id: string, value: any) => {
    const updatedData = { ...formData, [id]: value };
    setFormData(updatedData);
    
    dispatch(upsertAction({ id: entityId, data: serializeDates(updatedData) }));

    if (errors[id]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
    }
  }, [formData, errors, dispatch, entityId, upsertAction]);

  const resetForm = useCallback(() => {
    const resetData = { id: entityId };
    setFormData(resetData);
    dispatch(upsertAction({ id: entityId, data: serializeDates(resetData) }));
    setErrors({});
  }, [dispatch, entityId, upsertAction]);

  const handleValidationError = useCallback((error: z.ZodError) => {
    const fieldErrors: Record<string, string> = {};
    error.issues.forEach((err) => {
      if (err.path.length > 0) {
        const fieldPath = err.path.join('.');
        // Map nested paths to flat field ids when possible
        const flatPath = fieldPath
          .replace(/^location\./, 'location.')
          .replace(/^timeline\./, 'timeline.')
          .replace(/^contact\./, 'contact.')
          .replace(/^budget\./, 'budget.');
        fieldErrors[flatPath] = err.message;
      }
    });
    setErrors(fieldErrors);
  }, []);

  return {
    selectedType,
    formData,
    setFormData,
    errors,
    setErrors,
    lastSaved,
    setLastSaved,
    currentDraft,
    handleFieldChange,
    resetForm,
    handleValidationError,
  };
}
