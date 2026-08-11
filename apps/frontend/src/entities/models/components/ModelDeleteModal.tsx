'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AiModelView } from '@agentflox/types';
import { useModelMutations } from '../hooks/useModels';

export function ModelDeleteModal({
  model,
  open,
  onOpenChange,
  onDeleted,
}: {
  model: AiModelView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const { deleteCustom } = useModelMutations();

  const handleConfirm = async () => {
    if (!model) return;
    await deleteCustom.mutateAsync({ id: model.id });
    onDeleted?.();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleCancel(); }}>
      <DialogContent
        className="max-w-md p-0 overflow-hidden rounded-2xl border-0 shadow-2xl"
      >
        <div className="p-6 pb-5 space-y-5">
          {/* Icon + Title */}
          <DialogHeader className="gap-3">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 border border-red-100 shadow-sm">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <DialogTitle className="text-[15px] font-semibold text-zinc-900 leading-tight">
                  Delete custom model?
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-[13px] text-zinc-500 leading-relaxed">
                  This action is <span className="font-medium text-zinc-700">permanent</span> and cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Warning box */}
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[12.5px] text-amber-800 leading-relaxed">
              <span className="font-semibold">{model?.displayName ?? 'This model'}</span>
              {' '}and all its associated data will be permanently removed.
            </p>
          </div>

          {/* Footer */}
          <DialogFooter className="flex-row gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={deleteCustom.isPending}
              className="flex-1 h-9 rounded-lg border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 text-[13px] font-medium focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={deleteCustom.isPending}
              className={cn(
                'flex-1 h-9 rounded-lg text-[13px] font-medium gap-1.5 transition-all',
                'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-900/10',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              {deleteCustom.isPending ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete model
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
