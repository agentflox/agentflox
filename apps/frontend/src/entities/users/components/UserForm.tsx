"use client";
import { useMemo, useCallback, useEffect } from "react";
import { FormField } from "@/components/ui/form";
import { trpc } from "@/lib/trpc";
import { userUpdateSchema } from "../validations/user.schema";
import { USER_FORM_FIELDS, fieldGroups } from "../constants";
import { useEntityForm } from "@/entities/shared/hooks/useEntityForm";
import { useAppDispatch, useAppSelector } from "@/hooks/useReduxStore";
import { upsertUser } from "@/stores/slices/user.slice";
import { serializeDates } from "@/stores/utils/serialize";
import { z } from "zod";

const userFields = Object.entries(USER_FORM_FIELDS).map(([id, config]) => ({
  id,
  ...config,
  type: id === 'bio' ? 'textarea' : 'text',
  required: false,
}));

export default function UserForm() {
  const dispatch = useAppDispatch();
  const utils = trpc.useUtils();
  const { data: me } = trpc.user.me.useQuery();
  const localUser = useAppSelector((state: any) => state.user.currentUser);
  
  const updateMutation = trpc.user.update.useMutation({
    onSuccess: (updatedUser) => {
      dispatch(upsertUser({ data: serializeDates(updatedUser) }));
      utils?.user?.me?.invalidate?.();
    }
  });

  const {
    formData,
    setFormData,
    errors,
    lastSaved,
    handleFieldChange,
    handleValidationError,
    setLastSaved,
  } = useEntityForm({
    entityId: me?.id || 'temp',
    setCurrentAction: () => ({ type: 'NOOP' }),
    upsertAction: (data) => dispatch(upsertUser({ data: serializeDates(data) })),
    selectItems: () => ({}),
  });

  // Sync form data with user data from Redux store
  useMemo(() => {
    const userData = localUser || me;
    if (userData) {
      const formUserData = {
        firstName: userData.firstName ?? "",
        lastName: userData.lastName ?? "",
        username: userData.username ?? "",
        avatar: userData.avatar ?? "",
        bio: userData.bio ?? "",
        phone: userData.phone ?? "",
        website: userData.website ?? "",
        location: userData.location ?? "",
        timezone: userData.timezone ?? "UTC",
      };
      setFormData(formUserData);
    }
  }, [localUser, me, setFormData]);

  const handleUpdate = useCallback(async () => {
    try {
      const validatedData = userUpdateSchema.parse(formData);
      await updateMutation.mutateAsync(validatedData);
      setLastSaved(new Date());
      return true;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        handleValidationError(error);
      }
      console.error('Update error:', error);
      return false;
    }
  }, [formData, updateMutation, setLastSaved, handleValidationError]);
  
  return (
    <div className="space-y-6">
      {fieldGroups.map((group, groupIndex) => (
        <div
          key={groupIndex}
          className={group.grid ? "grid grid-cols-1 gap-4 sm:grid-cols-2" : ""}
        >
          {group.fields.map((fieldId) => {
            const field = userFields.find((f) => f.id === fieldId);
            if (!field) return null;
            
            return (
              <FormField
                key={fieldId}
                field={field}
                value={formData[fieldId] || ""}
                onChange={(value) => handleFieldChange(fieldId, value)}
                error={errors[fieldId]}
              />
            );
          })}
        </div>
      ))}

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          onClick={handleUpdate}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? 'Saving...' : 'Save'}
        </button>
        {lastSaved && (
          <span className="text-xs text-muted-foreground ml-2">
            Saved {lastSaved.toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
}
