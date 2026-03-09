'use client';

import * as React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Lock, Globe, EyeOff, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TaskOptionsForm() {
  const { control, watch } = useFormContext();
  const isPublic = watch('isPublic');

  return (
    <div className="space-y-8">
      {/* Visibility Setting */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="h-4 w-4 text-zinc-500" />
          <span className="text-sm font-semibold text-zinc-900">Visibility Scope</span>
        </div>

        <Controller
          control={control}
          name="visibility"
          render={({ field }) => (
            <RadioGroup
              onValueChange={field.onChange}
              defaultValue={field.value}
              className="grid grid-cols-1 gap-3"
            >
              {/* Private Option */}
              <label className={cn(
                "flex items-start gap-3 p-3 rounded-lg border border-zinc-200 cursor-pointer transition-all hover:bg-zinc-50 hover:border-zinc-300",
                field.value === 'PRIVATE' && "bg-blue-50/50 border-blue-200 ring-1 ring-blue-200"
              )}>
                <RadioGroupItem value="PRIVATE" id="visibility-private" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <EyeOff className="h-4 w-4 text-zinc-500" />
                    <span className="font-medium text-sm text-zinc-900">Private</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Only visible to you and assigned members.
                  </p>
                </div>
              </label>

              {/* Workspace Option */}
              <label className={cn(
                "flex items-start gap-3 p-3 rounded-lg border border-zinc-200 cursor-pointer transition-all hover:bg-zinc-50 hover:border-zinc-300",
                field.value === 'WORKSPACE' && "bg-blue-50/50 border-blue-200 ring-1 ring-blue-200"
              )}>
                <RadioGroupItem value="WORKSPACE" id="visibility-workspace" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-zinc-500" />
                    <span className="font-medium text-sm text-zinc-900">Workspace & Team</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Visible to all members in this workspace/project.
                  </p>
                </div>
              </label>
            </RadioGroup>
          )}
        />
      </div>

      <div className="h-px bg-zinc-100" />

      {/* Public Status Setting */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-zinc-500" />
          <span className="text-sm font-semibold text-zinc-900">Public Access</span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 bg-zinc-50/30">
          <div className="space-y-0.5">
            <Label htmlFor="isPublic" className="text-sm font-medium text-zinc-900 cursor-pointer">
              Enable public link
            </Label>
            <p className="text-xs text-zinc-500">
              Anyone with the link can view this task.
            </p>
          </div>
          <Controller
            control={control}
            name="isPublic"
            render={({ field }) => (
              <Switch
                id="isPublic"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </div>

        {isPublic && (
          <div className="flex items-start gap-2 text-xs p-3 bg-blue-50 text-blue-700 rounded-md">
            <Globe className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>Public link will be generated upon creation.</p>
          </div>
        )}
      </div>
    </div>
  );
}
